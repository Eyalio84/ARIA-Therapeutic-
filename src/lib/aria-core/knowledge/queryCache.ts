/**
 * QueryCache — TypeScript port of Python query_cache.py.
 *
 * LRU + TTL cache for retrieval results.
 * Map-based (insertion-ordered) replaces Python's OrderedDict.
 *
 * Adapted from NLKE/agents/shared/retrieval/query_cache.py
 */

export interface CacheMetrics {
  hits: number
  misses: number
  evictions: number
  expirations: number
  hitRate: number
  totalQueries: number
}

function makeKey(query: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
  return `${query}|${JSON.stringify(sorted)}`
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  accessCount: number
}

export class QueryCache<T = unknown> {
  private _cache = new Map<string, CacheEntry<T>>()
  private _maxSize: number
  private _ttlMs: number
  private _hits = 0
  private _misses = 0
  private _evictions = 0
  private _expirations = 0

  constructor(maxSize = 500, ttlMs = 600_000) {
    this._maxSize = maxSize
    this._ttlMs = ttlMs
  }

  get(query: string, params: Record<string, unknown> = {}): T | null {
    const key = makeKey(query, params)
    const entry = this._cache.get(key)

    if (!entry) {
      this._misses++
      return null
    }

    // TTL check
    if (Date.now() - entry.timestamp > this._ttlMs) {
      this._cache.delete(key)
      this._expirations++
      this._misses++
      return null
    }

    // LRU: move to end by delete+re-set
    this._cache.delete(key)
    entry.accessCount++
    this._cache.set(key, entry)
    this._hits++
    return entry.value
  }

  put(query: string, value: T, params: Record<string, unknown> = {}): void {
    const key = makeKey(query, params)

    // Update existing
    if (this._cache.has(key)) {
      this._cache.delete(key)
      this._cache.set(key, { value, timestamp: Date.now(), accessCount: 0 })
      return
    }

    // Evict LRU (first inserted) if at capacity
    while (this._cache.size >= this._maxSize) {
      const firstKey = this._cache.keys().next().value
      if (firstKey) { this._cache.delete(firstKey); this._evictions++ }
    }

    this._cache.set(key, { value, timestamp: Date.now(), accessCount: 0 })
  }

  invalidate(query: string, params: Record<string, unknown> = {}): boolean {
    return this._cache.delete(makeKey(query, params))
  }

  clear(): number {
    const count = this._cache.size
    this._cache.clear()
    return count
  }

  get metrics(): CacheMetrics {
    const total = this._hits + this._misses
    return {
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      expirations: this._expirations,
      hitRate: total > 0 ? this._hits / total : 0,
      totalQueries: total,
    }
  }

  get size(): number { return this._cache.size }
}
