"use client"

import { useGameVoiceStore } from "@/store/gameVoice"

interface Props {
  onToggle: () => void
  visible: boolean
}

const ORB_CLASSES: Record<string, string> = {
  idle: "animate-[orbPulse_3s_infinite_ease-in-out]",
  connecting: "animate-[orbSpin_1s_linear_infinite]",
  listening: "animate-[orbListening_1s_infinite_ease-in-out] shadow-[0_0_30px_rgba(201,168,76,0.5)]",
  thinking: "animate-[orbSpin_1s_linear_infinite]",
  speaking: "animate-[orbSpeaking_0.6s_infinite_ease-in-out] shadow-[0_0_35px_rgba(201,168,76,0.6)]",
}

export default function GameVoiceOrb({ onToggle, visible }: Props) {
  const orbState = useGameVoiceStore((s) => s.orbState)

  if (!visible) return null

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-20 right-4 w-12 h-12 rounded-full z-[100] flex items-center justify-center cursor-pointer transition-all duration-300 shadow-[0_4px_20px_rgba(201,168,76,0.3)] hover:scale-110 hover:shadow-[0_6px_28px_rgba(201,168,76,0.4)] ${ORB_CLASSES[orbState] || ""}`}
      style={{ background: "radial-gradient(circle at 35% 35%, var(--gold, #c9a84c), var(--gold-dim, #8a7235))" }}
    >
      <svg className="w-5 h-5 fill-[var(--bg-deep,#0a0a0f)]" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V20h4v2H8v-2h4v-4.07z" />
      </svg>
    </button>
  )
}
