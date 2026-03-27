"use client"

import type { InterviewQuestion } from "@/types/game"

const PHASE_NAMES: Record<string, string> = {
  warmup: "GETTING TO KNOW YOU",
  character: "YOUR CHARACTER",
  world: "YOUR WORLD",
  story: "YOUR STORY",
  challenges: "YOUR CHALLENGES",
  choices: "YOUR CHOICES",
}

interface Props {
  question: InterviewQuestion | null
}

export default function AriaMessage({ question }: Props) {
  if (!question) return <div className="font-serif text-xl text-[var(--gold-light,#e4cc7a)]">Loading...</div>

  return (
    <div>
      <div className="font-mono text-[10px] tracking-[1.5px] uppercase text-[var(--gold-dim,#8a7235)] mb-3">
        {PHASE_NAMES[question.phase] || question.phase.toUpperCase()}
      </div>
      <div className="font-serif text-xl leading-relaxed text-[var(--gold-light,#e4cc7a)] mb-6 animate-[fadeSlideUp_0.5s_ease]">
        {question.text}
      </div>
    </div>
  )
}
