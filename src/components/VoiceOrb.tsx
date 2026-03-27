"use client"

import { useChatStore } from "@/store/chat"
import { ariaConnect, ariaDisconnect } from "@/lib/aria"

const ORB_CONFIG: Record<string, {
  ring: string; core: string; glow: string; dot: string; label: string; showRings: boolean
}> = {
  idle: {
    ring: "", core: "border-zinc-700", glow: "",
    dot: "bg-zinc-600", label: "Tap to talk", showRings: false,
  },
  connecting: {
    ring: "border-yellow-400/40", core: "border-yellow-400/50", glow: "shadow-[0_0_40px_rgba(234,179,8,0.2)]",
    dot: "bg-yellow-400 animate-pulse", label: "Connecting…", showRings: true,
  },
  listening: {
    ring: "border-violet-400/40", core: "border-violet-400/60", glow: "shadow-[0_0_50px_rgba(139,92,246,0.35)]",
    dot: "bg-violet-400", label: "Listening", showRings: true,
  },
  thinking: {
    ring: "border-violet-300/30", core: "border-violet-300/50", glow: "shadow-[0_0_40px_rgba(167,139,250,0.25)]",
    dot: "bg-violet-300 animate-pulse", label: "Thinking…", showRings: true,
  },
  speaking: {
    ring: "border-emerald-400/40", core: "border-emerald-400/50", glow: "shadow-[0_0_50px_rgba(52,211,153,0.3)]",
    dot: "bg-emerald-400", label: "Speaking", showRings: true,
  },
}

export function VoiceOrb() {
  const { status, isConnected } = useChatStore()
  const cfg = ORB_CONFIG[status] ?? ORB_CONFIG.idle

  const handleTap = () => {
    if (isConnected || status === "connecting") ariaDisconnect()
    else void ariaConnect()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleTap}
        className="relative flex items-center justify-center focus:outline-none active:scale-95 transition-transform duration-150"
        aria-label={isConnected ? "Disconnect Aria" : "Connect Aria"}
      >
        {/* Pulse rings */}
        {cfg.showRings && (
          <>
            <span className={`absolute w-24 h-24 rounded-full border-2 ${cfg.ring} orb-ring pointer-events-none`} />
            <span className={`absolute w-24 h-24 rounded-full border-2 ${cfg.ring} orb-ring-delay pointer-events-none`} />
          </>
        )}

        {/* Core orb */}
        <span className={`
          relative w-20 h-20 rounded-full border-2 glass-strong
          flex items-center justify-center
          transition-all duration-500
          ${cfg.core} ${cfg.glow}
        `}>
          <span className={`w-5 h-5 rounded-full transition-all duration-500 ${cfg.dot}`} />
        </span>
      </button>

      <span className="text-[11px] font-medium text-zinc-500 tracking-widest uppercase select-none">
        {cfg.label}
      </span>
    </div>
  )
}
