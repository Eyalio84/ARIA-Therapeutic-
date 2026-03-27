"use client"

import { useState } from "react"

// Emoji mapping by item name keywords
const ITEM_EMOJIS: Record<string, string> = {
  keepsake: "💎", map: "🗺️", torn: "🗺️", companion: "🎁", gift: "🎁",
  courage: "🔮", stone: "🔮", crystal: "✨", key: "🗝️", book: "📖",
  shell: "🐚", feather: "🪶", lantern: "🏮", compass: "🧭", letter: "📜",
  potion: "🧪", ring: "💍", mirror: "🪞", seed: "🌱", star: "⭐",
  find: "✨", special: "✨",
}

function getEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return "📦"
}

interface Item {
  id: string
  name: string
  description: string
}

interface Props {
  items: Item[]
  onUse?: (itemId: string) => void
}

export default function DrawerInventory({ items, onUse }: Props) {
  const [inspecting, setInspecting] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-2xl opacity-20">🎒</span>
        <p className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] mt-1">No items yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const isInspecting = inspecting === item.id
        return (
          <div key={item.id} className="flex flex-col items-center">
            <button
              onClick={() => setInspecting(isInspecting ? null : item.id)}
              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all duration-200
                ${isInspecting
                  ? "border-[var(--gold,#c9a84c)]/30 bg-[var(--gold,#c9a84c)]/[0.08] scale-105"
                  : "border-white/[0.06] bg-[var(--bg-surface,#1a1a26)] hover:border-[var(--gold-dim,#8a7235)] hover:bg-[var(--bg-elevated,#222233)]"
                }`}
            >
              <span className="text-xl">{getEmoji(item.name)}</span>
              <span className="font-mono text-[8px] text-[var(--text-secondary,#9a9690)] text-center leading-tight px-1 truncate w-full">
                {item.name}
              </span>
            </button>
            {/* Inspection panel */}
            {isInspecting && (
              <div className="col-span-3 w-full mt-1 p-2 rounded-lg bg-[var(--bg-elevated,#222233)] border border-[var(--gold-dim,#8a7235)]/20 animate-[fadeSlideUp_0.2s_ease]">
                <p className="font-mono text-[10px] text-[var(--text-secondary,#9a9690)] leading-relaxed">{item.description}</p>
                {onUse && (
                  <button
                    onClick={() => onUse(item.id)}
                    className="mt-1.5 w-full py-1 rounded-md font-mono text-[9px] border border-[var(--teal,#4a9e8e)]/30 text-[var(--teal,#4a9e8e)] hover:bg-[var(--teal,#4a9e8e)]/10 transition-colors"
                  >
                    Use
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
