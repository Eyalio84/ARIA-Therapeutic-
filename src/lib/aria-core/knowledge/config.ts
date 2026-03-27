/**
 * NLKE retrieval configuration — TypeScript port of Python config.py.
 *
 * Adapted from:
 *   NLKE/agents/shared/retrieval/config.py (RetrievalConfig dataclass)
 */

import type { RetrievalConfig } from "../types/knowledge"

/** Default retrieval configuration */
export function defaultRetrievalConfig(): RetrievalConfig {
  return {
    alpha: 0.40,
    beta: 0.45,
    gamma: 0.15,
    bm25K1: 1.5,
    bm25B: 0.75,
    embeddingDim: 256,
    ngramRange: [2, 4],
    intentBoostFactor: 5.0,
    cacheMaxSize: 500,
    cacheTtlMs: 600_000,
  }
}

/** Edge type weights for graph scoring */
export const EDGE_WEIGHTS: Record<string, number> = {
  implements:  0.9,
  relates_to:  0.7,
  depends_on:  0.8,
  part_of:     0.85,
  uses:        0.75,
  extends:     0.9,
  documents:   0.6,
  example_of:  0.7,
  similar_to:  0.65,
}
