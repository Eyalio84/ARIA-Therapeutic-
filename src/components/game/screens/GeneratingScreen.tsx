"use client"

export default function GeneratingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[var(--bg-deep,#0a0a0f)]">
      <h2 className="font-serif text-[22px] text-[var(--gold-light,#e4cc7a)] mb-2">Crafting your world...</h2>
      <p className="text-[var(--text-secondary,#9a9690)] text-sm mb-8">Aria is building your adventure from everything you shared.</p>
      <div className="w-10 h-10 border-2 border-white/[0.06] border-t-[var(--gold,#c9a84c)] rounded-full animate-spin" />
    </div>
  )
}
