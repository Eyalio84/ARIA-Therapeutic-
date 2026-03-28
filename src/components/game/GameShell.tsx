"use client"

import { useEffect, useState } from "react"
import { useGameStore } from "@/store/game"
import ThemedContainer from "./shared/ThemedContainer"
import OnboardingScreen from "./screens/OnboardingScreen"
import InterviewScreen from "./screens/InterviewScreen"
import GeneratingScreen from "./screens/GeneratingScreen"
import GameScreen from "./screens/GameScreen"
import * as api from "@/lib/gameApi"

const SCREENS = {
  onboarding: OnboardingScreen,
  interview: InterviewScreen,
  generating: GeneratingScreen,
  game: GameScreen,
} as const

export default function GameShell() {
  const currentScreen = useGameStore((s) => s.currentScreen)
  const gameConfig = useGameStore((s) => s.gameConfig)
  const userId = useGameStore((s) => s.userId)
  const [hydrated, setHydrated] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // On mount, re-sync backend runtime if we have persisted game state
  useEffect(() => {
    const resync = async () => {
      // If interview has an error question or no question at all, reset to onboarding
      if (currentScreen === "interview") {
        const q = useGameStore.getState().currentQuestion
        if (!q || q.phase === "error") {
          useGameStore.getState().setScreen("onboarding")
          setHydrated(true)
          return
        }
      }

      if (currentScreen === "game" && gameConfig && userId) {
        setSyncing(true)
        try {
          // Check if backend has this game loaded
          const res = await fetch(`/api/game/snapshot/${userId}`)
          if (res.ok) {
            // Backend still has it — we're good
            setHydrated(true)
            setSyncing(false)
            return
          }
        } catch {}

        // Backend lost the game — reload from cartridge or saved config
        try {
          const cartridgeId = (gameConfig as any).cartridge_id
          if (cartridgeId) {
            await api.loadCartridge(userId, cartridgeId)
            await api.playStart(userId)
          }
          setHydrated(true)
        } catch {
          // Can't restore — go to onboarding with saves
          useGameStore.getState().setScreen("onboarding")
          setHydrated(true)
        }
        setSyncing(false)
      } else {
        setHydrated(true)
      }
    }

    resync()
  }, [])

  if (!hydrated || syncing) {
    return (
      <ThemedContainer className="w-full max-w-[480px] mx-auto flex flex-col overflow-hidden relative items-center justify-center" style={{ height: "100dvh" }}>
        <p className="text-sm text-zinc-500 animate-pulse">Restoring session...</p>
      </ThemedContainer>
    )
  }

  const Screen = SCREENS[currentScreen]

  return (
    <ThemedContainer className="w-full max-w-[480px] mx-auto flex flex-col overflow-hidden relative" style={{ height: "100dvh" }}>
      <Screen />
    </ThemedContainer>
  )
}
