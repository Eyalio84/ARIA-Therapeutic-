"use client"

import { useCallback, useEffect, useState } from "react"
import { useGameStore } from "@/store/game"
import { useTranscriptStore } from "@/store/transcript"
import { useGameThemeStore } from "@/store/gameTheme"
import * as api from "@/lib/gameApi"
import type { SaveSummary } from "@/lib/gameApi"
import VibeCard from "../onboarding/VibeCard"
import DepthSelector from "../onboarding/DepthSelector"
import CartridgePicker from "../onboarding/CartridgePicker"
import SaveCard from "../onboarding/SaveCard"

const VIBES = [
  { vibe: "build_cool", title: "Let's build something cool", desc: "Jump straight into creating your own game world, characters, and adventure." },
  { vibe: "your_way", title: "Your story, your way", desc: "Build a game that's uniquely yours. Stories can help us see things differently." },
  { vibe: "explore_together", title: "Let's explore together", desc: "Create a story and discover what it means to you. A journey of building and reflection." },
]

export default function OnboardingScreen() {
  const { selectedVibe, selectedDepth, userId, selectVibe, selectDepth, setScreen, setGameConfig, setQuestion, setProgress } = useGameStore()
  const log = useTranscriptStore((s) => s.log)
  const applyTheme = useGameThemeStore((s) => s.applyTheme)
  const [saves, setSaves] = useState<SaveSummary[]>([])

  // Load saved games on mount
  useEffect(() => {
    api.listSaves(userId).then(setSaves).catch(() => {})
  }, [userId])

  const handleBegin = useCallback(async () => {
    if (!selectedVibe) return
    setScreen("interview")
    try {
      const data = await api.startInterview(userId, selectedDepth, selectedVibe)
      if (data.question) setQuestion(data.question)
      if (data.progress) setProgress(data.progress)
    } catch {
      // handled by InterviewScreen
    }
  }, [selectedVibe, selectedDepth, userId, setScreen, setQuestion, setProgress])

  const handleCartridge = useCallback(async (cartridgeId: string) => {
    setScreen("generating")
    applyTheme(cartridgeId)
    try {
      const config = await api.loadCartridge(userId, cartridgeId)
      // Ensure cartridge_id is stored on the config for save/load
      ;(config as any).cartridge_id = cartridgeId
      setGameConfig(config)
      log("system", `Game started: "${config.title}" — ${config.protagonist_name}`)
      const action = await api.playStart(userId)
      useGameStore.getState().handleGameAction(action)
      setScreen("game")
    } catch {
      setScreen("onboarding")
    }
  }, [userId, setScreen, setGameConfig, applyTheme, log])

  const handleResume = useCallback(async (saveId: string) => {
    setScreen("generating")
    try {
      // Backend restores everything — returns complete snapshot
      const save = await api.loadSave(userId, saveId)

      // Theme
      if (save.cartridge_id) applyTheme(save.cartridge_id)

      // Game config
      setGameConfig(save.config as any)

      // Player state from backend (source of truth)
      const p = save.player
      useGameStore.setState({
        playerStats: {
          courage: p.variables?.courage ?? 4,
          trust: p.variables?.trust ?? 3,
          items: p.inventory?.length ?? 0,
        },
        turnCount: p.turn_count || 0,
        mapNodes: (save.map?.nodes as any[]) || [],
        availableActions: save.available_actions || [],
      })

      // Transcript
      if (save.transcript) {
        const ts = useTranscriptStore.getState()
        ts.clear()
        save.transcript.forEach((e: any) => ts.log(e.type, e.text, e.meta))
      }

      log("system", `Resumed: "${save.title}" — Turn ${p.turn_count} at ${save.location || "unknown"}`)

      // Set narratives from save
      if (save.narratives?.length) {
        useGameStore.getState().setNarratives(save.narratives)
      }

      setScreen("game")
    } catch (e) {
      console.error("Load failed:", e)
      alert("This save file is corrupted or incompatible. You can delete it and start fresh.")
      setScreen("onboarding")
    }
  }, [userId, setScreen, setGameConfig, applyTheme, log])

  const handleDelete = useCallback(async (saveId: string) => {
    await api.deleteSave(userId, saveId)
    setSaves((prev) => prev.filter((s) => s.save_id !== saveId))
  }, [userId])

  return (
    <div className="flex flex-col h-full bg-[var(--bg-deep,#0a0a0f)]" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, var(--bg-deep, #0a0a0f) 70%)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
        <span className="font-serif text-xl text-[var(--gold,#c9a84c)] tracking-wide">Aria</span>
        <span className="font-mono text-[11px] text-[var(--text-dim,#5a5854)]">v2.0</span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Saved games — shown first if any exist */}
        {saves.length > 0 && (
          <div className="mb-6">
            <h3 className="font-serif text-base text-[var(--gold,#c9a84c)] mb-3 text-center">Continue your adventure</h3>
            <div className="flex flex-col gap-2.5">
              {saves.map((s) => (
                <SaveCard
                  key={s.save_id}
                  save={s}
                  onResume={() => handleResume(s.save_id)}
                  onDelete={() => handleDelete(s.save_id)}
                />
              ))}
            </div>
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="font-mono text-[10px] text-[var(--text-dim,#5a5854)]">or start new</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
          </div>
        )}

        <div className="text-center pt-6 pb-8">
          <h1 className="font-serif text-[32px] font-normal text-[var(--text-primary,#e8e4dc)] mb-2">
            Your <em className="text-[var(--gold,#c9a84c)] italic">story</em> begins here
          </h1>
          <p className="text-[var(--text-secondary,#9a9690)] text-sm max-w-[280px] mx-auto">
            Choose how you&apos;d like to create your adventure
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {VIBES.map((v) => (
            <VibeCard
              key={v.vibe}
              vibe={v.vibe}
              title={v.title}
              description={v.desc}
              selected={selectedVibe === v.vibe}
              onSelect={selectVibe}
            />
          ))}
        </div>

        <div className="mb-6">
          <DepthSelector selected={selectedDepth} onSelect={selectDepth} />
        </div>

        <button
          onClick={handleBegin}
          disabled={!selectedVibe}
          className="block w-full p-4 rounded-xl font-serif text-lg text-[var(--bg-deep,#0a0a0f)] tracking-wide transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_8px_24px_rgba(201,168,76,0.25)]"
          style={{ background: "linear-gradient(135deg, var(--gold-dim, #8a7235) 0%, var(--gold, #c9a84c) 100%)" }}
        >
          Begin your adventure
        </button>

        <CartridgePicker onLoad={handleCartridge} />
      </div>
    </div>
  )
}
