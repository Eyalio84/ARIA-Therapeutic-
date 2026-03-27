"use client"

interface Props {
  vibe: string
  title: string
  description: string
  selected: boolean
  onSelect: (vibe: string) => void
}

export default function VibeCard({ vibe, title, description, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(vibe)}
      className={`relative w-full text-left rounded-xl p-4 border transition-all duration-300 overflow-hidden
        ${selected
          ? "border-[var(--gold,#c9a84c)]/25 bg-[var(--bg-elevated,#222233)] translate-x-1"
          : "border-white/5 bg-[var(--bg-surface,#1a1a26)] hover:border-[var(--gold,#c9a84c)]/25 hover:bg-[var(--bg-elevated,#222233)] hover:translate-x-1"
        }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 ${selected ? "bg-[var(--gold,#c9a84c)] shadow-[0_0_12px_var(--gold,#c9a84c)/15]" : "bg-[var(--gold-dim,#8a7235)]"}`} />
      <h3 className="font-serif text-lg text-[var(--text-primary,#e8e4dc)] mb-1">{title}</h3>
      <p className="text-[13px] text-[var(--text-secondary,#9a9690)] leading-snug">{description}</p>
    </button>
  )
}
