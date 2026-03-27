"use client"

/**
 * db — SQLite WASM singleton for aria-personal.
 *
 * Lazy-initialised on first call to getDb(). Tries OPFS (persistent, requires
 * COOP/COEP headers set in next.config.ts) then falls back to in-memory.
 *
 * All reads/writes go through the AriaDb wrapper which provides typed helpers
 * (run / all / get) that match the query patterns used in sessionAdapter and
 * kgAdapter.
 */

// ── AriaDb wrapper type ───────────────────────────────────────────────────────

/** Typed query helpers used by sessionAdapter and kgAdapter. */
export interface AriaDb {
  /** Execute a data-manipulation statement (INSERT / UPDATE / DELETE / DDL). */
  run(sql: string, params?: unknown[]): void
  /** Execute a SELECT and return all matching rows as T[]. */
  all<T>(sql: string, params?: unknown[]): T[]
  /** Execute a SELECT and return the first row as T, or null if no rows. */
  get<T>(sql: string, params?: unknown[]): T | null
}

// ── Schema ────────────────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT    PRIMARY KEY,
    persona       TEXT    NOT NULL,
    started_at    INTEGER NOT NULL,
    ended_at      INTEGER,
    snapshot_name TEXT,
    summary       TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT    PRIMARY KEY,
    session_id TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT    NOT NULL,
    text       TEXT    NOT NULL,
    ts         INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, ts);

  CREATE TABLE IF NOT EXISTS kg_nodes (
    id              TEXT    PRIMARY KEY,
    type            TEXT    NOT NULL,
    label           TEXT    NOT NULL,
    content         TEXT    NOT NULL,
    embedding       TEXT,
    session_id      TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    intent_keywords TEXT,
    voice_text      TEXT,
    kg_role         TEXT    NOT NULL DEFAULT 'session',
    source_project  TEXT
  );

  CREATE TABLE IF NOT EXISTS kg_edges (
    source   TEXT NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
    target   TEXT NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    weight   REAL NOT NULL DEFAULT 1.0,
    PRIMARY KEY (source, target, relation)
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS kg_fts USING fts5(
    id      UNINDEXED,
    label,
    content,
    tokenize = 'porter unicode61'
  );
`

// ── Singleton ─────────────────────────────────────────────────────────────────

let _db: AriaDb | null = null
let _initPromise: Promise<AriaDb> | null = null

// ── Init ──────────────────────────────────────────────────────────────────────

async function initDb(): Promise<AriaDb> {
  // Dynamic import avoids bundling SQLite WASM into the initial chunk
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: initSqlite } = await import("@sqlite.org/sqlite-wasm") as any

  // Suppress SQLite's verbose stdout/stderr
  const sqlite3 = await initSqlite({
    print:    () => {},
    printErr: () => {},
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawDb: any
  try {
    if (sqlite3.opfs) {
      rawDb = new sqlite3.oo1.OpfsDb("/aria/aria.db", "ct")
    } else {
      rawDb = new sqlite3.oo1.DB(":memory:", "ct")
    }
  } catch {
    rawDb = new sqlite3.oo1.DB(":memory:", "ct")
  }

  rawDb.exec(SCHEMA)

  // Idempotent migrations for existing DBs — SQLite errors if column already exists
  const kgMigrations = [
    "ALTER TABLE kg_nodes ADD COLUMN intent_keywords TEXT",
    "ALTER TABLE kg_nodes ADD COLUMN voice_text TEXT",
    "ALTER TABLE kg_nodes ADD COLUMN kg_role TEXT NOT NULL DEFAULT 'session'",
    "ALTER TABLE kg_nodes ADD COLUMN source_project TEXT",
  ]
  for (const stmt of kgMigrations) {
    try { rawDb.exec(stmt) } catch { /* column already exists — safe to ignore */ }
  }

  const db: AriaDb = {
    run(sql, params) {
      rawDb.exec({ sql, bind: params })
    },
    all<T>(sql: string, params?: unknown[]): T[] {
      const rows: T[] = []
      rawDb.exec({
        sql,
        bind:     params,
        rowMode:  "object",
        callback: (row: T) => { rows.push(row) },
      })
      return rows
    },
    get<T>(sql: string, params?: unknown[]): T | null {
      const rows: T[] = []
      rawDb.exec({
        sql,
        bind:     params,
        rowMode:  "object",
        callback: (row: T) => { rows.push(row) },
      })
      return rows[0] ?? null
    },
  }

  return db
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getDb(): Promise<AriaDb> {
  if (_db) return _db
  if (_initPromise) return _initPromise

  _initPromise = initDb().then((db) => {
    _db = db
    return db
  })

  return _initPromise
}

/** Reset singleton — used in tests to get a fresh in-memory DB. */
export function resetDb(): void {
  _db = null
  _initPromise = null
}
