"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ThemePreset {
  id: string
  label: string
  bgDeep: string
  bgMid: string
  bgSurface: string
  bgElevated: string
  gold: string
  goldLight: string
  goldDim: string
  teal: string
  rose: string
}

const PRESETS: Record<string, ThemePreset> = {
  default: {
    id: "default", label: "Classic",
    bgDeep: "#0a0a0f", bgMid: "#12121a", bgSurface: "#1a1a26", bgElevated: "#222233",
    gold: "#c9a84c", goldLight: "#e4cc7a", goldDim: "#8a7235",
    teal: "#4a9e8e", rose: "#c47a7a",
  },
  maya: {
    id: "maya", label: "Ocean Depths",
    bgDeep: "#050a14", bgMid: "#0a1220", bgSurface: "#0f1a2e", bgElevated: "#162440",
    gold: "#4a9ecf", goldLight: "#7ec4e8", goldDim: "#2a6a8f",
    teal: "#3ad6b5", rose: "#cf7a9e",
  },
  ren: {
    id: "ren", label: "Deep Space",
    bgDeep: "#0a050f", bgMid: "#120a1a", bgSurface: "#1a1028", bgElevated: "#241838",
    gold: "#9b6fcc", goldLight: "#c49ef0", goldDim: "#6a4a8a",
    teal: "#4ae0c8", rose: "#e07a7a",
  },
  ash: {
    id: "ash", label: "Noir City",
    bgDeep: "#0a0a0a", bgMid: "#111111", bgSurface: "#1a1a1a", bgElevated: "#242424",
    gold: "#a0a0a0", goldLight: "#c8c8c8", goldDim: "#686868",
    teal: "#6a9e90", rose: "#b07070",
  },
}

interface GameThemeStore {
  themeId: string
  preset: ThemePreset
  moodPrimary: string
  moodSecondary: string

  applyTheme: (id: string) => void
  setMoodColors: (primary: string, secondary: string) => void
  getPresets: () => ThemePreset[]
  getCSSVars: () => Record<string, string>
}

export const useGameThemeStore = create<GameThemeStore>()(
  persist(
    (set, get) => ({
      themeId: "default",
      preset: PRESETS.default,
      moodPrimary: "#1a1a26",
      moodSecondary: "#12121a",

      applyTheme: (id) => {
        const preset = PRESETS[id] || PRESETS.default
        set({ themeId: id, preset, moodPrimary: preset.bgSurface, moodSecondary: preset.bgMid })
      },

      setMoodColors: (primary, secondary) => set({ moodPrimary: primary, moodSecondary: secondary }),

      getPresets: () => Object.values(PRESETS),

      getCSSVars: () => {
        const { preset, moodPrimary, moodSecondary } = get()
        return {
          "--bg-deep": preset.bgDeep,
          "--bg-mid": preset.bgMid,
          "--bg-surface": preset.bgSurface,
          "--bg-elevated": preset.bgElevated,
          "--gold": preset.gold,
          "--gold-light": preset.goldLight,
          "--gold-dim": preset.goldDim,
          "--teal": preset.teal,
          "--rose": preset.rose,
          "--mood-primary": moodPrimary,
          "--mood-secondary": moodSecondary,
        }
      },
    }),
    {
      name: "aria-theme",
      partialize: (state) => ({
        themeId: state.themeId,
        preset: state.preset,
        moodPrimary: state.moodPrimary,
        moodSecondary: state.moodSecondary,
      }),
    }
  )
)
