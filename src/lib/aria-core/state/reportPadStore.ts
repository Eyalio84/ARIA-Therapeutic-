"use client"

/**
 * Provider-agnostic report pad store.
 *
 * Extracted from store/reportPad.ts — same behavior, no StoreKit imports.
 * Persisted to localStorage via Zustand persist middleware.
 *
 * StoreKit's reportPad.ts re-exports from here (no customization needed).
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type EntryType = "observation" | "bug" | "navigation" | "test" | "summary" | "aria_note"

export interface ReportEntry {
  timestamp: string  // HH:MM:SS
  type:      EntryType
  text:      string
}

interface ReportPadStore {
  entries:      ReportEntry[]
  isOpen:       boolean
  sessionStart: string  // ISO

  addEntry:       (text: string, type: EntryType) => void
  clearAll:       () => void
  toggleOpen:     () => void
  exportMarkdown: () => string
}

const TYPE_LABELS: Record<EntryType, string> = {
  observation: "Observations",
  bug:         "Bugs Found",
  navigation:  "Navigation",
  test:        "Tests Performed",
  summary:     "Summaries",
  aria_note:   "Aria Notes",
}

export const useReportPad = create<ReportPadStore>()(
  persist(
    (set, get) => ({
      entries:      [],
      isOpen:       false,
      sessionStart: new Date().toISOString(),

      addEntry: (text, type) => {
        set((state) => {
          const now = new Date()
          const pad = (n: number) => String(n).padStart(2, "0")
          const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
          return { entries: [...state.entries, { timestamp, type, text }] }
        })
      },

      clearAll: () => set({ entries: [] }),

      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

      exportMarkdown: () => {
        const { entries, sessionStart } = get()
        if (entries.length === 0) return "# Session Report\n\nNo entries recorded."

        const lines = [
          `# Session Report\n`,
          `**Started:** ${new Date(sessionStart).toLocaleString()}\n`,
          `**Total entries:** ${entries.length}\n`,
        ]

        const grouped = entries.reduce<Record<string, ReportEntry[]>>((acc, e) => {
          ;(acc[e.type] ??= []).push(e)
          return acc
        }, {})

        for (const [type, label] of Object.entries(TYPE_LABELS)) {
          if (grouped[type]) {
            lines.push(`\n## ${label}\n`)
            for (const e of grouped[type]) {
              lines.push(`- **${e.timestamp}** ${e.text}`)
            }
          }
        }
        return lines.join("\n")
      },
    }),
    {
      name: "aria-report-pad",
      partialize: (s) => ({ entries: s.entries, sessionStart: s.sessionStart }),
    },
  ),
)
