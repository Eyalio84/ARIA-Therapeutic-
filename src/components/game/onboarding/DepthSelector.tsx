"use client"

const DEPTHS = [
  { id: "quick", label: "Quick", count: "~10 questions" },
  { id: "standard", label: "Custom", count: "~20 questions" },
  { id: "deep", label: "Epic", count: "30+ questions" },
]

interface Props {
  selected: string
  onSelect: (depth: string) => void
}

export default function DepthSelector({ selected, onSelect }: Props) {
  return (
    <div className="flex gap-2">
      {DEPTHS.map((d) => (
        <button
          key={d.id}
          onClick={() => onSelect(d.id)}
          className={`flex-1 rounded-lg p-3 text-center border transition-all duration-300
            ${selected === d.id
              ? "border-[var(--gold,#c9a84c)]/25 text-[var(--gold-light,#e4cc7a)]"
              : "border-white/5 text-[var(--text-secondary,#9a9690)] bg-[var(--bg-surface,#1a1a26)]"
            }`}
        >
          <div className="text-sm font-medium">{d.label}</div>
          <div className="text-[11px] font-mono text-[var(--text-dim,#5a5854)] mt-0.5">{d.count}</div>
        </button>
      ))}
    </div>
  )
}
