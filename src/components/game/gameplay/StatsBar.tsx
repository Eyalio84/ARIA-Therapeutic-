"use client"

import type { PlayerStats } from "@/types/game"

interface Props {
  stats: PlayerStats
}

export default function StatsBar({ stats }: Props) {
  return (
    <div className="flex gap-3 px-4 py-1.5 font-mono text-[10px] text-[var(--text-dim,#5a5854)] border-b border-white/[0.03] shrink-0">
      <span>Courage: <span className="text-[var(--gold-dim,#8a7235)]">{stats.courage}</span></span>
      <span>Trust: <span className="text-[var(--gold-dim,#8a7235)]">{stats.trust}</span></span>
      <span>Items: <span className="text-[var(--gold-dim,#8a7235)]">{stats.items}</span></span>
    </div>
  )
}
