"use client"

import { useState, type ReactNode } from "react"

interface Props {
  title: string
  icon: string
  defaultOpen?: boolean
  children: ReactNode
  count?: number
}

/** Collapsible section within the game drawer — journal page metaphor. */
export default function DrawerSection({ title, icon, defaultOpen = true, children, count }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-white/[0.04]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left group"
      >
        <span className="text-base">{icon}</span>
        <span className="flex-1 font-serif text-[13px] tracking-wide text-[var(--gold,#c9a84c)] uppercase">
          {title}
        </span>
        {count != null && count > 0 && (
          <span className="font-mono text-[9px] text-[var(--gold-dim,#8a7235)] bg-[var(--gold,#c9a84c)]/[0.08] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
        <svg
          className={`w-3 h-3 fill-[var(--gold-dim,#8a7235)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out"
        style={{ maxHeight: open ? "600px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
