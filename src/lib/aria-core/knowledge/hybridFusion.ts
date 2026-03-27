/**
 * HybridFusion — TypeScript port of Python hybrid_fusion.py.
 *
 * 3-path fusion: H(q,n) = alpha × V(q,n) + beta × B(q,n) + gamma × G(q,n)
 *
 * Works with any KnowledgeSource (no SQLite dependency).
 * Intent-aware weight selection via IntentRouter.
 *
 * Adapted from NLKE/agents/shared/retrieval/hybrid_fusion.py
 */

import type { KnowledgeNode, KnowledgeSource, RetrievalResult } from "../types/knowledge"
import { BM25Index } from "./bm25"
import { HashEmbedder } from "./hashEmbedder"
import { GraphScorer } from "./graphScorer"
import { IntentRouter } from "./intentRouter"
import { QueryCache } from "./queryCache"
import { defaultRetrievalConfig } from "./config"
import type { QueryIntent } from "./weightProfiles"

/**
 * Compute the 5× BM25 intent keyword boost factor for a node.
 *
 * Returns 5.0 if any query token matches a node's intent keywords CSV;
 * returns 1.0 (no boost) otherwise. Used by BM25Index internally and
 * exposed here for testability and direct scoring pipelines.
 *
 * @param intentKeywords - CSV string e.g. "cost,cheap,budget,save" (or null)
 * @param tokens - Set of lower-cased query tokens
 */
export function intentBoost(intentKeywords: string | null | undefined, tokens: Set<string>): number {
  if (!intentKeywords) return 1.0
  const kwSet = new Set(intentKeywords.split(",").map((s) => s.trim().toLowerCase()))
  return [...tokens].some((t) => kwSet.has(t)) ? 5.0 : 1.0
}

export interface FusionStats {
  nodesIndexed: number
  bm25Indexed: number
  embeddingIndexed: number
  graphEdges: number
  indexTimeMs: number
}

export class HybridFusion {
  private _config = defaultRetrievalConfig()
  private _bm25 = new BM25Index(this._config.bm25K1, this._config.bm25B, this._config.intentBoostFactor)
  private _embedder = new HashEmbedder(this._config.embeddingDim, this._config.ngramRange)
  private _graph = new GraphScorer()
  private _router = new IntentRouter()
  private _cache = new QueryCache<RetrievalResult[]>(this._config.cacheMaxSize, this._config.cacheTtlMs)

  private _nodes: KnowledgeNode[] = []
  private _nodeMap = new Map<string, KnowledgeNode>()
  private _indexed = false

  /** Index a knowledge source. Call once before querying. */
  index(source: KnowledgeSource): FusionStats {
    const t0 = Date.now()

    this._nodes = source.getNodes()
    this._nodeMap.clear()
    for (const n of this._nodes) this._nodeMap.set(n.nodeId, n)

    const bm25Count = this._bm25.indexNodes(this._nodes)
    const embCount = this._embedder.indexNodes(this._nodes)
    const edgeCount = this._graph.buildIndex(source)

    this._indexed = true
    this._cache.clear()

    return {
      nodesIndexed: this._nodes.length,
      bm25Indexed: bm25Count,
      embeddingIndexed: embCount,
      graphEdges: edgeCount,
      indexTimeMs: Date.now() - t0,
    }
  }

  /** Execute 3-path hybrid fusion query */
  query(text: string, k = 10, intentOverride?: QueryIntent): RetrievalResult[] {
    if (!this._indexed) return []

    const cached = this._cache.get(text, { k })
    if (cached) return cached

    // Detect intent and get weights
    const [, weights] = intentOverride
      ? [intentOverride, { alpha: this._config.alpha, beta: this._config.beta, gamma: this._config.gamma }]
      : this._router.route(text, "hash")
    const { alpha, beta, gamma } = weights

    // Expand query
    const expanded = this._router.expandQuery(text)

    // BM25 scoring
    const bm25Results = this._bm25.search(expanded, Math.min(k * 5, 200))
    const bm25Scores = new Map(bm25Results)

    // Embedding scoring
    const embResults = this._embedder.search(text, Math.min(k * 5, 200))
    const embScores = new Map(embResults)

    // Collect candidates
    const allCandidates = new Set([...bm25Scores.keys(), ...embScores.keys()])
    if (allCandidates.size === 0) {
      this._cache.put(text, [], { k })
      return []
    }

    // Combined scores (alpha×V + beta×B)
    const combined: Array<[string, number]> = []
    for (const nid of allCandidates) {
      const v = embScores.get(nid) ?? 0
      const b = bm25Scores.get(nid) ?? 0
      combined.push([nid, alpha * v + beta * b])
    }
    combined.sort((a, b) => b[1] - a[1])

    // Graph neighbor boosting
    const candidateIds = combined.map(([id]) => id)
    const graphScores = this._graph.scoreResults(candidateIds, gamma)

    // Final scoring
    const results: RetrievalResult[] = []
    for (const [nid, abScore] of combined) {
      const gScore = graphScores.get(nid) ?? 0
      const final = abScore + gScore
      const node = this._nodeMap.get(nid)
      if (!node) continue

      results.push({
        nodeId: nid,
        name: node.name,
        description: node.description.slice(0, 300),
        nodeType: node.nodeType ?? "node",
        sourceDb: node.sourceDb ?? "default",
        vectorScore: Math.round((embScores.get(nid) ?? 0) * 10000) / 10000,
        bm25Score:   Math.round((bm25Scores.get(nid) ?? 0) * 10000) / 10000,
        graphScore:  Math.round(gScore * 10000) / 10000,
        finalScore:  Math.round(final * 10000) / 10000,
        intentKeywords: node.intentKeywords,
        category: node.category,
        domain: node.domain,
      })
    }

    results.sort((a, b) => b.finalScore - a.finalScore)
    const top = results.slice(0, k)
    this._cache.put(text, top, { k })
    return top
  }

  get nodeCount(): number { return this._nodes.length }
  get isIndexed(): boolean { return this._indexed }
  get cacheMetrics() { return this._cache.metrics }
}
