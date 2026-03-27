"use client"

interface Props {
  trail: Array<{ question: string; answer: string }>
}

export default function ConversationTrail({ trail }: Props) {
  if (trail.length === 0) return null

  return (
    <div className="mt-4">
      {trail.map((entry, i) => (
        <div key={i} className="mb-4 pb-4 border-b border-white/[0.03]">
          <div className="font-serif text-sm text-[var(--gold-dim,#8a7235)] mb-1">{entry.question}</div>
          <div className="text-sm text-[var(--text-secondary,#9a9690)]">{entry.answer}</div>
        </div>
      ))}
    </div>
  )
}
