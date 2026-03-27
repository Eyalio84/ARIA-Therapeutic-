"use client"

import type { GameCompanion } from "@/types/game"

// Emoji by companion type keyword
const COMPANION_EMOJIS: Record<string, string> = {
  jellyfish: "🪼", fish: "🐟", cat: "🐱", dog: "🐕", bird: "🐦",
  drone: "🤖", robot: "🤖", fox: "🦊", owl: "🦉", dragon: "🐉",
  fairy: "🧚", spirit: "👻",
}

function getCompanionEmoji(name: string, desc?: string): string {
  const text = `${name} ${desc || ""}`.toLowerCase()
  for (const [key, emoji] of Object.entries(COMPANION_EMOJIS)) {
    if (text.includes(key)) return emoji
  }
  return "✨"
}

interface Props {
  companion: GameCompanion | null
  bondLevel?: number // 0-5
}

export default function DrawerCompanion({ companion, bondLevel = 3 }: Props) {
  if (!companion) {
    return (
      <div className="text-center py-4">
        <span className="text-2xl opacity-20">🤝</span>
        <p className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] mt-1">No companion</p>
      </div>
    )
  }

  const emoji = getCompanionEmoji(companion.name, companion.description)

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar */}
      <div className="w-14 h-14 rounded-xl border border-[var(--gold-dim,#8a7235)]/20 bg-[var(--bg-surface,#1a1a26)] flex items-center justify-center text-2xl shrink-0 shadow-[0_0_12px_rgba(201,168,76,0.08)]">
        {emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-serif text-sm text-[var(--gold-light,#e4cc7a)] mb-0.5">{companion.name}</div>
        <p className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)] leading-relaxed mb-2">
          {companion.description}
        </p>

        {/* Bond indicator — soft hearts */}
        <div className="flex items-center gap-1">
          <span className="font-mono text-[8px] text-[var(--text-dim,#5a5854)] mr-1">BOND</span>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`text-[10px] transition-all duration-300 ${i <= bondLevel ? "opacity-100" : "opacity-15"}`}
            >
              {i <= bondLevel ? "💛" : "🤍"}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
