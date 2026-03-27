"use client"

/**
 * memoryInjector — NLKE retrieval → system prompt memory block.
 *
 * Called at connect time. Queries the KGStore for the top-k most
 * relevant nodes and formats them as a compact bullet list for injection
 * into the Aria system prompt via a ContextInjector.
 *
 * Returns null if the KG is empty (no nodes seeded yet) so the injector
 * can be safely skipped without affecting the prompt structure.
 */

import type { KGStore } from "./aria-core/state/kgStore"

const K = 3
const DEFAULT_QUERY = "personal assistant context preferences tools"

/**
 * Get a formatted memory block from the KG.
 * @param store  The KGStore instance (injected for testability)
 * @param query  Optional query override (defaults to a general context query)
 */
export async function getMemoryBlock(
  store: KGStore,
  query = DEFAULT_QUERY,
): Promise<string | null> {
  try {
    const results = await store.retrieve(query, K)
    if (results.length === 0) return null

    const lines = ["[Memory context]"]
    for (const r of results) {
      lines.push(`• ${r.description.slice(0, 100)}`)
    }
    return lines.join("\n")
  } catch (err) {
    console.warn("[aria/memory] Retrieval failed:", err)
    return null
  }
}
