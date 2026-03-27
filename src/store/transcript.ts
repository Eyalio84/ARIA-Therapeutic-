"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { TranscriptEntry, TranscriptEntryType, GameConfig } from "@/types/game"

interface TranscriptStore {
  entries: TranscriptEntry[]
  isOpen: boolean

  log: (type: TranscriptEntryType, text: string, meta?: TranscriptEntry["meta"]) => void
  toggle: () => void
  setOpen: (v: boolean) => void
  clear: () => void
  exportJSON: (gameConfig: GameConfig | null, userId: string) => string
}

export const useTranscriptStore = create<TranscriptStore>()(
  persist(
    (set, get) => ({
      entries: [],
      isOpen: false,

      log: (type, text, meta) => {
        if (!text?.trim()) return
        set((s) => ({
          entries: [
            ...s.entries,
            {
              id: crypto.randomUUID(),
              type,
              text: text.trim(),
              timestamp: new Date().toISOString(),
              turn: 0,
              meta,
            },
          ],
        }))
      },

      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (v) => set({ isOpen: v }),
      clear: () => set({ entries: [] }),

      exportJSON: (gameConfig, userId) => {
        const { entries } = get()
        return JSON.stringify(
          {
            session_id: userId,
            game: gameConfig?.title ?? null,
            protagonist: gameConfig?.protagonist_name ?? null,
            exported_at: new Date().toISOString(),
            entry_count: entries.length,
            entries,
          },
          null,
          2
        )
      },
    }),
    {
      name: "aria-transcript",
      partialize: (state) => ({
        entries: state.entries,
        // Don't persist isOpen (UI ephemeral)
      }),
    }
  )
)
