"use client"

const LEGEND = [
  { label: "Player", color: "#6ba3d6" },
  { label: "Aria", color: "#c9a84c" },
  { label: "Game", color: "#4a9e8e" },
  { label: "System", color: "#5a5854" },
]

export default function TranscriptLegend() {
  return (
    <div className="flex gap-3 px-4 py-1.5 font-mono text-[9px] tracking-wide border-b border-white/[0.03] shrink-0">
      {LEGEND.map((l) => (
        <span key={l.label} style={{ color: l.color }} className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  )
}
