#!/usr/bin/env python3
"""
Build Therapy Knowledge Graph — Per-user SQLite KG factory.

Each user gets their own SQLite database. The KG grows every session as
Aria extracts concerns, emotions, triggers, coping strategies, media
preferences, breakthroughs, and goals from conversation.

Schema: "standard" profile (compatible with NAI KGManager).
  nodes(id, name, description, type, ...)
  edges(source, target, type, weight, ...)

Node types: concern, emotion, media, coping, breakthrough, trigger, goal, session
Edge types: triggers, helps_with, analogy_for, progressed, explored_in,
            feels_like, leads_to, resolved_by, connected_to

Emergent Insight #1: "The User IS the KG"
  The graph IS the therapy record. No separate database, no profile table.
  Export = copy the file. Load = point NAI at it.
"""

import sqlite3
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# Default storage directory for user KGs
THERAPY_DATA_DIR = os.path.join(os.path.dirname(__file__), "therapy")


# ── Schema ──────────────────────────────────────────────────────────

SCHEMA_SQL = """
    -- Standard profile: nodes + edges (NAI KGManager compatible)
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        intensity REAL DEFAULT 0.5,
        first_session TEXT,
        last_session TEXT,
        session_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        intent_keywords TEXT,
        metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS edges (
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        session_id TEXT,
        created_at TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source) REFERENCES nodes(id),
        FOREIGN KEY (target) REFERENCES nodes(id)
    );

    -- Sessions table — tracks conversation sessions
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        summary TEXT,
        mood_start REAL,
        mood_end REAL,
        node_count_start INTEGER DEFAULT 0,
        node_count_end INTEGER DEFAULT 0
    );

    -- Indexes for fast traversal
    CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
    CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);
    CREATE INDEX IF NOT EXISTS idx_edges_session ON edges(session_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_intensity ON nodes(intensity);

    -- FTS5 for text search across nodes
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        id, name, description, intent_keywords,
        content=nodes, content_rowid=rowid
    );

    -- Triggers to keep FTS in sync
    CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
        INSERT INTO nodes_fts(rowid, id, name, description, intent_keywords)
        VALUES (new.rowid, new.id, new.name, new.description, new.intent_keywords);
    END;

    CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
        INSERT INTO nodes_fts(nodes_fts, rowid, id, name, description, intent_keywords)
        VALUES ('delete', old.rowid, old.id, old.name, old.description, old.intent_keywords);
    END;

    CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
        INSERT INTO nodes_fts(nodes_fts, rowid, id, name, description, intent_keywords)
        VALUES ('delete', old.rowid, old.id, old.name, old.description, old.intent_keywords);
        INSERT INTO nodes_fts(rowid, id, name, description, intent_keywords)
        VALUES (new.rowid, new.id, new.name, new.description, new.intent_keywords);
    END;
"""

# Valid node types
NODE_TYPES = {"concern", "emotion", "media", "coping", "breakthrough", "trigger", "goal", "session"}

# Valid edge types
EDGE_TYPES = {
    "triggers",        # trigger → concern (anxiety triggers work_stress)
    "helps_with",      # coping → concern (meditation helps_with anxiety)
    "analogy_for",     # media → concern (LOTR analogy_for perseverance)
    "progressed",      # concern → concern (anxiety 0.7 → anxiety 0.3)
    "explored_in",     # node → session (discussed in this session)
    "feels_like",      # concern → emotion (work_stress feels_like overwhelm)
    "leads_to",        # trigger → emotion (deadline leads_to panic)
    "resolved_by",     # concern → breakthrough (anxiety resolved_by cbt_technique)
    "connected_to",    # generic — two nodes are related
}


# ── TherapyKG Class ─────────────────────────────────────────────────

