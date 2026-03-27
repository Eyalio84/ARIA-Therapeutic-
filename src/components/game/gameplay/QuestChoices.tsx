"use client"

import type { QuestChoice } from "@/types/game"

interface Props {
  choices: QuestChoice[]
  onChoose: (choiceId: string) => void
}

export default function QuestChoices({ choices, onChoose }: Props) {
  if (choices.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mx-4 my-4">
      {choices.map((c) => (
        <button
          key={c.id}
          onClick={() => onChoose(c.id)}
          className="w-full text-left bg-[var(--bg-surface,#1a1a26)] border border-white/[0.06] border-l-[3px] border-l-[var(--gold-dim,#8a7235)] rounded-lg px-4 py-3 font-mono text-[13px] text-[var(--text-primary,#e8e4dc)] transition-all duration-250 hover:border-l-[var(--gold,#c9a84c)] hover:bg-[var(--bg-elevated,#222233)] hover:translate-x-1"
        >
          {c.text}
        </button>
      ))}
    </div>
  )
}
