/**
 * IntentRouter — TypeScript port of Python intent_router.py.
 *
 * Classifies query intent with regex patterns + keyword analysis.
 * Expands queries with domain synonyms.
 *
 * Adapted from NLKE/agents/shared/retrieval/intent_router.py
 */

import { tokenizeAndFilter } from "./tokenizer"
import { QueryIntent, getWeights } from "./weightProfiles"
import type { WeightProfile } from "./weightProfiles"

// Query expansion synonyms (from hybrid_query.py TARGETED_EXPANSIONS)
const TARGETED_EXPANSIONS: Record<string, string[]> = {
  read:     ["view", "examine", "check", "contents", "file"],
  edit:     ["modify", "change", "update", "fix", "alter"],
  write:    ["create", "new", "generate"],
  find:     ["search", "locate", "discover", "glob", "grep"],
  run:      ["execute", "test", "bash", "shell", "command"],
  test:     ["verify", "validate", "check", "unittest"],
  fail:     ["error", "problem", "issue", "broken"],
  refactor: ["rename", "restructure", "reorganize"],
  debug:    ["troubleshoot", "investigate", "diagnose"],
  optimize: ["reduce", "improve", "cost", "efficient", "performance"],
  cache:    ["caching", "cached", "prompt_caching", "context_cache"],
  batch:    ["bulk", "parallel", "volume", "concurrent"],
  model:    ["haiku", "sonnet", "opus", "gemini", "claude"],
  agent:    ["workflow", "pipeline", "orchestrate", "routing"],
  knowledge:["graph", "kg", "nodes", "edges", "relationships"],
}

/**
 * Intent detection regex patterns — 12-category taxonomy.
 * ORDER MATTERS: more specific patterns must precede broader ones.
 * TROUBLESHOOTING, COST_OPTIMIZATION, LEARNING_PATH, COMPATIBILITY_CHECK
 * must come before CAPABILITY_CHECK and GOAL_ACHIEVEMENT to avoid false matches.
 */
const INTENT_PATTERNS: Array<[QueryIntent, RegExp[]]> = [
  [QueryIntent.TROUBLESHOOTING,      [/\bwhy (doesn't|isn't|won't|can't)\b/i, /\bnot working\b/i, /\berror\b/i, /\bbug\b/i]],
  [QueryIntent.WORKFLOW_COMPOSITION, [/\bbuild (me )?(a )?(pipeline|workflow)\b/i, /\bchain\b/i, /\bsequence\b/i]],
  [QueryIntent.COST_OPTIMIZATION,    [/\bcheap(est)?\b/i, /\bcost\b/i, /\bsave money\b/i, /\bbudget\b/i]],
  [QueryIntent.SIMILARITY_DISCOVERY, [/\bsimilar to\b/i, /\blike\b.*\bbut\b/i, /\balternative\b/i]],
  [QueryIntent.COMPATIBILITY_CHECK,  [/\bdoes .+ work with\b/i, /\bcompat(ible)?\b/i, /\bintegrate with\b/i]],
  [QueryIntent.LEARNING_PATH,        [/\bteach me\b/i, /\bhow do i learn\b/i, /\broadmap\b/i, /\bprerequisite\b/i]],
  [QueryIntent.IMPACT_ANALYSIS,      [/\bwhat (happens|breaks) if\b/i, /\bimpact\b/i, /\bconsequence\b/i]],
  [QueryIntent.PATTERN_DISCOVERY,    [/\bwhat patterns\b/i, /\bwhat (are|exist|do you have)\b.*\bpattern\b/i]],
  [QueryIntent.VALIDATION,           [/\bis (this|it) (correct|safe|right|valid)\b/i, /\bvalidate\b/i, /\bcheck if\b/i]],
  [QueryIntent.SYSTEM_HEALTH,        [/\bkg health\b/i, /\borphan\b/i, /\bsystem status\b/i]],
  // Broader patterns last — they subsume many specific phrasings above if placed earlier
  [QueryIntent.CAPABILITY_CHECK,     [/\bcan (it|you|aria)\b/i, /\bdoes (it|this)\b/i, /\bis (it|this) able\b/i]],
  [QueryIntent.GOAL_ACHIEVEMENT,     [/\bi want to\b/i, /\bhow (do|can) i\b/i, /\bhelp me\b/i]],
]

