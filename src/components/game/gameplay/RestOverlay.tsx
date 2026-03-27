"use client"

interface Props {
  visible: boolean
  message?: string
  onContinue: () => void
  onSave: () => void
}

export default function RestOverlay({ visible, message, onContinue, onSave }: Props) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]/[0.92] z-[200] flex flex-col items-center justify-center p-4 animate-[fadeIn_0.6s_ease]">
      <div className="text-center max-w-[320px]">
        <h2 className="font-serif text-2xl text-[var(--gold-light,#e4cc7a)] mb-3">A moment of rest</h2>
        <p className="text-[var(--text-secondary,#9a9690)] text-sm mb-6 leading-relaxed">
          {message || "Your character finds a quiet moment. The journey will be here when you return."}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onContinue}
            className="px-6 py-3.5 rounded-xl text-sm border border-[var(--gold-dim,#8a7235)] text-[var(--gold-light,#e4cc7a)] bg-[var(--gold,#c9a84c)]/[0.15] hover:bg-[var(--gold,#c9a84c)]/25 transition-all"
          >
            Keep playing
          </button>
          <button
            onClick={onSave}
            className="px-6 py-3.5 rounded-xl text-sm border border-white/[0.08] text-[var(--text-secondary,#9a9690)] hover:border-white/20 transition-all"
          >
            Save &amp; rest
          </button>
        </div>
      </div>
    </div>
  )
}
