"use client"

import { useMemo } from "react"

interface Props {
  text: string
  className?: string
}

/** Renders narrative text with **bold** markdown safely — no innerHTML, pure React elements. */
export default function NarrativeText({ text, className }: Props) {
  const parts = useMemo(() => text.split(/\*\*(.*?)\*\*/g), [text])

  return (
    <div className={`font-mono text-sm font-light leading-relaxed text-[var(--text-primary,#e8e4dc)] whitespace-pre-wrap ${className ?? ""}`}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-[var(--gold-light,#e4cc7a)] font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  )
}
