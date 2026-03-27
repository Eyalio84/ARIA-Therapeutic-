"use client"

import type { TranscriptEntry as TEntry } from "@/types/game"

interface Props {
  entry: TEntry
}

const TYPE_STYLES: Record<string, { labelColor: string; textClass: string; borderColor: string }> = {
  user:   { labelColor: "#6ba3d6", textClass: "text-[#a8cceb] bg-[#6ba3d6]/[0.08]", borderColor: "#6ba3d6" },
  aria:   { labelColor: "var(--gold, #c9a84c)", textClass: "text-[var(--gold-light,#e4cc7a)] bg-[var(--gold,#c9a84c)]/[0.06] italic font-serif", borderColor: "var(--gold-dim, #8a7235)" },
  game:   { labelColor: "var(--teal, #4a9e8e)", textClass: "text-[var(--text-secondary,#9a9690)] bg-[var(--teal,#4a9e8e)]/[0.06] font-mono text-xs", borderColor: "rgba(74,158,142,0.4)" },
  system: { labelColor: "var(--text-dim, #5a5854)", textClass: "text-[var(--text-dim,#5a5854)] bg-white/[0.02] font-mono text-[11px]", borderColor: "rgba(255,255,255,0.06)" },
}

const LABELS: Record<string, string> = { user: "Player", aria: "Aria", game: "Game", system: "System" }

export default function TranscriptEntryComponent({ entry }: Props) {
  const style = TYPE_STYLES[entry.type] || TYPE_STYLES.system

  return (
    <div className="mb-2.5 animate-[fadeSlideUp_0.3s_ease]">
      <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] mb-0.5 flex items-center gap-1.5">
        <span className="uppercase tracking-wider" style={{ color: style.labelColor }}>{LABELS[entry.type]}</span>
        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
        {entry.turn > 0 && <span>T{entry.turn}</span>}
      </div>
      <div
        className={`text-[13px] leading-relaxed px-2.5 py-1.5 rounded-lg border-l-2 ${style.textClass}`}
        style={{ borderLeftColor: style.borderColor }}
      >
        {entry.text}
      </div>
    </div>
  )
}
