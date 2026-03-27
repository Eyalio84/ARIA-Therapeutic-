"use client"

/**
 * Provider-agnostic ghost suggestion store.
 *
 * Extracted from store/ariaSuggestion.ts — no StoreKit-specific fields.
 * Ghost suggestion lifecycle: setSuggestion → accept/reject → resolved.
 *
 * StoreKit's ariaSuggestion.ts re-exports from here + adds canvas integration.
 */

import { create } from "zustand"

export interface GhostSection {
  componentSlug: string
  props: Record<string, unknown>
}

interface SuggestionStore {
  suggestion: string | null
  ghostSection: GhostSection | null
  resolved: boolean

  setSuggestion: (suggestion: string, ghost: GhostSection) => void
  accept:        () => void
  reject:        () => void
  reset:         () => void
}

export const useAriaSuggestion = create<SuggestionStore>((set) => ({
  suggestion:   null,
  ghostSection: null,
  resolved:     false,

  setSuggestion: (suggestion, ghostSection) =>
    set({ suggestion, ghostSection, resolved: false }),

  accept: () => set({ resolved: true }),

  reject: () => set({ ghostSection: null, resolved: true }),

  reset: () => set({ suggestion: null, ghostSection: null, resolved: false }),
}))
