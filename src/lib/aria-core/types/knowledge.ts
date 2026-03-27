/**
 * Knowledge system contracts — NLKE TypeScript port types.
 */

/** A single node in the knowledge graph */
export interface KnowledgeNode {
  nodeId: string
  name: string
  description: string
  nodeType?: string
  intentKeywords?: string
  category?: string
  domain?: string
  sourceDb?: string
}

/** An edge between two knowledge nodes */
export interface KnowledgeEdge {
  sourceId: string
  targetId: string
  edgeType: string
  weight: number
}

/** A single retrieval result with score breakdown */
export interface RetrievalResult {
  nodeId: string
  name: string
  description: string
  nodeType: string
  sourceDb: string
  vectorScore: number
  bm25Score: number
  graphScore: number
  finalScore: number
  intentKeywords?: string
  category?: string
  domain?: string
}

/** Configuration for the retrieval engine */
export interface RetrievalConfig {
  /** Vector/embedding weight (default 0.40) */
  alpha: number
  /** BM25 keyword weight (default 0.45) */
  beta: number
  /** Graph proximity weight (default 0.15) */
  gamma: number
  /** BM25 k1 parameter (default 1.5) */
  bm25K1: number
  /** BM25 b parameter (default 0.75) */
  bm25B: number
  /** Hash embedding dimensionality (default 256) */
  embeddingDim: number
  /** Character n-gram range (default [2, 4]) */
  ngramRange: [number, number]
  /** Intent keyword boost factor (default 5.0) */
  intentBoostFactor: number
  /** Cache max entries (default 500) */
  cacheMaxSize: number
  /** Cache TTL in ms (default 600_000) */
  cacheTtlMs: number
}

/** A parsed memory chunk from markdown content */
export interface MemoryChunk {
  nodeId: string
  name: string
  description: string
  nodeType: string
  intentKeywords: string
  sourceFile: string
  directory: string
  headingLevel: number
  lineNumber: number
}

/** Source of knowledge data — host apps implement this */
export interface KnowledgeSource {
  getNodes(): KnowledgeNode[]
  getEdgesForNode?(nodeId: string): KnowledgeEdge[]
}
