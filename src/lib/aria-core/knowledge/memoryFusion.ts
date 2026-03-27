/**
 * MemoryFusion — TypeScript port of Python memory_fusion.py.
 *
 * 2-path hybrid fusion for markdown memory chunks.
 *   score = alpha × V(q,chunk) + beta × B(q,chunk)
 *
 * No graph path (memory has no edges).
 * Operates on pre-parsed MemoryChunk arrays (no file I/O).
 *
 * Adapted from NLKE/agents/shared/retrieval/memory_fusion.py
 */

import type { MemoryChunk, KnowledgeNode } from "../types/knowledge"
import { BM25Index } from "./bm25"
import { HashEmbedder } from "./hashEmbedder"
import { QueryCache } from "./queryCache"
import type { defaultRetrievalConfig } from "./config"

/** Memory weights by embedding quality (2-path, no gamma) */
const MEMORY_WEIGHTS: Record<string, [number, number]> = {
  hash:      [0.35, 0.65],  // BM25 dominates
  semantic:  [0.50, 0.50],  // Equal blend
  untrained: [0.30, 0.70],  // Almost all BM25
}

export interface MemoryResult {
  chunk: MemoryChunk
  bm25Score: number
  vectorScore: number
  finalScore: number
}

/** Adapt MemoryChunk to KnowledgeNode for indexing */
function chunkToNode(chunk: MemoryChunk): KnowledgeNode {
  return {
    nodeId: chunk.nodeId,
    name: chunk.name,
    description: chunk.description,
    nodeType: chunk.nodeType,
    intentKeywords: chunk.intentKeywords,
  }
}

export class MemoryFusion {
  private _bm25 = new BM25Index()
  private _embedder = new HashEmbedder()
  private _cache = new QueryCache<MemoryResult[]>(200, 300_000)
  private _chunks: MemoryChunk[] = []
  private _chunkMap = new Map<string, MemoryChunk>()
  private _indexed = false

  /** Index a set of memory chunks */
  index(chunks: MemoryChunk[]): { chunksIndexed: number; bm25Indexed: number; embeddingIndexed: number } {
    this._chunks = chunks
    this._chunkMap.clear()
    for (const c of chunks) this._chunkMap.set(c.nodeId, c)

    const nodes = chunks.map(chunkToNode)
    const bm25Count = this._bm25.indexNodes(nodes)
    const embCount = this._embedder.indexNodes(nodes)

    this._indexed = true
    this._cache.clear()

    return {
      chunksIndexed: chunks.length,
      bm25Indexed: bm25Count,
      embeddingIndexed: embCount,
    }
  }

  /** Execute 2-path fusion query */
  query(text: string, k = 10): MemoryResult[] {
    if (!this._indexed) return []

    const cached = this._cache.get(text, { k })
    if (cached) return cached

    const [alpha, beta] = MEMORY_WEIGHTS["hash"]

    const bm25Results = this._bm25.search(text, Math.min(k * 3, 100))
    const bm25Scores = new Map(bm25Results)

    const embResults = this._embedder.search(text, Math.min(k * 3, 100))
    const embScores = new Map(embResults)

    const allCandidates = new Set([...bm25Scores.keys(), ...embScores.keys()])
    if (allCandidates.size === 0) {
      this._cache.put(text, [], { k })
      return []
    }

    const scored: Array<[string, number, number, number]> = []
    for (const nid of allCandidates) {
      const b = bm25Scores.get(nid) ?? 0
      const v = embScores.get(nid) ?? 0
      scored.push([nid, b, v, alpha * v + beta * b])
    }
    scored.sort((a, b) => b[3] - a[3])

    const results: MemoryResult[] = []
    for (const [nid, bScore, vScore, final] of scored.slice(0, k)) {
      const chunk = this._chunkMap.get(nid)
      if (!chunk) continue
      results.push({
        chunk,
        bm25Score: Math.round(bScore * 10000) / 10000,
        vectorScore: Math.round(vScore * 10000) / 10000,
        finalScore: Math.round(final * 10000) / 10000,
      })
    }

    this._cache.put(text, results, { k })
    return results
  }

  get chunkCount(): number { return this._chunks.length }
  get isIndexed(): boolean { return this._indexed }
  get cacheMetrics() { return this._cache.metrics }
}
