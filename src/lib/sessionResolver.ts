"use client"

/**
 * sessionResolver — auto-resume logic for Aria sessions.
 *
 * Functions are designed with injected dependencies so they can be tested
 * without pulling in the full aria.ts module.
 */

import type { SessionRow, MessageRow } from "./aria-core/state/sqliteSessionStore"

const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Resume candidate ────────────────────────────────────────────────────────

/**
 * Find the most recent ended session within the 24h window.
 * Excludes snapshots (those are explicitly managed by the user).
 */
export async function findResumeCandidate(
  listSessions: (limit: number) => Promise<SessionRow[]>,
): Promise<SessionRow | null> {
  const sessions = await listSessions(5)
  for (const s of sessions) {
    if (!s.ended_at) continue
    if (s.snapshot_name) continue
    if (Date.now() - s.ended_at <= RESUME_WINDOW_MS) return s
  }
  return null
}

// ── Context block ───────────────────────────────────────────────────────────

/**
 * Build a formatted context block from a session's recent messages.
 * Injected into the system prompt as a ContextInjector block.
 */
export function buildResumeContext(
  session: SessionRow,
  messages: MessageRow[],
): string {
  const dateStr = formatSessionDate(session.started_at)
  const lines: string[] = [`[Previous session — ${dateStr}]`]

  for (const msg of messages) {
    if (msg.role === "system") continue
    const speaker = msg.role === "user" ? "User" : "Aria"
    lines.push(`${speaker}: ${msg.text.slice(0, 120)}`)
  }

  if (session.summary) {
    lines.push(`Summary: ${session.summary}`)
  }

  return lines.join("\n")
}

// ── Greeting interpolation ──────────────────────────────────────────────────

/**
 * Replace {{last_topic}} in the persona's returning greeting template.
 * Extracted from the session summary first sentence.
 */
export function getReturningGreeting(template: string, session: SessionRow): string {
  const lastTopic = extractTopic(session.summary)
  return template.replace("{{last_topic}}", lastTopic)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatSessionDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function extractTopic(summary: string | null): string {
  if (!summary) return "our last conversation"
  // Summary format: `Started with: "...topic...". N exchanges.`
  const match = summary.match(/^Started with: "(.+?)"/)
  if (match) return match[1].slice(0, 60)
  return summary.slice(0, 60)
}
