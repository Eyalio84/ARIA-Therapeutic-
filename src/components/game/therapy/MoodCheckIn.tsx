"use client"

import { useState } from "react"
import { useDashboardStore } from "@/store/dashboard"
import { useGameStore } from "@/store/game"
import { MOOD_LABELS } from "@/types/dashboard"

interface MoodCheckInProps {
  /** "start" = beginning of session, "end" = end of session */
  phase: "start" | "end"
  sessionId: string
  onComplete: () => void
}

/**
 * Mood Check-In — 1-5 weather-themed mood selector.
 *
 * Shown at session start and end. Posts to dashboard API.
 * The therapist sees mood velocity across sessions.
 */
export function MoodCheckIn({ phase, sessionId, onComplete }: MoodCheckInProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const userId = useGameStore((s) => s.userId)
  const recordMood = useDashboardStore((s) => s.recordMood)

  const handleSubmit = async () => {
    if (!selected || !userId) return
    setSubmitting(true)
    try {
      if (phase === "start") {
        await recordMood(userId, sessionId, selected, undefined)
      } else {
        await recordMood(userId, sessionId, undefined, selected)
      }
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  const prompt = phase === "start"
    ? "How are you feeling right now?"
    : "How are you feeling after this session?"

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
      padding: "2rem 1.5rem",
      background: "rgba(0,0,0,0.3)",
      borderRadius: "1rem",
      backdropFilter: "blur(10px)",
      maxWidth: "24rem",
      margin: "0 auto",
    }}>
      <p style={{
        fontSize: "1.1rem",
        color: "var(--text-primary, #e0e0e0)",
        textAlign: "center",
        margin: 0,
      }}>
        {prompt}
      </p>

      <div style={{
        display: "flex",
        gap: "0.5rem",
        justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {MOOD_LABELS.map((mood) => (
          <button
            key={mood.value}
            onClick={() => setSelected(mood.value)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.75rem",
              border: selected === mood.value
                ? "2px solid var(--accent, #ffd700)"
                : "2px solid transparent",
              borderRadius: "0.75rem",
              background: selected === mood.value
                ? "rgba(255,215,0,0.15)"
                : "rgba(255,255,255,0.05)",
              cursor: "pointer",
              transition: "all 0.2s",
              minWidth: "3.5rem",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{mood.emoji}</span>
            <span style={{
              fontSize: "0.65rem",
              color: selected === mood.value
                ? "var(--accent, #ffd700)"
                : "var(--text-secondary, #999)",
              textAlign: "center",
              lineHeight: 1.2,
            }}>
              {mood.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected || submitting}
        style={{
          padding: "0.6rem 2rem",
          borderRadius: "0.5rem",
          border: "none",
          background: selected
            ? "var(--accent, #ffd700)"
            : "rgba(255,255,255,0.1)",
          color: selected ? "#1a1a1a" : "#666",
          fontWeight: 600,
          cursor: selected ? "pointer" : "default",
          opacity: submitting ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        {submitting ? "Saving..." : phase === "start" ? "Let's begin" : "Done"}
      </button>

      <button
        onClick={onComplete}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary, #666)",
          fontSize: "0.8rem",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Skip
      </button>
    </div>
  )
}
