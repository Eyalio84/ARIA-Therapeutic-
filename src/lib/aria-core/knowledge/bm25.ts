/**
 * BM25 Index — TypeScript port of Python bm25.py.
 *
 * Features:
 *   - Inverted index with TF tracking per node
 *   - IDF with log-smoothing
 *   - Intent keyword 5× boosting (the "killer feature")
 *   - Score normalization to [0, 1]
 *
 * Adapted from NLKE/agents/shared/retrieval/bm25.py
 * Python defaultdict → Map with get-or-default pattern
 */

import type { KnowledgeNode } from "../types/knowledge"
import { tokenizeAndFilter } from "./tokenizer"

export class BM25Index {
  private _k1: number
  private _b: number
  private _boostFactor: number

  // Inverted index: term → [(nodeId, tf)]
  private _invertedIndex = new Map<string, Array<[string, number]>>()
  // Document frequency: term → count
  private _docFreq = new Map<string, number>()
  // Document lengths: nodeId → token count
  private _docLengths = new Map<string, number>()
  // Node tokens: nodeId → token list
  private _nodeTokens = new Map<string, string[]>()
  // Intent keywords: nodeId → Set<token>
  private _intentKeywords = new Map<string, Set<string>>()

  private _totalDocs = 0
  private _avgDl = 0
  private _indexed = false

  constructor(k1 = 1.5, b = 0.75, boostFactor = 5.0) {
    this._k1 = k1
    this._b = b
    this._boostFactor = boostFactor
  }

  /** Build inverted index from knowledge nodes. Returns count indexed. */
  indexNodes(nodes: KnowledgeNode[]): number {
    this._invertedIndex.clear()
    this._docFreq.clear()
    this._docLengths.clear()
    this._nodeTokens.clear()
    this._intentKeywords.clear()

    for (const node of nodes) {
      const text = `${node.name} ${node.description}`
      const tokens = tokenizeAndFilter(text, 2)
      if (tokens.length === 0) continue

      const id = node.nodeId
      this._nodeTokens.set(id, tokens)
      this._docLengths.set(id, tokens.length)

      // Store intent keywords for boosting
      if (node.intentKeywords) {
        this._intentKeywords.set(id, new Set(tokenizeAndFilter(node.intentKeywords, 2)))
      }

      // Build TF per term
      const termFreq = new Map<string, number>()
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) ?? 0) + 1)
      }

      // Update inverted index and doc freq
      for (const [term, tf] of termFreq) {
        const existing = this._invertedIndex.get(term) ?? []
        existing.push([id, tf])
        this._invertedIndex.set(term, existing)
        this._docFreq.set(term, (this._docFreq.get(term) ?? 0) + 1)
      }
    }

    this._totalDocs = this._docLengths.size
    const totalLength = Array.from(this._docLengths.values()).reduce((s, l) => s + l, 0)
    this._avgDl = this._totalDocs > 0 ? totalLength / this._totalDocs : 1.0
    this._indexed = true
    return this._totalDocs
  }

  /** Calculate BM25 score for a single node against query tokens */
  score(queryTokens: string[], nodeId: string): number {
    if (!this._docLengths.has(nodeId)) return 0

    let total = 0
    const dl = this._docLengths.get(nodeId)!
    const intentKws = this._intentKeywords.get(nodeId)

    for (const term of queryTokens) {
      const postings = this._invertedIndex.get(term)
      if (!postings) continue

      // Find TF for this node
      let tf = 0
      for (const [nid, freq] of postings) {
        if (nid === nodeId) { tf = freq; break }
      }
      if (tf === 0) continue

      // IDF: log((N - df + 0.5) / (df + 0.5) + 1)
      const df = this._docFreq.get(term) ?? 1
      const idf = Math.log((this._totalDocs - df + 0.5) / (df + 0.5) + 1)

      // BM25 TF normalization
      const tfNorm = (tf * (this._k1 + 1)) / (tf + this._k1 * (1 - this._b + this._b * dl / this._avgDl))

      // 5× intent keyword boost
      const boost = intentKws?.has(term) ? this._boostFactor : 1.0

      total += idf * tfNorm * boost
    }

    return total
  }

  /** Search and return top-k (nodeId, normalizedScore) pairs */
  search(query: string, k = 10): Array<[string, number]> {
    if (!this._indexed || this._totalDocs === 0) return []

    const tokens = tokenizeAndFilter(query, 2)
    if (tokens.length === 0) return []

    const scores: Array<[string, number]> = []
    for (const nodeId of this._docLengths.keys()) {
      const s = this.score(tokens, nodeId)
      if (s > 0) scores.push([nodeId, s])
    }

    if (scores.length === 0) return []

    // Normalize to [0, 1]
    const maxScore = Math.max(...scores.map(([, s]) => s))
    const normalized = maxScore > 0
      ? scores.map(([id, s]): [string, number] => [id, s / maxScore])
      : scores

    normalized.sort((a, b) => b[1] - a[1])
    return normalized.slice(0, k)
  }

  get vocabularySize(): number { return this._invertedIndex.size }
  get isIndexed(): boolean { return this._indexed }
  get docCount(): number { return this._totalDocs }
}
