"use client"

import { useState, useEffect, useCallback } from "react"
import { useGameStore } from "@/store/game"
import { useGameThemeStore } from "@/store/gameTheme"
import { useTranscriptStore } from "@/store/transcript"
import * as api from "@/lib/gameApi"
import type { SaveSummary } from "@/lib/gameApi"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onLoadSave: (saveId: string) => void
}

const THEMES = [
  { id: "default", label: "Classic", preview: "🌙" },
  { id: "maya", label: "Ocean Depths", preview: "🌊" },
  { id: "ren", label: "Deep Space", preview: "🚀" },
  { id: "ash", label: "Noir City", preview: "🌫️" },
]

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function BurgerMenu({ isOpen, onClose, onSave, onLoadSave }: Props) {
  const userId = useGameStore((s) => s.userId)
  const gameConfig = useGameStore((s) => s.gameConfig)
  const { themeId, applyTheme } = useGameThemeStore()
  const [saves, setSaves] = useState<SaveSummary[]>([])
  const [showSaves, setShowSaves] = useState(false)

  useEffect(() => {
    if (isOpen) {
      api.listSaves(userId).then(setSaves).catch(() => {})
    }
  }, [isOpen, userId])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed top-0 bottom-0 right-0 z-[140] transition-opacity duration-300 opacity-100"
        style={{ background: "rgba(0,0,0,0.5)", left: "75%" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[139] pointer-events-none bg-black/30" />

      {/* Menu panel */}
      <div
        className="fixed left-0 top-0 bottom-0 z-[141] w-[75%] max-w-[300px] flex flex-col transition-transform duration-300 translate-x-0"
        style={{
          background: "linear-gradient(180deg, var(--bg-deep, #0a0a0f) 0%, var(--bg-mid, #12121a) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transitionTimingFunction: "cubic-bezier(0.32, 0, 0.15, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <span className="font-serif text-base text-[var(--gold,#c9a84c)]">Settings</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-white/[0.08] flex items-center justify-center text-[var(--text-dim,#5a5854)] hover:text-[var(--gold,#c9a84c)] transition-colors text-sm">
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">

          {/* Profile */}
          <div className="mb-5">
            <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Profile</div>
            <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3">
              <div className="font-mono text-[11px] text-[var(--text-secondary,#9a9690)]">User ID</div>
              <div className="font-mono text-[12px] text-[var(--gold-dim,#8a7235)] mt-0.5">{userId}</div>
              {gameConfig && (
                <>
                  <div className="font-mono text-[11px] text-[var(--text-secondary,#9a9690)] mt-2">Playing</div>
                  <div className="font-serif text-[13px] text-[var(--gold-light,#e4cc7a)] mt-0.5">{gameConfig.title}</div>
                </>
              )}
            </div>
          </div>

          {/* Theme */}
          <div className="mb-5">
            <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Theme</div>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTheme(t.id)}
                  className={`rounded-lg p-2.5 border text-center transition-all duration-200
                    ${themeId === t.id
                      ? "border-[var(--gold,#c9a84c)]/30 bg-[var(--gold,#c9a84c)]/[0.08]"
                      : "border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] hover:border-[var(--gold-dim,#8a7235)]"
                    }`}
                >
                  <div className="text-lg mb-0.5">{t.preview}</div>
                  <div className="font-mono text-[9px] text-[var(--text-secondary,#9a9690)]">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Game Actions */}
          <div className="mb-5">
            <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">Game</div>
            <div className="space-y-2">
              <button
                onClick={() => { onSave(); onClose() }}
                className="w-full rounded-lg p-3 border border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] text-left hover:border-[var(--gold-dim,#8a7235)] transition-all flex items-center gap-2"
              >
                <span className="text-base">💾</span>
                <span className="font-mono text-[12px] text-[var(--text-secondary,#9a9690)]">Save Game</span>
              </button>
              <button
                onClick={() => setShowSaves((v) => !v)}
                className="w-full rounded-lg p-3 border border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] text-left hover:border-[var(--gold-dim,#8a7235)] transition-all flex items-center gap-2"
              >
                <span className="text-base">📂</span>
                <span className="font-mono text-[12px] text-[var(--text-secondary,#9a9690)]">Load Game</span>
                {saves.length > 0 && (
                  <span className="ml-auto font-mono text-[9px] text-[var(--gold-dim,#8a7235)] bg-[var(--gold,#c9a84c)]/[0.08] px-1.5 py-0.5 rounded-full">{saves.length}</span>
                )}
              </button>

              {/* Expandable saves list */}
              {showSaves && (
                <div className="space-y-1.5 pl-2 animate-[fadeSlideUp_0.2s_ease]">
                  {saves.length === 0 ? (
                    <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] py-2">No saved games</div>
                  ) : (
                    saves.map((s) => (
                      <button
                        key={s.save_id}
                        onClick={() => { onLoadSave(s.save_id); onClose() }}
                        className="w-full rounded-lg p-2.5 border border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] text-left hover:border-[var(--gold-dim,#8a7235)] transition-all"
                      >
                        <div className="font-serif text-[12px] text-[var(--gold-light,#e4cc7a)]">{s.title}</div>
                        <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] mt-0.5">
                          {s.location && <span>{s.location} · </span>}
                          Turn {s.turn_count} · {timeAgo(s.updated_at)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <button
                onClick={() => { useGameStore.getState().setScreen("onboarding"); onClose() }}
                className="w-full rounded-lg p-3 border border-white/[0.04] bg-[var(--bg-surface,#1a1a26)] text-left hover:border-[var(--rose,#c47a7a)]/30 transition-all flex items-center gap-2"
              >
                <span className="text-base">🏠</span>
                <span className="font-mono text-[12px] text-[var(--text-secondary,#9a9690)]">Exit to Menu</span>
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <div className="font-mono text-[9px] text-[var(--text-dim,#5a5854)] uppercase tracking-widest mb-2">About</div>
            <div className="rounded-lg bg-[var(--bg-surface,#1a1a26)] border border-white/[0.04] p-3">
              <div className="font-serif text-[13px] text-[var(--gold-dim,#8a7235)]">Aria Game Engine</div>
              <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)] mt-1">Working Prototype v0.1</div>
              <div className="font-mono text-[10px] text-[var(--text-dim,#5a5854)]">Built by Eyal Nof</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 h-1 bg-gradient-to-r from-transparent via-[var(--gold-dim,#8a7235)]/20 to-transparent" />
      </div>
    </>
  )
}
