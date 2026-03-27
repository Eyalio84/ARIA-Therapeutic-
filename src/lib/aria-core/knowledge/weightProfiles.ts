/**
 * Weight profiles — TypeScript port of Python weight_profiles.py.
 *
 * Adaptive fusion weights per query intent and embedding quality.
 * Maps QueryIntent → (alpha, beta, gamma) weight profiles.
 *
 * Adapted from NLKE/agents/shared/retrieval/weight_profiles.py
 */

/** Query intent types — 12-category taxonomy from Opus ARIA-RETRIEVAL-CATEGORIES spec */
export enum QueryIntent {
  GOAL_ACHIEVEMENT     = "goal_achievement",
  CAPABILITY_CHECK     = "capability_check",
  TROUBLESHOOTING      = "troubleshooting",
  WORKFLOW_COMPOSITION = "workflow_composition",
  COST_OPTIMIZATION    = "cost_optimization",
  SIMILARITY_DISCOVERY = "similarity_discovery",
  COMPATIBILITY_CHECK  = "compatibility_check",
  LEARNING_PATH        = "learning_path",
  IMPACT_ANALYSIS      = "impact_analysis",
  PATTERN_DISCOVERY    = "pattern_discovery",
  VALIDATION           = "validation",
  SYSTEM_HEALTH        = "system_health",
}

/** Fusion weights for a specific intent type */
export interface WeightProfile {
  alpha: number  // Vector/embedding weight
  beta:  number  // BM25 keyword weight
  gamma: number  // Graph proximity weight
}

/**
 * Intent → weight mapping (α + β + γ = 1.0).
 * Weights calibrated per Opus ARIA-RETRIEVAL-ALGORITHMS spec:
 * alpha=0.40, beta=0.45, gamma=0.15 baseline; per-category deviations documented below.
 */
export const INTENT_WEIGHTS: Record<QueryIntent, WeightProfile> = {
  [QueryIntent.GOAL_ACHIEVEMENT]:     { alpha: 0.45, beta: 0.40, gamma: 0.15 }, // semantic + keyword balanced
  [QueryIntent.CAPABILITY_CHECK]:     { alpha: 0.30, beta: 0.60, gamma: 0.10 }, // precise keyword retrieval
  [QueryIntent.TROUBLESHOOTING]:      { alpha: 0.25, beta: 0.55, gamma: 0.20 }, // error terms + workaround graph
  [QueryIntent.WORKFLOW_COMPOSITION]: { alpha: 0.40, beta: 0.30, gamma: 0.30 }, // graph-heavy (feeds_into chain)
  [QueryIntent.COST_OPTIMIZATION]:    { alpha: 0.20, beta: 0.70, gamma: 0.10 }, // keyword "cost/cheap/budget" dominant
  [QueryIntent.SIMILARITY_DISCOVERY]: { alpha: 0.65, beta: 0.20, gamma: 0.15 }, // embedding-heavy (cosine/Jaccard)
  [QueryIntent.COMPATIBILITY_CHECK]:  { alpha: 0.25, beta: 0.50, gamma: 0.25 }, // BM25 both terms + graph edges
  [QueryIntent.LEARNING_PATH]:        { alpha: 0.40, beta: 0.30, gamma: 0.30 }, // prerequisite graph traversal
  [QueryIntent.IMPACT_ANALYSIS]:      { alpha: 0.20, beta: 0.35, gamma: 0.45 }, // graph-heavy (BFS forward + reverse)
  [QueryIntent.PATTERN_DISCOVERY]:    { alpha: 0.55, beta: 0.25, gamma: 0.20 }, // embedding-heavy (implements edges)
  [QueryIntent.VALIDATION]:           { alpha: 0.25, beta: 0.65, gamma: 0.10 }, // BM25 for exact safety/correctness terms
  [QueryIntent.SYSTEM_HEALTH]:        { alpha: 0.20, beta: 0.70, gamma: 0.10 }, // keyword dominant (SQL orphan checks)
}

/** Embedding quality → weight overrides (lower quality → more BM25) */
const QUALITY_OVERRIDES: Record<string, { alpha: number; beta: number }> = {
  semantic:  { alpha: 0.40, beta: 0.45 },
  hash:      { alpha: 0.20, beta: 0.65 },
  untrained: { alpha: 0.30, beta: 0.55 },
}

/**
 * Get fusion weights for given intent and embedding quality.
 * Quality override adjusts alpha/beta ratio; intent determines gamma.
 */
export function getWeights(
  intent: QueryIntent = QueryIntent.GOAL_ACHIEVEMENT,
  embeddingQuality?: string,
): WeightProfile {
  if (embeddingQuality && embeddingQuality in QUALITY_OVERRIDES) {
    const base = QUALITY_OVERRIDES[embeddingQuality]
    const intentProfile = INTENT_WEIGHTS[intent] ?? INTENT_WEIGHTS[QueryIntent.GOAL_ACHIEVEMENT]
    return { alpha: base.alpha, beta: base.beta, gamma: intentProfile.gamma }
  }
  return INTENT_WEIGHTS[intent] ?? INTENT_WEIGHTS[QueryIntent.GOAL_ACHIEVEMENT]
}
