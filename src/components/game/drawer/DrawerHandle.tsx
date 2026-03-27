"use client"

interface Props {
  onClick: () => void
  visible: boolean
}

/** Thin vertical tab on left edge — always visible, tap to open drawer. */
export default function DrawerHandle({ onClick, visible }: Props) {
  if (!visible) return null

  return (
    <button
      onClick={onClick}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-[49] w-4 h-20 flex items-center justify-center cursor-pointer group"
      style={{
        background: "linear-gradient(90deg, var(--bg-surface, #1a1a26) 0%, transparent 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        borderTopRightRadius: "8px",
        borderBottomRightRadius: "8px",
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="w-0.5 h-3 rounded-full bg-[var(--gold-dim,#8a7235)] group-hover:bg-[var(--gold,#c9a84c)] transition-colors" />
        <div className="w-0.5 h-3 rounded-full bg-[var(--gold-dim,#8a7235)] group-hover:bg-[var(--gold,#c9a84c)] transition-colors" />
        <div className="w-0.5 h-3 rounded-full bg-[var(--gold-dim,#8a7235)] group-hover:bg-[var(--gold,#c9a84c)] transition-colors" />
      </div>
    </button>
  )
}
