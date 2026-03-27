"use client"

/**
 * sessionAdapter — SQLite WASM implementation of SessionAdapter.
 *
 * Implements the SessionAdapter interface from aria-core using the
 * AriaDb singleton from db.ts. All SQL is in this file; aria-core
 * knows nothing about SQLite.
 */

import type { SessionAdapter, MessageRow, SessionRow } from "./aria-core/state/sqliteSessionStore"
import { getDb } from "./db"

export const sessionAdapter: SessionAdapter = {
  async createSession(id, persona, startedAt) {
    const db = await getDb()
    db.run(
      "INSERT INTO sessions (id, persona, started_at) VALUES (?, ?, ?)",
      [id, persona, startedAt],
    )
  },

  async closeSession(id, endedAt, summary) {
    const db = await getDb()
    db.run(
      "UPDATE sessions SET ended_at = ?, summary = ? WHERE id = ?",
      [endedAt, summary, id],
    )
  },

  async appendMessage(msg) {
    const db = await getDb()
    db.run(
      "INSERT INTO messages (id, session_id, role, text, ts) VALUES (?, ?, ?, ?, ?)",
      [msg.id, msg.session_id, msg.role, msg.text, msg.ts],
    )
  },

  async getRecentMessages(sessionId, limit) {
    const db = await getDb()
    // Fetch the N most recent, then reverse to get chronological order
    const rows = db.all<MessageRow>(
      `SELECT id, session_id, role, text, ts
         FROM messages
        WHERE session_id = ?
        ORDER BY ts DESC
        LIMIT ?`,
      [sessionId, limit],
    )
    return rows.reverse()
  },

  async listSessions(limit) {
    const db = await getDb()
    return db.all<SessionRow>(
      `SELECT id, persona, started_at, ended_at, snapshot_name, summary
         FROM sessions
        WHERE snapshot_name IS NULL
        ORDER BY started_at DESC
        LIMIT ?`,
      [limit],
    )
  },

  async getSession(id) {
    const db = await getDb()
    return db.get<SessionRow>(
      "SELECT id, persona, started_at, ended_at, snapshot_name, summary FROM sessions WHERE id = ?",
      [id],
    )
  },

  async saveSnapshot(id, name) {
    const db = await getDb()
    db.run("UPDATE sessions SET snapshot_name = ? WHERE id = ?", [name, id])
  },

  async listSnapshots() {
    const db = await getDb()
    return db.all<SessionRow>(
      `SELECT id, persona, started_at, ended_at, snapshot_name, summary
         FROM sessions
        WHERE snapshot_name IS NOT NULL
        ORDER BY started_at DESC`,
    )
  },

  async deleteSession(id) {
    const db = await getDb()
    db.run("DELETE FROM sessions WHERE id = ?", [id])
  },
}
