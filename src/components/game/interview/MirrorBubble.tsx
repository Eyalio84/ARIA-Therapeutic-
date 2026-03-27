"use client"

import type { MirrorBubble as MirrorData, InterviewQuestion } from "@/types/game"

interface Props {
  data: { bubble: MirrorData; nextQuestion?: InterviewQuestion } | null
  onClose: () => void
  onExpand: () => void
}

export default function MirrorBubble({ data, onClose, onExpand }: Props) {
  if (!data) return null

  return (
    <div className="bg-gradient-to-br from-[var(--teal,#4a9e8e)]/[0.08] to-[var(--gold,#c9a84c)]/[0.06] border border-[var(--teal,#4a9e8e)] border-l-[3px] rounded-xl p-4 my-4 animate-[bubbleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
      <div className="font-serif text-base italic text-[var(--teal,#4a9e8e)] mb-3">
        {data.bubble.reflection}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-[13px] border border-white/[0.08] text-[var(--text-secondary,#9a9690)] hover:-translate-y-px transition-all"
        >
          Continue
        </button>
        <button
          onClick={onExpand}
          className="px-4 py-2 rounded-lg text-[13px] border border-[var(--teal,#4a9e8e)] text-[var(--teal,#4a9e8e)] bg-[var(--teal,#4a9e8e)]/[0.12] hover:-translate-y-px transition-all"
        >
          Tell me more
        </button>
      </div>
    </div>
  )
}
