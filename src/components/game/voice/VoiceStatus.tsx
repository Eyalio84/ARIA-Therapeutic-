"use client"

import { useGameVoiceStore } from "@/store/gameVoice"

export default function VoiceStatus() {
  const orbState = useGameVoiceStore((s) => s.orbState)
  const lastSpoken = useGameVoiceStore((s) => s.lastSpokenText)

  if (orbState === "idle") return null

  const labels: Record<string, string> = {
    connecting: "connecting...",
    listening: "listening",
    thinking: "thinking...",
    speaking: "speaking",
  }

  return (
    <div className="fixed bottom-[134px] right-2 font-mono text-[9px] text-[var(--gold-dim,#8a7235)] z-[100] text-right pointer-events-none max-w-[120px]">
      {lastSpoken && orbState === "speaking" ? lastSpoken.slice(-60) : labels[orbState] || ""}
    </div>
  )
}
