"""
Game Persistence — SQLite per-user database.

Each user gets: data/users/{user_id}/game.db
3 tables: saves, transcripts, aria_context
All scoped by game_id within a user's DB.
"""

import sqlite3
import json
import os
import time
from typing import Optional
from dataclasses import dataclass, asdict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "users")

SCHEMA = """
CREATE TABLE IF NOT EXISTS saves (
    save_id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    cartridge_id TEXT,
    title TEXT NOT NULL,
    protagonist TEXT,
    config_json TEXT NOT NULL,
    state_json TEXT NOT NULL,
    player_state_json TEXT DEFAULT '{}',
    narratives_json TEXT DEFAULT '[]',
    location TEXT,
    turn_count INTEGER DEFAULT 0,
    stats_json TEXT DEFAULT '{}',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    entries_json TEXT NOT NULL,
    entry_count INTEGER DEFAULT 0,
    saved_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS aria_context (
    game_id TEXT PRIMARY KEY,
    context_summary TEXT NOT NULL,
    key_events_json TEXT DEFAULT '[]',
    companion_bond INTEGER DEFAULT 3,
    updated_at REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saves_game ON saves(game_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_game ON transcripts(game_id);
"""


@dataclass
class SaveSummary:
    save_id: str
    game_id: str
    cartridge_id: Optional[str]
    title: str
    protagonist: Optional[str]
    location: Optional[str]
    turn_count: int
    stats: dict
    created_at: float
    updated_at: float


class GamePersistence:
    """Per-user SQLite persistence. One DB per user."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.db_dir = os.path.join(DATA_DIR, user_id)
        self.db_path = os.path.join(self.db_dir, "game.db")
        os.makedirs(self.db_dir, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript(SCHEMA)
            # Migration: add session_state_json for full state capture
            try:
                conn.execute("ALTER TABLE saves ADD COLUMN session_state_json TEXT DEFAULT '{}'")
            except Exception:
                pass  # Column already exists

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ── Saves ──

    def save_game(
        self,
        save_id: str,
        game_id: str,
        cartridge_id: Optional[str],
        title: str,
        protagonist: Optional[str],
        config_json: dict,
        player_json: dict,
        narratives: list,
        location: Optional[str],
        turn_count: int,
        stats: dict,
        session_state: Optional[dict] = None,
    ) -> str:
        now = time.time()
        with self._conn() as conn:
            # Add columns if they don't exist (migrations)
            for col in ["player_state_json TEXT DEFAULT '{}'", "session_state_json TEXT DEFAULT '{}'"]:
                try:
                    conn.execute(f"ALTER TABLE saves ADD COLUMN {col}")
                except Exception:
                    pass
            conn.execute(
                """INSERT OR REPLACE INTO saves
                   (save_id, game_id, cartridge_id, title, protagonist, config_json, state_json,
                    player_state_json, narratives_json, location, turn_count, stats_json,
                    session_state_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM saves WHERE save_id=?), ?), ?)""",
                (save_id, game_id, cartridge_id, title, protagonist,
                 json.dumps(config_json), json.dumps(player_json), json.dumps(player_json),
                 json.dumps(narratives), location, turn_count, json.dumps(stats),
                 json.dumps(session_state or {}),
                 save_id, now, now),
            )
        return save_id

    def list_saves(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT save_id, game_id, cartridge_id, title, protagonist, location, turn_count, stats_json, created_at, updated_at FROM saves ORDER BY updated_at DESC"
            ).fetchall()
        return [
            {
                "save_id": r["save_id"],
                "game_id": r["game_id"],
                "cartridge_id": r["cartridge_id"],
                "title": r["title"],
                "protagonist": r["protagonist"],
                "location": r["location"],
                "turn_count": r["turn_count"],
                "stats": json.loads(r["stats_json"]),
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]

    def load_save(self, save_id: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM saves WHERE save_id=?", (save_id,)).fetchone()
        if not row:
            return None
        # Try to get player_state_json, fall back to state_json
        try:
            ps_raw = dict(row).get("player_state_json")
            player_state = json.loads(ps_raw) if ps_raw else json.loads(row["state_json"])
        except (KeyError, TypeError, json.JSONDecodeError):
            player_state = json.loads(row["state_json"])
        # Load session_state if available
        try:
            ss_raw = dict(row).get("session_state_json")
            session_state = json.loads(ss_raw) if ss_raw else {}
        except (KeyError, TypeError, json.JSONDecodeError):
            session_state = {}

        return {
            "save_id": row["save_id"],
            "game_id": row["game_id"],
            "cartridge_id": row["cartridge_id"],
            "title": row["title"],
            "protagonist": row["protagonist"],
            "config": json.loads(row["config_json"]),
            "state": json.loads(row["state_json"]),
            "player_state": player_state,
            "narratives": json.loads(row["narratives_json"]),
            "location": row["location"],
            "turn_count": row["turn_count"],
            "stats": json.loads(row["stats_json"]),
            "session_state": session_state,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def delete_save(self, save_id: str) -> bool:
        with self._conn() as conn:
            cursor = conn.execute("DELETE FROM saves WHERE save_id=?", (save_id,))
        return cursor.rowcount > 0

    # ── Transcripts ──

    def save_transcript(self, game_id: str, entries: list) -> int:
        now = time.time()
        with self._conn() as conn:
            cursor = conn.execute(
                "INSERT INTO transcripts (game_id, entries_json, entry_count, saved_at) VALUES (?, ?, ?, ?)",
                (game_id, json.dumps(entries), len(entries), now),
            )
        return cursor.lastrowid

    def load_transcript(self, game_id: str) -> Optional[list]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT entries_json FROM transcripts WHERE game_id=? ORDER BY saved_at DESC LIMIT 1",
                (game_id,),
            ).fetchone()
        if not row:
            return None
        return json.loads(row["entries_json"])

    def list_transcripts(self, game_id: str) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT id, game_id, entry_count, saved_at FROM transcripts WHERE game_id=? ORDER BY saved_at DESC",
                (game_id,),
            ).fetchall()
        return [dict(r) for r in rows]

    # ── Aria Context ──

    def save_aria_context(self, game_id: str, summary: str, key_events: list, companion_bond: int = 3):
        now = time.time()
        with self._conn() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO aria_context
                   (game_id, context_summary, key_events_json, companion_bond, updated_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (game_id, summary, json.dumps(key_events), companion_bond, now),
            )

    def load_aria_context(self, game_id: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM aria_context WHERE game_id=?", (game_id,)).fetchone()
        if not row:
            return None
        return {
            "game_id": row["game_id"],
            "context_summary": row["context_summary"],
            "key_events": json.loads(row["key_events_json"]),
            "companion_bond": row["companion_bond"],
            "updated_at": row["updated_at"],
        }