class TherapyKG:
    """
    Per-user therapy knowledge graph.

    Each instance manages one user's SQLite KG. The graph grows as
    the user converses with Aria — new nodes and edges are extracted
    from each session.
    """

    def __init__(self, user_id: str, data_dir: str = THERAPY_DATA_DIR):
        self.user_id = user_id
        self.data_dir = data_dir
        self.db_path = os.path.join(data_dir, f"user_{user_id}.db")
        self._conn: Optional[sqlite3.Connection] = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            os.makedirs(self.data_dir, exist_ok=True)
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA foreign_keys=ON")
            self._conn.executescript(SCHEMA_SQL)
        return self._conn

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None

    # ── Node Operations ─────────────────────────────────────────────

    def add_node(self, name: str, node_type: str, description: str = "",
                 intensity: float = 0.5, session_id: str = None,
                 intent_keywords: str = "", metadata: str = None) -> str:
        """
        Add a node to the user's KG. Returns the node ID.

        If a node with the same name and type exists, updates it instead.
        """
        if node_type not in NODE_TYPES:
            raise ValueError(f"Invalid node type '{node_type}'. Must be one of: {NODE_TYPES}")

        intensity = max(0.0, min(1.0, intensity))
        now = datetime.utcnow().isoformat()

        # Check for existing node (same name + type)
        existing = self.conn.execute(
            "SELECT id, session_count FROM nodes WHERE name = ? AND type = ?",
            (name, node_type)
        ).fetchone()

        if existing:
            # Update existing node
            self.conn.execute(
                "UPDATE nodes SET intensity = ?, last_session = ?, "
                "session_count = session_count + 1, updated_at = ?, "
                "description = CASE WHEN ? != '' THEN ? ELSE description END "
                "WHERE id = ?",
                (intensity, session_id, now, description, description, existing["id"])
            )
            self.conn.commit()
            return existing["id"]

        # Create new node
        node_id = f"{node_type}_{uuid.uuid4().hex[:8]}"
        self.conn.execute(
            "INSERT INTO nodes (id, name, description, type, intensity, "
            "first_session, last_session, session_count, created_at, updated_at, "
            "intent_keywords, metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (node_id, name, description, node_type, intensity,
             session_id, session_id, 1, now, now, intent_keywords, metadata)
        )
        self.conn.commit()
        return node_id

    def update_node(self, node_id: str, **kwargs) -> bool:
        """Update specific fields on a node. Returns True if found."""
        allowed = {"name", "description", "intensity", "last_session",
                    "intent_keywords", "metadata"}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False

        updates["updated_at"] = datetime.utcnow().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [node_id]

        cursor = self.conn.execute(
            f"UPDATE nodes SET {set_clause} WHERE id = ?", values
        )
        self.conn.commit()
        return cursor.rowcount > 0

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get a single node by ID."""
        row = self.conn.execute("SELECT * FROM nodes WHERE id = ?", (node_id,)).fetchone()
        return dict(row) if row else None

    def get_nodes_by_type(self, node_type: str) -> List[Dict[str, Any]]:
        """Get all nodes of a specific type."""
        rows = self.conn.execute(
            "SELECT * FROM nodes WHERE type = ? ORDER BY intensity DESC",
            (node_type,)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_active_concerns(self, threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Get concerns with intensity above threshold (active issues)."""
        rows = self.conn.execute(
            "SELECT * FROM nodes WHERE type = 'concern' AND intensity >= ? "
            "ORDER BY intensity DESC",
            (threshold,)
        ).fetchall()
        return [dict(r) for r in rows]

    def search_nodes(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Full-text search across node names, descriptions, and keywords."""
        rows = self.conn.execute(
            "SELECT n.* FROM nodes_fts f JOIN nodes n ON f.id = n.id "
            "WHERE nodes_fts MATCH ? LIMIT ?",
            (query, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    def delete_node(self, node_id: str) -> bool:
        """Delete a node and its connected edges."""
        self.conn.execute("DELETE FROM edges WHERE source = ? OR target = ?", (node_id, node_id))
        cursor = self.conn.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
        self.conn.commit()
        return cursor.rowcount > 0

    # ── Edge Operations ─────────────────────────────────────────────

    def add_edge(self, source: str, target: str, edge_type: str,
                 weight: float = 1.0, session_id: str = None,
                 metadata: str = None) -> bool:
        """Add an edge between two nodes. Returns True if successful."""
        if edge_type not in EDGE_TYPES:
            raise ValueError(f"Invalid edge type '{edge_type}'. Must be one of: {EDGE_TYPES}")

        # Verify both nodes exist
        src = self.conn.execute("SELECT id FROM nodes WHERE id = ?", (source,)).fetchone()
        tgt = self.conn.execute("SELECT id FROM nodes WHERE id = ?", (target,)).fetchone()
        if not src or not tgt:
            return False

        now = datetime.utcnow().isoformat()
        self.conn.execute(
            "INSERT INTO edges (source, target, type, weight, session_id, created_at, metadata) "
            "VALUES (?,?,?,?,?,?,?)",
            (source, target, edge_type, weight, session_id, now, metadata)
        )
        self.conn.commit()
        return True

    def get_neighbors(self, node_id: str, edge_type: str = None) -> List[Dict[str, Any]]:
        """Get all nodes connected to a node (outgoing edges)."""
        if edge_type:
            rows = self.conn.execute(
                "SELECT n.*, e.type as edge_type, e.weight FROM edges e "
                "JOIN nodes n ON e.target = n.id WHERE e.source = ? AND e.type = ?",
                (node_id, edge_type)
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT n.*, e.type as edge_type, e.weight FROM edges e "
                "JOIN nodes n ON e.target = n.id WHERE e.source = ?",
                (node_id,)
            ).fetchall()
        return [dict(r) for r in rows]

    def get_edges_for_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all edges created in a specific session."""
        rows = self.conn.execute(
            "SELECT * FROM edges WHERE session_id = ?", (session_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Session Operations ──────────────────────────────────────────

    def start_session(self) -> str:
        """Start a new therapy session. Returns session ID."""
        session_id = f"sess_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()
        node_count = self.conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]

        self.conn.execute(
            "INSERT INTO sessions (id, started_at, node_count_start) VALUES (?,?,?)",
            (session_id, now, node_count)
        )
        self.conn.commit()
        return session_id

    def end_session(self, session_id: str, summary: str = None,
                    mood_start: float = None, mood_end: float = None):
        """End a therapy session with optional summary and mood scores."""
        now = datetime.utcnow().isoformat()
        node_count = self.conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]

        self.conn.execute(
            "UPDATE sessions SET ended_at = ?, summary = ?, mood_start = ?, "
            "mood_end = ?, node_count_end = ? WHERE id = ?",
            (now, summary, mood_start, mood_end, node_count, session_id)
        )
        self.conn.commit()

    def get_last_session(self) -> Optional[Dict[str, Any]]:
        """Get the most recent session (for handoff)."""
        row = self.conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None

    def get_session_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent sessions."""
        rows = self.conn.execute(
            "SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Graph Statistics ────────────────────────────────────────────

    def stats(self) -> Dict[str, Any]:
        """Get KG statistics."""
        node_count = self.conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        edge_count = self.conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
        session_count = self.conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]

        node_types = dict(self.conn.execute(
            "SELECT type, COUNT(*) FROM nodes GROUP BY type ORDER BY COUNT(*) DESC"
        ).fetchall())

        edge_types = dict(self.conn.execute(
            "SELECT type, COUNT(*) FROM edges GROUP BY type ORDER BY COUNT(*) DESC"
        ).fetchall())

        return {
            "user_id": self.user_id,
            "db_path": self.db_path,
            "node_count": node_count,
            "edge_count": edge_count,
            "session_count": session_count,
            "node_types": node_types,
            "edge_types": edge_types,
        }

    # ── Export (for React Flow visualization) ───────────────────────

    def to_react_flow(self) -> Dict[str, Any]:
        """Export the KG as React Flow nodes and edges."""
        nodes = self.conn.execute("SELECT * FROM nodes").fetchall()
        edges = self.conn.execute("SELECT rowid, * FROM edges").fetchall()

        rf_nodes = []
        for n in nodes:
            n = dict(n)
            rf_nodes.append({
                "id": n["id"],
                "type": "default",
                "data": {
                    "label": n["name"],
                    "nodeType": n["type"],
                    "intensity": n["intensity"],
                    "description": n["description"],
                    "sessionCount": n["session_count"],
                },
                "position": {"x": 0, "y": 0},  # Layout computed client-side
            })

        rf_edges = []
        for e in edges:
            e = dict(e)
            rf_edges.append({
                "id": f"e-{e['rowid']}",
                "source": e["source"],
                "target": e["target"],
                "label": e["type"],
                "data": {"weight": e["weight"], "session": e["session_id"]},
            })

        return {"nodes": rf_nodes, "edges": rf_edges}


# ── Factory Function ────────────────────────────────────────────────

def create_user_kg(user_id: str, data_dir: str = THERAPY_DATA_DIR) -> TherapyKG:
    """Create or open a user's therapy KG."""
    return TherapyKG(user_id, data_dir)


def list_user_kgs(data_dir: str = THERAPY_DATA_DIR) -> List[str]:
    """List all user IDs that have a therapy KG."""
    if not os.path.exists(data_dir):
        return []
    return [
        f.replace("user_", "").replace(".db", "")
        for f in os.listdir(data_dir)
        if f.startswith("user_") and f.endswith(".db")
    ]


# ── Demo ────────────────────────────────────────────────────────────

def demo():
    """Build a demo therapy KG showing typical session progression."""
    import tempfile
    demo_dir = tempfile.mkdtemp()
    kg = TherapyKG("demo_user", data_dir=demo_dir)

    # Session 1: User opens up about work anxiety
    s1 = kg.start_session()
    c1 = kg.add_node("work anxiety", "concern", "Anxious about deadlines and performance reviews", intensity=0.7, session_id=s1)
    t1 = kg.add_node("deadlines", "trigger", "Upcoming project deadlines", intensity=0.6, session_id=s1)
    e1 = kg.add_node("overwhelm", "emotion", "Feeling overwhelmed and unable to cope", intensity=0.8, session_id=s1)
    kg.add_edge(t1, c1, "triggers", session_id=s1)
    kg.add_edge(c1, e1, "feels_like", session_id=s1)
    kg.end_session(s1, summary="Explored work anxiety triggered by deadlines", mood_start=0.3, mood_end=0.4)

    # Session 3: User finds media analogy helpful
    s3 = kg.start_session()
    m1 = kg.add_node("Lord of the Rings", "media", "LOTR — the long journey, fellowship support", session_id=s3,
                      intent_keywords="lotr,tolkien,fellowship,journey,perseverance")
    kg.add_edge(m1, c1, "analogy_for", session_id=s3, weight=0.9)
    cp1 = kg.add_node("deep breathing", "coping", "Box breathing technique (4-4-4-4)", intensity=0.5, session_id=s3)
    kg.add_edge(cp1, c1, "helps_with", session_id=s3)
    kg.end_session(s3, summary="LOTR analogy for perseverance, introduced breathing", mood_start=0.4, mood_end=0.6)

    # Session 7: Breakthrough
    s7 = kg.start_session()
    b1 = kg.add_node("deadline reframing", "breakthrough", "Reframed deadlines as milestones, not threats", session_id=s7)
    kg.add_edge(b1, c1, "resolved_by", session_id=s7)
    # Update concern intensity (progressed)
    kg.update_node(c1, intensity=0.3, last_session=s7)
    g1 = kg.add_node("assertive communication", "goal", "Practice saying no to unreasonable deadlines", intensity=0.6, session_id=s7)
    kg.end_session(s7, summary="Breakthrough on deadline reframing. Anxiety decreased.", mood_start=0.5, mood_end=0.7)

    print(f"Demo KG built at: {kg.db_path}")
    print(f"Stats: {kg.stats()}")
    print(f"\nActive concerns: {kg.get_active_concerns()}")
    print(f"\nLast session: {kg.get_last_session()}")
    print(f"\nNeighbors of work_anxiety: {kg.get_neighbors(c1)}")

    kg.close()
    return kg.db_path


if __name__ == "__main__":
    demo()
