"use client"

import { useState } from "react"

interface Props {
  actions: string[]
  onAction: (action: string, target: string) => void
}

const PRIORITY = ["quest", "look"]
const COLLAPSED_COUNT = 4

export default function ActionsBar({ actions, onAction }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (actions.length === 0) return null

  const visible = expanded ? actions : actions.slice(0, COLLAPSED_COUNT)
  const hasMore = actions.length > COLLAPSED_COUNT

  return (
    <div className="border-t border-white/[0.04] bg-[var(--bg-mid,#12121a)] shrink-0">
      <div
        className="flex flex-wrap gap-1.5 px-4 py-2 overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "200px" : "40px" }}
      >
        {visible.map((a) => {
          const parts = a.split(" ")
          const action = parts[0]
          const target = parts.slice(1).join(" ")
          const isPrimary = PRIORITY.some((p) => a.startsWith(p))

          return (
            <button
              key={a}
              onClick={() => onAction(action, target)}
              className={`px-3 py-1 rounded-full font-mono text-[11px] whitespace-nowrap border transition-all duration-200 hover:border-[var(--gold,#c9a84c)]/25 hover:text-[var(--gold-light,#e4cc7a)]
                ${isPrimary
                  ? "border-[var(--gold-dim,#8a7235)] text-[var(--gold,#c9a84c)]"
                  : "border-white/[0.06] text-[var(--text-secondary,#9a9690)] bg-[var(--bg-surface,#1a1a26)]"
                }`}
            >
              {a}
            </button>
          )
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full py-1 flex items-center justify-center gap-1 text-[var(--text-dim,#5a5854)] hover:text-[var(--text-secondary,#9a9690)] transition-colors"
        >
          <svg
            className={`w-3 h-3 fill-current transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
          >
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
          <span className="font-mono text-[9px] tracking-wider">
            {expanded ? "LESS" : `+${actions.length - COLLAPSED_COUNT} MORE`}
          </span>
        </button>
      )}
    </div>
  )
}
