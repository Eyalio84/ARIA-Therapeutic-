"""
Therapist Controls — Remote game management for clinical oversight.

Allows the therapist (via dashboard) to:
1. Pause/resume a user's game
2. Inject context into the next session (guidance, prompts)
3. Set disclosure layer limits
4. Request review before Layer 3+ content
5. Send a message to the user through the game

State stored in SQLite alongside dashboard data.
"""

import json
import os
import sqlite3
from typing import Dict, Any, Optional, List
from datetime import datetime


class TherapistControls:
    """
    Therapist remote controls for active game sessions.

    The game frontend polls /api/dashboard/user/{id}/controls to check
    for therapist directives before each turn.
    """

    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "therapist"
        )
        os.makedirs(self.data_dir, exist_ok=True)
        self._db_path = os.path.join(self.data_dir, "controls.db")
        self._conn: Optional[sqlite3.Connection] = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self._db_path)
            self._conn.row_factory = sqlite3.Row
            self._conn.executescript("""
                CREATE TABLE IF NOT EXISTS game_controls (
                    user_id TEXT PRIMARY KEY,
                    paused INTEGER DEFAULT 0,
                    pause_message TEXT DEFAULT '',
                    max_disclosure_layer INTEGER DEFAULT 2,
                    review_required INTEGER DEFAULT 0,
                    injected_context TEXT DEFAULT '',
                    therapist_message TEXT DEFAULT '',
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS control_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT,
                    timestamp TEXT NOT NULL
                );
            """)
        return self._conn

    def _log(self, user_id: str, action: str, details: str = ""):
        self.conn.execute(
            "INSERT INTO control_log (user_id, action, details, timestamp) VALUES (?,?,?,?)",
            (user_id, action, details, datetime.utcnow().isoformat())
        )

    def _ensure_user(self, user_id: str):
        existing = self.conn.execute(
            "SELECT user_id FROM game_controls WHERE user_id = ?", (user_id,)
        ).fetchone()
        if not existing:
            self.conn.execute(
                "INSERT INTO game_controls (user_id, updated_at) VALUES (?,?)",
                (user_id, datetime.utcnow().isoformat())
            )
            self.conn.commit()

    # ── Read ─────────────────────────────────────────────────────

    def get_controls(self, user_id: str) -> Dict[str, Any]:
        """Get current control state for a user (polled by game frontend)."""
        self._ensure_user(user_id)
        row = self.conn.execute(
            "SELECT * FROM game_controls WHERE user_id = ?", (user_id,)
        ).fetchone()
        return dict(row) if row else {}

    def get_log(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get recent control actions for audit."""
        rows = self.conn.execute(
            "SELECT * FROM control_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
            (user_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Pause / Resume ───────────────────────────────────────────

    def pause_game(self, user_id: str, message: str = "Your therapist has paused the session.") -> bool:
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET paused = 1, pause_message = ?, updated_at = ? WHERE user_id = ?",
            (message, datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "pause", message)
        return True

    def resume_game(self, user_id: str) -> bool:
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET paused = 0, pause_message = '', updated_at = ? WHERE user_id = ?",
            (datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "resume")
        return True

    # ── Disclosure Layer Control ─────────────────────────────────

    def set_max_disclosure(self, user_id: str, layer: int) -> bool:
        """Set max disclosure layer (1-4). Layers above this require therapist approval."""
        layer = max(1, min(4, layer))
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET max_disclosure_layer = ?, updated_at = ? WHERE user_id = ?",
            (layer, datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "set_disclosure", f"layer={layer}")
        return True

    def set_review_required(self, user_id: str, required: bool = True) -> bool:
        """Toggle whether therapist must review before Layer 3+ content."""
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET review_required = ?, updated_at = ? WHERE user_id = ?",
            (1 if required else 0, datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "review_required", str(required))
        return True

    # ── Context Injection ────────────────────────────────────────

    def inject_context(self, user_id: str, context: str) -> bool:
        """Inject context for the next game session (guidance for Aria)."""
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET injected_context = ?, updated_at = ? WHERE user_id = ?",
            (context, datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "inject_context", context[:100])
        return True

    def consume_context(self, user_id: str) -> str:
        """Read and clear injected context (called by game at session start)."""
        row = self.conn.execute(
            "SELECT injected_context FROM game_controls WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row and row["injected_context"]:
            context = row["injected_context"]
            self.conn.execute(
                "UPDATE game_controls SET injected_context = '', updated_at = ? WHERE user_id = ?",
                (datetime.utcnow().isoformat(), user_id)
            )
            self.conn.commit()
            return context
        return ""

    # ── Therapist Message ────────────────────────────────────────

    def send_message(self, user_id: str, message: str) -> bool:
        """Send a message to the user (shown in game as a gentle notification)."""
        self._ensure_user(user_id)
        self.conn.execute(
            "UPDATE game_controls SET therapist_message = ?, updated_at = ? WHERE user_id = ?",
            (message, datetime.utcnow().isoformat(), user_id)
        )
        self.conn.commit()
        self._log(user_id, "message", message[:100])
        return True

    def consume_message(self, user_id: str) -> str:
        """Read and clear therapist message (polled by game)."""
        row = self.conn.execute(
            "SELECT therapist_message FROM game_controls WHERE user_id = ?", (user_id,)
        ).fetchone()
        if row and row["therapist_message"]:
            msg = row["therapist_message"]
            self.conn.execute(
                "UPDATE game_controls SET therapist_message = '', updated_at = ? WHERE user_id = ?",
                (datetime.utcnow().isoformat(), user_id)
            )
            self.conn.commit()
            return msg
        return ""

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None
