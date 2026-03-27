"use client"

interface Props {
  onClose: () => void
}

export default function TranscriptHeader({ onClose }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
      <span className="font-serif text-lg text-[var(--teal,#4a9e8e)]">Session Transcript</span>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-[var(--text-secondary,#9a9690)] text-lg hover:border-[var(--rose,#c47a7a)] hover:text-[var(--rose,#c47a7a)] transition-colors"
      >
        x
      </button>
    </div>
  )
}
