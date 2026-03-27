"use client"

import type { InterviewProgress as ProgressType } from "@/types/game"

interface Props {
  progress: ProgressType | null
}

export default function InterviewProgress({ progress }: Props) {
  if (!progress) return null
  return (
    <>
      <div className="h-[3px] bg-white/[0.04] shrink-0">
        <div
          className="h-full bg-gradient-to-r from-[var(--gold-dim,#8a7235)] to-[var(--gold,#c9a84c)] rounded-r transition-[width] duration-600 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="font-mono text-[11px] text-[var(--text-dim,#5a5854)]">
        {progress.current} / {progress.total}
      </span>
    </>
  )
}
