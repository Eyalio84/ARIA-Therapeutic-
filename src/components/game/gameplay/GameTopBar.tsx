"use client"

import { useAriaModeStore } from "@/store/ariaMode"

interface Props {
  title: string
  turnCount: number
  onBurgerToggle: () => void
  onDrawerToggle: () => void
  onAriaToggle: () => void
  onTranscriptToggle: () => void
  onDevToggle: () => void
  transcriptOpen: boolean
}

export default function GameTopBar({
  title, turnCount, onBurgerToggle, onDrawerToggle,
  onAriaToggle, onTranscriptToggle, onDevToggle, transcriptOpen,
}: Props) {
  const ariaMode = useAriaModeStore((s) => s.mode)
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.04] shrink-0">
      {/* Left: burger */}
      <button onClick={onBurgerToggle} title="Settings" className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center hover:border-[var(--gold-dim,#8a7235)] hover:bg-[var(--gold,#c9a84c)]/[0.06] transition-all shrink-0">
        <svg className="w-4 h-4 fill-[var(--text-dim,#5a5854)]" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>

      {/* Center: title + turn + mode badge */}
      <div className="flex-1 mx-2 min-w-0 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-serif text-lg text-[var(--gold,#c9a84c)] tracking-wide truncate">{title}</span>
          {ariaMode === "su" && (
            <span className="font-mono text-[8px] text-[#c49ef0] bg-[#c49ef0]/[0.12] border border-[#c49ef0]/25 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
              SU
            </span>
          )}
        </div>
        <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">Turn {turnCount}</span>
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Journal/drawer */}
        <button onClick={onDrawerToggle} title="Journal" className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:border-[var(--gold-dim,#8a7235)] hover:bg-[var(--gold,#c9a84c)]/10 transition-all">
          <svg className="w-3.5 h-3.5 fill-[var(--text-dim,#5a5854)]" viewBox="0 0 24 24">
            <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
          </svg>
        </button>
        {/* Aria config */}
        <button onClick={onAriaToggle} title="Aria settings" className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:border-[#c49ef0]/40 hover:bg-[#c49ef0]/10 transition-all">
          <svg className="w-3.5 h-3.5 fill-[var(--text-dim,#5a5854)]" viewBox="0 0 24 24">
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
        </button>
        {/* Transcript */}
        <button onClick={onTranscriptToggle} title="Transcript" className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${transcriptOpen ? "border-[var(--teal,#4a9e8e)] bg-[var(--teal,#4a9e8e)]/10" : "border-white/[0.08] hover:border-[var(--teal,#4a9e8e)] hover:bg-[var(--teal,#4a9e8e)]/10"}`}>
          <svg className={`w-3.5 h-3.5 ${transcriptOpen ? "fill-[var(--teal,#4a9e8e)]" : "fill-[var(--text-dim,#5a5854)]"}`} viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </button>
        {/* Dev panel */}
        <button onClick={onDevToggle} title="Dev panel" className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center hover:border-[#e07a7a]/40 hover:bg-[#e07a7a]/10 transition-all">
          <svg className="w-3.5 h-3.5 fill-[var(--text-dim,#5a5854)]" viewBox="0 0 24 24">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
