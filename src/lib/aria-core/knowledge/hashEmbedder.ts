/**
 * HashEmbedder — TypeScript port of Python HashEmbedder class.
 *
 * Character n-gram hash embeddings. Zero external dependencies.
 * Replaces numpy with manual number[] operations.
 *
 * Adapted from NLKE/agents/shared/retrieval/embeddings.py (HashEmbedder class)
 *
 * Key change from Python: instead of hashlib.md5, we use a fast polynomial
 * hash over char codes — same statistical properties, browser-compatible,
 * ~10× faster for short n-grams.
 */

import type { KnowledgeNode } from "../types/knowledge"
import { charNgrams } from "./tokenizer"

/** Fast polynomial hash — mimics MD5 index distribution without crypto */
function polyHash(s: string): number {
  let h = 0x811c9dc5 // FNV-1a offset basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (Math.imul(h, 0x01000193) >>> 0) // FNV prime, keep 32-bit
  }
  return h
}

/** Compute cosine similarity between two float vectors */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 1e-8 ? dot / denom : 0
}

export class HashEmbedder {
  private _dim: number
  private _minN: number
  private _maxN: number
  private _embeddings = new Map<string, Float32Array>()

  constructor(dim = 256, ngramRange: [number, number] = [2, 4]) {
    this._dim = dim
    this._minN = ngramRange[0]
    this._maxN = ngramRange[1]
  }

  /** Encode text to a normalized embedding vector */
  encodeText(text: string): Float32Array {
    const vec = new Float32Array(this._dim)
    const lower = text.toLowerCase().trim()
    if (!lower) return vec

    for (const ngram of charNgrams(lower, this._minN, this._maxN)) {
      const h = polyHash(ngram)
      const idx = h % this._dim
      const sign = (h >> 17) & 1 ? 1.0 : -1.0
      vec[idx] += sign
    }

    // L2 normalize
    let norm = 0
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i]
    norm = Math.sqrt(norm)
    if (norm > 1e-8) {
      for (let i = 0; i < vec.length; i++) vec[i] /= norm
    }

    return vec
  }

  /** Index nodes — encode and cache embeddings */
  indexNodes(nodes: KnowledgeNode[]): number {
    this._embeddings.clear()
    let count = 0
    for (const node of nodes) {
      const text = `${node.name} ${node.description}`
      if (text.trim()) {
        this._embeddings.set(node.nodeId, this.encodeText(text))
        count++
      }
    }
    return count
  }

  /** Find k nearest neighbors by cosine similarity */
  findNearest(queryVec: Float32Array, k = 10): Array<[string, number]> {
    const sims: Array<[string, number]> = []
    for (const [id, vec] of this._embeddings) {
      sims.push([id, cosineSimilarity(queryVec, vec)])
    }
    sims.sort((a, b) => b[1] - a[1])
    return sims.slice(0, k)
  }

  /** Search by query text — encode then find nearest */
  search(query: string, k = 10): Array<[string, number]> {
    if (this._embeddings.size === 0) return []

    const queryVec = this.encodeText(query)
    const results = this.findNearest(queryVec, k)
    if (results.length === 0) return []

    // Normalize to [0, 1]
    const scores = results.map(([, s]) => s)
    const minS = Math.min(...scores)
    const maxS = Math.max(...scores)
    const range = maxS > minS ? maxS - minS : 1.0

    return results.map(([id, s]): [string, number] => [id, range > 0 ? (s - minS) / range : 0.5])
  }

  get nodeCount(): number { return this._embeddings.size }
}
