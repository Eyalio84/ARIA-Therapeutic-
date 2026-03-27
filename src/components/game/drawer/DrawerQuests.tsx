"use client"

import type { Quest } from "@/types/game"

interface Props {
  quests: Quest[]
  activeQuestId?: string
  completedQuestIds?: string[]
}

export default function DrawerQuests({ quests, activeQuestId, completedQuestIds = [] }: Props) {
  if (quests.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-2xl opacity-20">📋</span>
        <p className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] mt-1">No active quests</p>
      </div>
    )
  }

  const active = quests.filter((q) => !completedQuestIds.includes(q.id))
  const completed = quests.filter((q) => completedQuestIds.includes(q.id))

  return (
    <div className="space-y-2">
      {active.map((q) => (
        <div
          key={q.id}
          className={`rounded-lg p-2.5 border transition-all
            ${q.id === activeQuestId
              ? "border-[var(--gold,#c9a84c)]/20 bg-[var(--gold,#c9a84c)]/[0.06]"
              : "border-white/[0.04] bg-[var(--bg-surface,#1a1a26)]"
            }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs">📌</span>
            <span className="font-serif text-[12px] text-[var(--gold-light,#e4cc7a)]">{q.title}</span>
            {q.id === activeQuestId && (
              <span className="ml-auto font-mono text-[8px] text-[var(--gold-dim,#8a7235)] bg-[var(--gold,#c9a84c)]/[0.1] px-1.5 py-0.5 rounded-full">ACTIVE</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)] leading-relaxed">{q.description}</p>
        </div>
      ))}

      {completed.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/[0.04]">
          <span className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-wider">Completed</span>
          {completed.map((q) => (
            <div key={q.id} className="mt-1.5 rounded-lg p-2 border border-white/[0.03] bg-white/[0.01] opacity-50">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">✅</span>
                <span className="font-serif text-[11px] text-[var(--text-dim,#5a5854)] line-through">{q.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
