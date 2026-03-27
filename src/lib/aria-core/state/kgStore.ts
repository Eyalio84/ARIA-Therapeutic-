/**
 * KGStore — knowledge graph store for Aria memory.
 *
 * Manages ingestion of MemoryChunks into a persistent KG and runs
 * NLKE hybrid retrieval (BM25 + hash embeddings + graph scoring) against them.
 *
 * Architecture:
 *   - KGAdapter defines the storage contract (host apps implement it)
 *   - SQLite FTS5 pre-filters to ~50 candidates before NLKE fusion runs
 *   - HybridFusion indexes only the pre-filtered set, not the full corpus
 *
 * This class never imports from @/ — it is host-app-independent.
 */

import type { KnowledgeNode, KnowledgeEdge, RetrievalResult } from "../types/knowledge"
import type { AriaPersonaJSON } from "../persona/cartridgeTypes"
import { HybridFusion } from "../knowledge/hybridFusion"
import { HashEmbedder } from "../knowledge/hashEmbedder"

// ── Row types ───────────────────────────────────────────────────────────────

/** A row as stored in the kg_nodes table */
export interface KGNodeRow {
  id:              string
  type:            string
  label:           string
  content:         string
  embedding:       string | null  // JSON-serialised float[]
  session_id:      string | null
  created_at:      number
  updated_at:      number
  // Phase 1 — master KG schema fields
  intent_keywords: string | null   // CSV e.g. "cost,cheap,budget,save"
  voice_text:      string | null   // TTS-friendly version of label
  kg_role:         string          // "master" | "session" | "client" — DEFAULT "session"
  source_project:  string | null   // e.g. "tal-boilerplate", "aria-cli"
}

/** A row as stored in the kg_edges table */
export interface KGEdgeRow {
  source: string
  target: string
  relation: string
  weight: number
}

// ── Adapter contract ────────────────────────────────────────────────────────

/**
 * KGAdapter — the storage interface host apps must implement.
 * aria-core defines it; aria-personal provides the SQLite WASM implementation.
 */
export interface KGAdapter {
  insertNode(node: KGNodeRow): Promise<void>
  insertEdge(edge: KGEdgeRow): Promise<void>
  /** Full-text search using FTS5 BM25, returns up to `limit` matching rows */
  searchFTS(query: string, limit: number): Promise<KGNodeRow[]>
  /** Get all edges where source = nodeId */
  getNeighbors(nodeId: string): Promise<Array<{ node: KGNodeRow; weight: number }>>
  allNodes(): Promise<KGNodeRow[]>
  deleteSessionNodes(sessionId: string): Promise<void>
}

// ── KGStore ─────────────────────────────────────────────────────────────────

export class KGStore {
  private _embedder = new HashEmbedder(256, [2, 4])

  constructor(private adapter: KGAdapter) {}

  /**
   * Ingest a MemoryChunk as a KG node.
   * Computes a hash embedding and persists to the adapter.
   */
  async ingestChunk(
    chunk: { nodeId: string; name: string; description: string; nodeType?: string },
    sessionId?: string,
  ): Promise<void> {
    const embedding = this._embedder.encodeText(`${chunk.name} ${chunk.description}`)
    const now = Date.now()

    await this.adapter.insertNode({
      id:              chunk.nodeId,
      type:            chunk.nodeType ?? "memory_chunk",
      label:           chunk.name,
      content:         chunk.description,
      embedding:       JSON.stringify(Array.from(embedding)),
      session_id:      sessionId ?? null,
      created_at:      now,
      updated_at:      now,
      intent_keywords: null,
      voice_text:      null,
      kg_role:         "session",
      source_project:  null,
    })
  }

  /**
   * Seed the KG from a persona cartridge's domain knowledge.
   * Facts become 'fact' nodes; FAQ pairs become 'faq' nodes.
   * Called once when a new cartridge is first loaded.
   */
  async seedFromCartridge(json: AriaPersonaJSON): Promise<void> {
    const { facts, faq } = json.domain

    for (let i = 0; i < facts.length; i++) {
      await this.ingestChunk({
        nodeId:      `cartridge::fact::${i}`,
        name:        `Domain fact ${i + 1}`,
        description: facts[i],
        nodeType:    "fact",
      })
    }

    for (let i = 0; i < (faq?.length ?? 0); i++) {
      const item = faq![i]
      await this.ingestChunk({
        nodeId:      `cartridge::faq::${i}`,
        name:        item.q,
        description: item.a,
        nodeType:    "faq",
      })
    }
  }

  /**
   * Run NLKE hybrid retrieval against the KG.
   *
   * Flow:
   *   1. FTS5 pre-filter → up to 50 candidates (BM25 at DB level)
   *   2. Load neighbor edges for each candidate
   *   3. Build in-memory KnowledgeSource from candidates
   *   4. HybridFusion.index(source) + query(text, k)
   *
   * Returns empty array if no nodes have been ingested yet.
   */
  async retrieve(query: string, k = 5): Promise<RetrievalResult[]> {
    const candidates = await this.adapter.searchFTS(query, 50)
    if (candidates.length === 0) return []

    // Build adjacency for graph scoring
    const edgeMap = new Map<string, KnowledgeEdge[]>()
    for (const c of candidates) {
      const neighbors = await this.adapter.getNeighbors(c.id)
      edgeMap.set(c.id, neighbors.map(({ node, weight }) => ({
        sourceId: c.id,
        targetId: node.id,
        edgeType: "relates_to",
        weight,
      })))
    }

    // Convert rows → KnowledgeNode[]
    const nodes: KnowledgeNode[] = candidates.map(rowToNode)

    // Index and query HybridFusion over the pre-filtered candidate set
    const fusion = new HybridFusion()
    fusion.index({
      getNodes: () => nodes,
      getEdgesForNode: (id) => edgeMap.get(id) ?? [],
    })

    return fusion.query(query, k)
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function rowToNode(row: KGNodeRow): KnowledgeNode {
  return {
    nodeId:         row.id,
    name:           row.label,
    description:    row.content,
    nodeType:       row.type,
    sourceDb:       "aria.memory.db",
    intentKeywords: row.intent_keywords ?? undefined,
  }
}
