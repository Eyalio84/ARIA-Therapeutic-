"use client"

import { create } from "zustand"

export type VoiceOrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking"

interface GameVoiceStore {
  orbState: VoiceOrbState
  isConnected: boolean
  lastSpokenText: string

  setOrbState: (state: VoiceOrbState) => void
  setConnected: (v: boolean) => void
  setLastSpoken: (text: string) => void
  reset: () => void
}

export const useGameVoiceStore = create<GameVoiceStore>((set) => ({
  orbState: "idle",
  isConnected: false,
  lastSpokenText: "",

  setOrbState: (orbState) => set({ orbState }),
  setConnected: (isConnected) => set({ isConnected }),
  setLastSpoken: (lastSpokenText) => set({ lastSpokenText }),
  reset: () => set({ orbState: "idle", isConnected: false, lastSpokenText: "" }),
}))
