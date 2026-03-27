"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type AriaMode = "game" | "su"

interface AriaModeStore {
  mode: AriaMode
  setMode: (mode: AriaMode) => void
  toggleMode: () => void
}

export const useAriaModeStore = create<AriaModeStore>()(
  persist(
    (set) => ({
      mode: "game",
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((s) => ({ mode: s.mode === "game" ? "su" : "game" })),
    }),
    {
      name: "aria-mode",
    }
  )
)
