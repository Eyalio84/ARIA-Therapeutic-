"use client"

import { create } from "zustand"

const BACKEND = process.env.NEXT_PUBLIC_ARIA_BACKEND ?? "http://localhost:8000"

interface NaiResult {
  id: string
  name: string
  description: string
  score: number
  price?: number
  stock?: number
  category?: string
  node_type?: string
  decomposition?: { emb: number; text: number; graph: number; intent: number }
}

interface PersonaState {
  x: { mood: string; value: number; intensity: number; reason: string }
  y: { activated: boolean; relation_type: string | null; target: string | null; intensity: number }
  z: { dialect: string; distinctiveness: number }
  t: { step: number; velocity: Record<string, number>; momentum: Record<string, string | number>; memory: string[] }
  derived: { intensity: number; stability: number; authenticity: number }
}

interface IntrospectionResult {
  valid: boolean
  score: number
  recommendation: "pass" | "warn" | "block"
  deviations: Array<{ type: string; severity: string; detail: string; topic?: string; corruption_type?: string }>
}

interface SdkStore {
  // NAI
  naiResults: NaiResult[]
  naiQuery: string
  naiIntent: string
  naiMethods: string[]
  naiWeights: { alpha: number; beta: number; gamma: number; delta: number } | null
  naiTotal: number
  isSearching: boolean

  // 4D Persona
  personaState: PersonaState | null
  sessionId: string

  // Introspection
  introspectionResult: IntrospectionResult | null
  isValidating: boolean

  // Actions
  searchNai: (query: string) => Promise<void>
  computeState: (message: string) => Promise<void>
  validateText: (response: string) => Promise<void>
  setPersonaState: (state: PersonaState) => void
  clearResults: () => void
}

export const useSdkStore = create<SdkStore>((set, get) => ({
  naiResults: [],
  naiQuery: "",
  naiIntent: "",
  naiMethods: [],
  naiWeights: null,
  naiTotal: 0,
  isSearching: false,

  personaState: null,
  sessionId: `sdk-${Date.now()}`,

  introspectionResult: null,
  isValidating: false,

  searchNai: async (query) => {
    set({ isSearching: true, naiQuery: query })
    try {
      const res = await fetch(`${BACKEND}/api/aria/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_n: 10 }),
      })
      const data = await res.json()
      set({
        naiResults: data.results ?? [],
        naiIntent: data.intent ?? "",
        naiMethods: data.methods ?? [],
        naiWeights: data.weights ?? null,
        naiTotal: data.total ?? 0,
        isSearching: false,
      })
      // Also compute persona state for the same query
      get().computeState(query)
    } catch {
      set({ isSearching: false })
    }
  },

  computeState: async (message) => {
    try {
      const res = await fetch(`${BACKEND}/api/aria/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: get().sessionId }),
      })
      const data = await res.json()
      set({ personaState: data })
    } catch {
      // silent
    }
  },

  validateText: async (response) => {
    set({ isValidating: true })
    try {
      const res = await fetch(`${BACKEND}/api/aria/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, persona_state: get().personaState }),
      })
      const data = await res.json()
      set({ introspectionResult: data, isValidating: false })
    } catch {
      set({ isValidating: false })
    }
  },

  setPersonaState: (state) => set({ personaState: state }),

  clearResults: () => set({
    naiResults: [], naiQuery: "", naiIntent: "", naiMethods: [], naiWeights: null, naiTotal: 0,
    personaState: null, introspectionResult: null,
  }),
}))
