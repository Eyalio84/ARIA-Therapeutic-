"use client"

import type { Cartridge } from "@/types/game"

interface Props {
  cartridge: Cartridge
  onClick: () => void
}

export default function CartridgeCard({ cartridge, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl p-3.5 border border-white/5 bg-[var(--bg-surface,#1a1a26)] transition-all duration-300 hover:border-[var(--gold,#c9a84c)]/25 hover:bg-[var(--bg-elevated,#222233)] hover:translate-x-1"
    >
      <div className="font-serif text-[17px] text-[var(--gold-light,#e4cc7a)] mb-0.5">
        {cartridge.name}
      </div>
      <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] uppercase tracking-wider mb-1">
        Age {cartridge.age}
      </div>
      <div className="text-[13px] text-[var(--text-secondary,#9a9690)] leading-snug">
        {cartridge.tagline}
      </div>
      <div className="font-mono text-[10px] text-[var(--gold-dim,#8a7235)] mt-1">
        {cartridge.tone_hint}
      </div>
    </button>
  )
}
