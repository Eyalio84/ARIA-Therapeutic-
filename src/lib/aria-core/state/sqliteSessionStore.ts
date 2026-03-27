/**
 * SqliteSessionStore — session and message persistence for Aria.
 *
 * Manages the lifecycle of conversation sessions: create on connect,
 * append messages as they arrive, close with auto-summary on disconnect.
 * Named snapshots are sessions with a non-null snapshot_name.
 *
 * Architecture:
 *   - SessionAdapter defines the storage contract (host apps implement)
 *   - SqliteSessionStore contains all lifecycle logic
 *   - No direct SQLite dependency — host app provides the adapter
 *
 * This class never imports from @/ — it is host-app-independent.
 */

// ── Row types ───────────────────────────────────────────────────────────────

export type MessageRole = "user" | "aria" | "system"

export interface MessageRow {
  id: string
  session_id: string
  role: MessageRole
  text: string
  ts: number
}

export interface SessionRow {
  id: string
  persona: string
  started_at: number
  ended_at: number | null
  snapshot_name: string | null
  summary: string | null
}

// ── Adapter contract ────────────────────────────────────────────────────────

/**
 * SessionAdapter — the storage interface host apps must implement.
 * aria-core defines it; aria-personal provides the SQLite WASM implementation.
 */
export interface SessionAdapter {
  createSession(id: string, persona: string, startedAt: number): Promise<void>
  closeSession(id: string, endedAt: number, summary: string): Promise<void>
  appendMessage(msg: MessageRow): Promise<void>
  getRecentMessages(sessionId: string, limit: number): Promise<MessageRow[]>
  listSessions(limit: number): Promise<SessionRow[]>
  getSession(id: string): Promise<SessionRow | null>
  saveSnapshot(id: string, name: string): Promise<void>
  listSnapshots(): Promise<SessionRow[]>
  deleteSession(id: string): Promise<void>
}

// ── SqliteSessionStore ───────────────────────────────────────────────────────

export class SqliteSessionStore {
  constructor(private adapter: SessionAdapter) {}

  /** Start a new session. Returns the new session id. */
  async startSession(personaName: string): Promise<string> {
    const id = crypto.randomUUID()
    await this.adapter.createSession(id, personaName, Date.now())
    return id
  }

  /**
   * End a session. Fetches the last 5 messages to generate a short
   * heuristic summary, then persists it.
   */
  async endSession(sessionId: string): Promise<void> {
    const recent = await this.adapter.getRecentMessages(sessionId, 5)
    const summary = buildSummary(recent)
    await this.adapter.closeSession(sessionId, Date.now(), summary)
  }

  /** Append a message to the current session. */
  async appendMessage(
    sessionId: string,
    role: MessageRole,
    text: string,
  ): Promise<void> {
    await this.adapter.appendMessage({
      id:         crypto.randomUUID(),
      session_id: sessionId,
      role,
      text,
      ts:         Date.now(),
    })
  }

  /**
   * Load the last N messages of a session for auto-resume context injection.
   * Returned in chronological order (oldest first).
   */
  async getResumeContext(sessionId: string, limit = 10): Promise<MessageRow[]> {
    return this.adapter.getRecentMessages(sessionId, limit)
  }

  /** List recent non-snapshot sessions, most recent first. */
  async listSessions(limit = 20): Promise<SessionRow[]> {
    return this.adapter.listSessions(limit)
  }

  /** Get a single session by id. */
  async getSession(id: string): Promise<SessionRow | null> {
    return this.adapter.getSession(id)
  }

  /** Promote a session to a named snapshot. Snapshots are never auto-expired. */
  async saveSnapshot(sessionId: string, name: string): Promise<void> {
    await this.adapter.saveSnapshot(sessionId, name)
  }

  /** List all named snapshots. */
  async listSnapshots(): Promise<SessionRow[]> {
    return this.adapter.listSnapshots()
  }

  /** Delete a session (and all its messages via ON DELETE CASCADE). */
  async deleteSession(id: string): Promise<void> {
    await this.adapter.deleteSession(id)
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a 1-2 sentence heuristic summary from recent messages.
 * Takes the first user message as the topic, counts exchanges.
 * A future cycle can replace this with an LLM call.
 */
function buildSummary(messages: MessageRow[]): string {
  const userMessages = messages.filter((m) => m.role === "user")
  if (userMessages.length === 0) return "Session with no user messages."

  const topic = userMessages[0].text.slice(0, 80).replace(/\n/g, " ")
  const count = messages.filter((m) => m.role !== "system").length
  const exchanges = Math.floor(count / 2)

  return `Started with: "${topic}". ${exchanges} exchange${exchanges !== 1 ? "s" : ""}.`
}
