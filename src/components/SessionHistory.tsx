"use client"

/**
 * SessionHistory — slide-up panel showing past sessions and named snapshots.
 *
 * Two sections:
 *   Snapshots — named sessions, pinned, never expire
 *   Recent    — last 20 auto sessions, most recent first
 *
 * Tapping a card resumes that session: loads its messages as context,
 * updates the greeting, and reconnects Aria.
 */

import { useEffect, useState } from "react"
import type { SessionRow } from "@/lib/aria-core/state/sqliteSessionStore"
import { sessionStore } from "@/lib/aria"

interface SessionHistoryProps {
  open: boolean
  onClose: () => void
  onResumeSession: (session: SessionRow) => void
}

export function SessionHistory({ open, onClose, onResumeSession }: SessionHistoryProps) {
  const [snapshots, setSnapshots] = useState<SessionRow[]>([])
  const [recent,    setRecent]    = useState<SessionRow[]>([])
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      sessionStore.listSnapshots(),
      sessionStore.listSessions(20),
    ]).then(([snaps, sessions]) => {
      setSnapshots(snaps)
      setRecent(sessions)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: 40 }}
        onClick={onClose}
      />

      {/* Panel — slides up from bottom */}
      <div
        className="glass-strong fixed bottom-0 left-0 right-0 rounded-t-2xl flex flex-col"
        style={{ zIndex: 50, maxHeight: "75dvh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-200">Session History</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/8 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {loading && (
            <p className="text-xs text-zinc-600 text-center py-6">Loading…</p>
          )}

          {!loading && snapshots.length === 0 && recent.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-6">
              No sessions yet. Start a conversation and disconnect to create one.
            </p>
          )}

          {/* Snapshots */}
          {!loading && snapshots.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-2 px-1">
                Snapshots
              </p>
              <div className="space-y-1.5">
                {snapshots.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    isSnapshot
                    onResume={() => { onResumeSession(s); onClose() }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent */}
          {!loading && recent.length > 0 && (
            <section>
              <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-2 px-1">
                Recent
              </p>
              <div className="space-y-1.5">
                {recent.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onResume={() => { onResumeSession(s); onClose() }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

// ── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  isSnapshot = false,
  onResume,
}: {
  session: SessionRow
  isSnapshot?: boolean
  onResume: () => void
}) {
  const date  = formatDate(session.started_at)
  const duration = session.ended_at
    ? formatDuration(session.ended_at - session.started_at)
    : "ongoing"
  const preview = extractPreview(session.summary)

  return (
    <button
      onClick={onResume}
      className="w-full flex items-start gap-3 px-3.5 py-3 rounded-xl text-left hover:bg-white/6 active:bg-white/10 transition-colors border border-transparent hover:border-white/8"
    >
      {/* Icon */}
      <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isSnapshot ? "bg-amber-500/15 text-amber-400" : "bg-violet-500/15 text-violet-400"
      }`}>
        {isSnapshot
          ? <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1L7 4H10.5L7.8 6.2 8.8 9.5 5.5 7.5 2.2 9.5 3.2 6.2.5 4H4L5.5 1Z" fill="currentColor"/></svg>
          : <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3 4h5M3 6h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {isSnapshot && session.snapshot_name && (
            <span className="text-xs font-medium text-amber-300 truncate">{session.snapshot_name}</span>
          )}
          <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{date} · {duration}</span>
        </div>
        <p className="text-xs text-zinc-400 truncate">{preview}</p>
      </div>
    </button>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 1) return "< 1m"
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function extractPreview(summary: string | null): string {
  if (!summary) return "No messages"
  const match = summary.match(/^Started with: "(.+?)"/)
  return match ? match[1].slice(0, 80) : summary.slice(0, 80)
}
