"use client"

import { useEffect, useState } from "react"
import { useDashboardStore } from "@/store/dashboard"

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", border: "rgba(96,165,250,0.2)" },
  attention: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  concern: { bg: "rgba(249,115,22,0.1)", text: "#f97316", border: "rgba(249,115,22,0.2)" },
  urgent: { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.2)" },
}

export function FlagsNotesTab() {
  const { userId, flags, notes, fetchFlags, fetchNotes, annotateFlag, addNote } = useDashboardStore()
  const [annotatingId, setAnnotatingId] = useState<string | null>(null)
  const [annotationText, setAnnotationText] = useState("")
  const [newNote, setNewNote] = useState({ target_type: "session", target_id: "", note: "" })
  const [showAddNote, setShowAddNote] = useState(false)

  useEffect(() => {
    if (userId) { fetchFlags(userId); fetchNotes(userId) }
  }, [userId, fetchFlags, fetchNotes])

  const handleAnnotate = async () => {
    if (annotatingId && annotationText.trim()) {
      await annotateFlag(annotatingId, annotationText)
      setAnnotatingId(null)
      setAnnotationText("")
    }
  }

  const handleAddNote = async () => {
    if (userId && newNote.note.trim()) {
      await addNote(userId, {
        target_type: newNote.target_type,
        target_id: newNote.target_id || "general",
        note: newNote.note,
      })
      setNewNote({ target_type: "session", target_id: "", note: "" })
      setShowAddNote(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Flags section */}
      <section>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Flagged Moments ({flags.length})
        </h3>
        {flags.length === 0 ? (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            No flagged moments. The system auto-flags concerning patterns during gameplay.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {flags.map((flag) => {
              const sev = SEVERITY_COLORS[flag.severity] || SEVERITY_COLORS.info
              return (
                <div key={flag.id} className="rounded-xl p-3"
                  style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ background: `${sev.text}22`, color: sev.text }}>
                          {flag.severity}
                        </span>
                        <span className="text-xs text-zinc-500">{flag.category}</span>
                      </div>
                      <p className="text-sm text-zinc-300">{flag.description}</p>
                      {flag.user_content && (
                        <p className="text-xs text-zinc-500 mt-1 italic">
                          &ldquo;{flag.user_content}&rdquo;
                        </p>
                      )}
                      {flag.therapist_note && (
                        <div className="mt-2 text-xs px-2 py-1 rounded"
                          style={{ background: "rgba(201,169,110,0.1)", color: "#c9a96e" }}>
                          Therapist note: {flag.therapist_note}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-zinc-600">
                        {new Date(flag.timestamp).toLocaleDateString()}
                      </span>
                      {!flag.therapist_note && (
                        <button onClick={() => { setAnnotatingId(flag.id); setAnnotationText("") }}
                          className="text-xs underline" style={{ color: "#c9a96e" }}>
                          annotate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline annotation form */}
                  {annotatingId === flag.id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text" value={annotationText}
                        onChange={(e) => setAnnotationText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAnnotate()}
                        placeholder="Add clinical note..."
                        className="flex-1 glass rounded-lg px-3 py-1.5 text-xs outline-none"
                        autoFocus
                      />
                      <button onClick={handleAnnotate}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>
                        Save
                      </button>
                      <button onClick={() => setAnnotatingId(null)}
                        className="text-xs text-zinc-500">Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Notes section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">
            Session Notes ({notes.length})
          </h3>
          <button onClick={() => setShowAddNote(!showAddNote)}
            className="text-xs px-2 py-1 rounded glass hover:bg-white/10">
            {showAddNote ? "Cancel" : "+ Add Note"}
          </button>
        </div>

        {/* Add note form */}
        {showAddNote && (
          <div className="glass rounded-xl p-3 mb-3 flex flex-col gap-2">
            <div className="flex gap-2">
              <select value={newNote.target_type}
                onChange={(e) => setNewNote({ ...newNote, target_type: e.target.value })}
                className="glass rounded-lg px-2 py-1.5 text-xs outline-none bg-transparent">
                <option value="session">Session</option>
                <option value="node">KG Node</option>
                <option value="flag">Flag</option>
                <option value="choice">Choice</option>
              </select>
              <input type="text" value={newNote.target_id}
                onChange={(e) => setNewNote({ ...newNote, target_id: e.target.value })}
                placeholder="Target ID (optional)"
                className="glass rounded-lg px-2 py-1.5 text-xs outline-none flex-1" />
            </div>
            <textarea value={newNote.note}
              onChange={(e) => setNewNote({ ...newNote, note: e.target.value })}
              placeholder="Write your clinical note..."
              className="glass rounded-lg px-3 py-2 text-sm outline-none resize-none"
              rows={2} />
            <button onClick={handleAddNote}
              disabled={!newNote.note.trim()}
              className="self-end text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(201,169,110,0.2)", color: "#c9a96e" }}>
              Save Note
            </button>
          </div>
        )}

        {notes.length === 0 && !showAddNote ? (
          <p className="text-sm text-zinc-500 glass rounded-lg p-4 text-center">
            No therapist notes yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <div key={note.id} className="glass rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">
                    {note.target_type}: {note.target_id}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(note.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{note.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
