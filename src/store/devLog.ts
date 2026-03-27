"use client"

import { create } from "zustand"

export type DevLogLevel = "info" | "warn" | "error" | "debug"

export interface DevLogEntry {
  id: string
  level: DevLogLevel
  source: string
  message: string
  timestamp: string
  data?: unknown
}

interface DevLogStore {
  entries: DevLogEntry[]
  isOpen: boolean
  maxEntries: number

  log: (level: DevLogLevel, source: string, message: string, data?: unknown) => void
  toggle: () => void
  clear: () => void
}

export const useDevLogStore = create<DevLogStore>((set) => ({
  entries: [],
  isOpen: false,
  maxEntries: 500,

  log: (level, source, message, data) =>
    set((s) => ({
      entries: [
        ...s.entries.slice(-(s.maxEntries - 1)),
        {
          id: crypto.randomUUID(),
          level,
          source,
          message,
          timestamp: new Date().toISOString(),
          data,
        },
      ],
    })),

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  clear: () => set({ entries: [] }),
}))
