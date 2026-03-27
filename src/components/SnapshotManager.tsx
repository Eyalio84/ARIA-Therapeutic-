"use client"

/**
 * SnapshotManager — inline form to name and save the current session.
 *
 * Appears as a floating card above the chat input when the user types
 * /snapshot or clicks the snapshot menu item. Submitting promotes the
 * current session to a named snapshot that persists indefinitely.
 */

import { useState } from "react"
import { sessionStore, currentSessionId } from "@/lib/aria"

interface SnapshotManagerProps {
  onClose: () => void
}

export function SnapshotManager({ onClose }: SnapshotManagerProps) {
  const [name,    setName]    = useState("")
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    const sessionId = currentSessionId()
    if (!sessionId) {
      setError("No active session to save. Start a conversation first.")
      return
    }
    if (!name.trim()) {
      setError("Enter a name for the snapshot.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      await sessionStore.saveSnapshot(sessionId, name.trim())
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save snapshot.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-4 shadow-2xl border border-white/10">
      {saved ? (
        <div className="flex items-center gap-2 py-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-emerald-400 flex-shrink-0">
            <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm text-emerald-400">Saved as "{name}"</span>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-2.5">
            Save Snapshot
          </p>

          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave()
                if (e.key === "Escape") onClose()
              }}
              placeholder="Name this session…"
              maxLength={60}
              className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              onClick={() => void handleSave()}
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={onClose}
              className="w-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/8 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {error && (
            <p className="text-[10px] text-red-400 mt-2 px-1">{error}</p>
          )}
        </>
      )}
    </div>
  )
}
