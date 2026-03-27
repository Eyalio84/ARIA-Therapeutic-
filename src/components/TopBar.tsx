"use client"

import { useChatStore } from "@/store/chat"

const STATUS_DOT: Record<string, string> = {
  idle:       "bg-zinc-600",
  connecting: "bg-yellow-400 animate-pulse",
  listening:  "bg-violet-400 animate-pulse",
  thinking:   "bg-violet-300 animate-pulse",
  speaking:   "bg-emerald-400 animate-pulse",
}

interface TopBarProps {
  onMenuOpen:    () => void
  onHistoryOpen: () => void
}

export function TopBar({ onMenuOpen, onHistoryOpen }: TopBarProps) {
  const status = useChatStore((s) => s.status)

  return (
    <div className="glass flex-shrink-0 flex items-center justify-between px-5 h-14" style={{ zIndex: 10 }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <span className="text-violet-300 text-xs font-bold">A</span>
        </div>
        <span className="text-sm font-semibold text-zinc-100 tracking-wide">Aria</span>
        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-zinc-600"}`} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* History */}
        <button
          onClick={onHistoryOpen}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/8 active:bg-white/12 transition-colors"
          aria-label="Session history"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Settings */}
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-white/8 active:bg-white/12 transition-colors"
          aria-label="Open settings"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <rect y="0"  width="18" height="1.5" rx="1" fill="currentColor"/>
            <rect y="6"  width="13" height="1.5" rx="1" fill="currentColor"/>
            <rect y="12" width="18" height="1.5" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
