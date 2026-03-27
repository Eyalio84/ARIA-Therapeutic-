"use client"

interface Props {
  onExport: () => void
  onClear: () => void
}

export default function TranscriptFooter({ onExport, onClear }: Props) {
  return (
    <div className="px-4 py-2 border-t border-white/[0.04] flex gap-2 shrink-0">
      <button
        onClick={onExport}
        className="flex-1 py-2 bg-[var(--bg-surface,#1a1a26)] border border-white/[0.06] rounded-lg font-mono text-[11px] text-[var(--text-secondary,#9a9690)] text-center hover:border-[var(--teal,#4a9e8e)] hover:text-[var(--teal,#4a9e8e)] transition-all"
      >
        Export JSON
      </button>
      <button
        onClick={onClear}
        className="flex-1 py-2 bg-[var(--bg-surface,#1a1a26)] border border-white/[0.06] rounded-lg font-mono text-[11px] text-[var(--text-secondary,#9a9690)] text-center hover:border-[var(--rose,#c47a7a)] hover:text-[var(--rose,#c47a7a)] transition-all"
      >
        Clear
      </button>
    </div>
  )
}