// Domain classification keywords
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  cost_reduction: ["cost", "cheap", "save", "budget", "price", "reduce", "efficient"],
  speed:          ["fast", "quick", "performance", "latency", "slow", "speed"],
  scale:          ["large", "big", "scale", "volume", "massive", "many", "batch", "bulk"],
  safety:         ["safe", "secure", "protect", "guard", "permission", "sandbox"],
  automation:     ["automate", "workflow", "pipeline", "schedule", "trigger", "agent"],
}

export class IntentRouter {
  /** Classify query intent using regex + keyword analysis */
  detectIntent(query: string): QueryIntent {
    const lower = query.toLowerCase().trim()

    // Phase 1: regex pattern matching
    for (const [intent, patterns] of INTENT_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) return intent
      }
    }

    // Phase 2: keyword-based fallbacks
    const tokens = new Set(tokenizeAndFilter(query))

    if (tokens.has("error") || tokens.has("bug") || tokens.has("fail") || tokens.has("broken")) {
      return QueryIntent.TROUBLESHOOTING
    }
    if (tokens.has("cost") || tokens.has("cheap") || tokens.has("budget") || tokens.has("save")) {
      return QueryIntent.COST_OPTIMIZATION
    }
    if (tokens.has("validate") || tokens.has("valid") || tokens.has("correct")) {
      return QueryIntent.VALIDATION
    }
    if (tokens.has("workflow") || tokens.has("pipeline") || tokens.has("chain")) {
      return QueryIntent.WORKFLOW_COMPOSITION
    }
    if (tokens.has("similar") || tokens.has("alternative")) {
      return QueryIntent.SIMILARITY_DISCOVERY
    }
    if (tokens.has("orphan") || tokens.has("health") || tokens.has("status")) {
      return QueryIntent.SYSTEM_HEALTH
    }
    if (tokens.has("impact") || tokens.has("consequence") || tokens.has("affect")) {
      return QueryIntent.IMPACT_ANALYSIS
    }
    if (tokens.has("pattern") || tokens.has("patterns")) {
      return QueryIntent.PATTERN_DISCOVERY
    }
    if (tokens.has("compatible") || tokens.has("integrate")) {
      return QueryIntent.COMPATIBILITY_CHECK
    }
    if (tokens.has("learn") || tokens.has("teach") || tokens.has("roadmap") || tokens.has("prerequisite")) {
      return QueryIntent.LEARNING_PATH
    }
    if (tokens.has("can") || tokens.has("does") || tokens.has("able")) {
      return QueryIntent.CAPABILITY_CHECK
    }

    return QueryIntent.GOAL_ACHIEVEMENT
  }

  /** Expand query with synonyms */
  expandQuery(query: string): string {
    const lower = query.toLowerCase()
    const expansions = [query]
    for (const [trigger, terms] of Object.entries(TARGETED_EXPANSIONS)) {
      if (lower.includes(trigger)) expansions.push(...terms)
    }
    return expansions.join(" ")
  }

  /** Classify query into domain categories */
  classifyDomain(query: string): string[] {
    const tokens = new Set(tokenizeAndFilter(query))
    const domains: string[] = []
    for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
      if (kws.some((kw) => tokens.has(kw))) domains.push(domain)
    }
    return domains.length > 0 ? domains : ["general"]
  }

  /** Full routing: detect intent and get weight profile */
  route(query: string, embeddingQuality?: string): [QueryIntent, WeightProfile] {
    const intent = this.detectIntent(query)
    const weights = getWeights(intent, embeddingQuality)
    return [intent, weights]
  }
}
