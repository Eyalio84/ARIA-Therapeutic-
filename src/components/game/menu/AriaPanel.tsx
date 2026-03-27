"use client"

import { useGameVoiceStore } from "@/store/gameVoice"
import { useGameStore } from "@/store/game"
import { gameAriaConnect, gameAriaDisconnect } from "@/lib/gameAriaAdapter"

const VOICES = [
  { id: "Aoede", label: "Aoede", desc: "Warm, storytelling" },
  { id: "Kore", label: "Kore", desc: "Clear, articulate" },
  { id: "Puck", label: "Puck", desc: "Playful, energetic" },
  { id: "Charon", label: "Charon", desc: "Deep, atmospheric" },
  { id: "Fenrir", label: "Fenrir", desc: "Bold, dramatic" },
  { id: "Leda", label: "Leda", desc: "Gentle, soothing" },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function AriaPanel({ isOpen, onClose }: Props) {
  const orbState = useGameVoiceStore((s) => s.orbState)
  const isConnected = useGameVoiceStore((s) => s.isConnected)
  const gameConfig = useGameStore((s) => s.gameConfig)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] bg-[var(--bg-deep,#0a0a0f)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="font-serif text-base text-[#c49ef0]">Aria Configuration</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[var(--text-dim,#5a5854)] hover:text-[#c49ef0] transition-colors text-sm">
          x
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* Connection Status */}
        <div className="mb-5">
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Connection</div>
          <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]" : "bg-red-400"}`} />
              <span className="font-mono text-[12px] text-[var(--text-secondary,#9a9690)]">
                {isConnected ? `Connected — ${orbState}` : "Disconnected"}
              </span>
            </div>
            <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] mb-3">
              Model: gemini-2.5-flash-native-audio-preview
            </div>
            <button
              onClick={() => { isConnected ? gameAriaDisconnect() : gameAriaConnect() }}
              className={`w-full py-2 rounded-lg font-mono text-[11px] border transition-all
                ${isConnected
                  ? "border-[var(--rose,#c47a7a)]/30 text-[var(--rose,#c47a7a)] hover:bg-[var(--rose,#c47a7a)]/10"
                  : "border-[#c49ef0]/30 text-[#c49ef0] hover:bg-[#c49ef0]/10"
                }`}
            >
              {isConnected ? "Disconnect" : "Connect to Aria"}
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-5">
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Voice</div>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                className={`rounded-lg p-2.5 border text-left transition-all duration-200
                  ${v.id === "Aoede"
                    ? "border-[#c49ef0]/30 bg-[#c49ef0]/[0.08]"
                    : "border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] hover:border-[#c49ef0]/20"
                  }`}
              >
                <div className="font-serif text-[12px] text-[var(--gold-light,#e4cc7a)]">{v.label}</div>
                <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">{v.desc}</div>
              </button>
            ))}
          </div>
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] mt-2 italic">
            Voice change applies on next connection.
          </div>
        </div>

        {/* Personality */}
        <div className="mb-5">
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Personality</div>
          <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3 space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)]">Warmth</span>
                <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">Warm</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#c49ef0] to-[var(--gold,#c9a84c)]" style={{ width: "75%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)]">Verbosity</span>
                <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">Balanced</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#c49ef0] to-[var(--gold,#c9a84c)]" style={{ width: "50%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)]">Atmosphere</span>
                <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">Immersive</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#c49ef0] to-[var(--gold,#c9a84c)]" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] mt-2 italic">
            Personality sliders coming soon — modifies Aria&apos;s system prompt.
          </div>
        </div>

        {/* NPC Voice Presets */}
        <div className="mb-5">
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">NPC Voice Presets</div>
          <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3">
            {gameConfig?.npcs?.length ? (
              <div className="space-y-2">
                {gameConfig.npcs.map((npc) => (
                  <div key={npc.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-serif text-[12px] text-[var(--gold-light,#e4cc7a)]">{npc.name}</span>
                      <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] ml-2">{npc.role}</span>
                    </div>
                    <span className="font-mono text-[9px] text-[#c49ef0]/60 border border-[#c49ef0]/20 rounded px-1.5 py-0.5">auto</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)]">Load a game to see NPCs</div>
            )}
            <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] mt-2 italic">
              Per-NPC voice/tone presets coming soon.
            </div>
          </div>
        </div>

        {/* Game Context */}
        <div>
          <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Active Context</div>
          <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3 font-mono text-[10px] text-[var(--text-dim,#5a5854)] space-y-1">
            <div>Game: <span className="text-[var(--text-secondary,#9a9690)]">{gameConfig?.title || "None"}</span></div>
            <div>Tone: <span className="text-[var(--text-secondary,#9a9690)]">{gameConfig?.tone || "—"}</span></div>
            <div>Companion: <span className="text-[var(--text-secondary,#9a9690)]">{gameConfig?.companion?.name || "None"}</span></div>
            <div>Functions: <span className="text-[var(--text-secondary,#9a9690)]">22 registered</span></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 h-1 bg-gradient-to-r from-transparent via-[#c49ef0]/20 to-transparent" />
    </div>
  )
}
