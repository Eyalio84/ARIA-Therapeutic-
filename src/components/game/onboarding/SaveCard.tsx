"use client"

import type { SaveSummary } from "@/lib/gameApi"

interface Props {
  save: SaveSummary
  onResume: () => void
  onDelete: () => void
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() / 1000) - ts)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SaveCard({ save, onResume, onDelete }: Props) {
  return (
    <div className="w-full rounded-xl border border-white/[0.06] bg-[var(--bg-surface,#1a1a26)] overflow-hidden transition-all duration-300 hover:border-[var(--gold,#c9a84c)]/25 hover:bg-[var(--bg-elevated,#222233)]">
      <button onClick={onResume} className="w-full text-left p-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-serif text-[16px] text-[var(--gold-light,#e4cc7a)]">{save.title}</span>
          <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)]">{timeAgo(save.updated_at)}</span>
        </div>
        <div className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)] mb-1">
          {save.protagonist && <span>{save.protagonist} — </span>}
          {save.location && <span>{save.location}</span>}
        </div>
        <div className="flex gap-3 font-mono text-[9px] text-[var(--text-dim,#5a5854)]">
          <span>Turn {save.turn_count}</span>
          {save.stats.courage != null && <span>C:{save.stats.courage}</span>}
          {save.stats.trust != null && <span>T:{save.stats.trust}</span>}
          {save.stats.items != null && <span>I:{save.stats.items}</span>}
        </div>
      </button>
      <div className="flex border-t border-white/[0.04]">
        <button
          onClick={onResume}
          className="flex-1 py-2 font-mono text-[10px] text-[var(--gold,#c9a84c)] hover:bg-[var(--gold,#c9a84c)]/[0.06] transition-colors"
        >
          Continue
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="px-4 py-2 font-mono text-[10px] text-[var(--text-dim,#5a5854)] hover:text-[var(--rose,#c47a7a)] border-l border-white/[0.04] transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
