#!/usr/bin/env python3
"""
Therapy KG Tests — Per-user knowledge graph operations.

Tests:
  1. KG creation and schema
  2. Node CRUD (add, update, get, delete, upsert)
  3. Edge operations (add, validate, neighbors)
  4. Session lifecycle (start, end, history, handoff)
  5. Search (FTS5)
  6. Export (React Flow format)
  7. Multi-user isolation
  8. Edge cases
"""

import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.build_therapy_kg import TherapyKG, create_user_kg, list_user_kgs, NODE_TYPES, EDGE_TYPES


# ── Setup / Teardown ────────────────────────────────────────────────

_test_dir = None

def setup():
    global _test_dir
    _test_dir = tempfile.mkdtemp()

def teardown():
    global _test_dir
    if _test_dir and os.path.exists(_test_dir):
        shutil.rmtree(_test_dir)

def make_kg(user_id="test_user"):
    return TherapyKG(user_id, data_dir=_test_dir)


# ── 1. KG Creation ──────────────────────────────────────────────────

def test_kg_creates_db():
    """KG initializes and creates SQLite file."""
    kg = make_kg()
    _ = kg.conn  # trigger creation
    assert os.path.exists(kg.db_path), "DB file not created"
    kg.close()

def test_kg_schema_has_tables():
    """Schema includes nodes, edges, sessions, and FTS."""
    kg = make_kg()
    tables = {r[0] for r in kg.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert "nodes" in tables
    assert "edges" in tables
    assert "sessions" in tables
    assert "nodes_fts" in tables
    kg.close()


# ── 2. Node Operations ─────────────────────────────────────────────

def test_add_node():
    """Can add a node and retrieve it."""
    kg = make_kg()
    nid = kg.add_node("work anxiety", "concern", "Anxious about deadlines", intensity=0.7)
    assert nid.startswith("concern_")
    node = kg.get_node(nid)
    assert node["name"] == "work anxiety"
    assert node["type"] == "concern"
    assert node["intensity"] == 0.7
    kg.close()

def test_add_node_invalid_type():
    """Adding a node with invalid type raises ValueError."""
    kg = make_kg()
    try:
        kg.add_node("test", "invalid_type")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
    kg.close()

def test_node_upsert():
    """Adding same name+type updates existing node instead of duplicating."""
    kg = make_kg()
    id1 = kg.add_node("work anxiety", "concern", intensity=0.5)
    id2 = kg.add_node("work anxiety", "concern", intensity=0.8)
    assert id1 == id2, "Upsert should return same ID"
    node = kg.get_node(id1)
    assert node["intensity"] == 0.8
    assert node["session_count"] == 2
    kg.close()

def test_update_node():
    """Can update specific node fields."""
    kg = make_kg()
    nid = kg.add_node("sadness", "emotion", intensity=0.6)
    assert kg.update_node(nid, intensity=0.3, description="Feeling low")
    node = kg.get_node(nid)
    assert node["intensity"] == 0.3
    assert node["description"] == "Feeling low"
    kg.close()

def test_delete_node():
    """Deleting a node also removes connected edges."""
    kg = make_kg()
    n1 = kg.add_node("anxiety", "concern")
    n2 = kg.add_node("breathing", "coping")
    kg.add_edge(n2, n1, "helps_with")
    assert kg.delete_node(n1)
    assert kg.get_node(n1) is None
    assert len(kg.get_neighbors(n2)) == 0
    kg.close()

def test_get_nodes_by_type():
    """Can filter nodes by type."""
    kg = make_kg()
    kg.add_node("anxiety", "concern", intensity=0.8)
    kg.add_node("insomnia", "concern", intensity=0.5)
    kg.add_node("journaling", "coping", intensity=0.6)
    concerns = kg.get_nodes_by_type("concern")
    assert len(concerns) == 2
    assert concerns[0]["intensity"] >= concerns[1]["intensity"]  # sorted desc
    kg.close()

def test_get_active_concerns():
    """Active concerns filters by intensity threshold."""
    kg = make_kg()
    kg.add_node("high anxiety", "concern", intensity=0.9)
    kg.add_node("resolved issue", "concern", intensity=0.1)
    kg.add_node("moderate stress", "concern", intensity=0.5)
    active = kg.get_active_concerns(threshold=0.3)
    assert len(active) == 2  # 0.9 and 0.5, not 0.1
    kg.close()

def test_intensity_clamped():
    """Intensity values are clamped to [0.0, 1.0]."""
    kg = make_kg()
    nid = kg.add_node("test", "concern", intensity=1.5)
    node = kg.get_node(nid)
    assert node["intensity"] == 1.0
    nid2 = kg.add_node("test2", "concern", intensity=-0.5)
    node2 = kg.get_node(nid2)
    assert node2["intensity"] == 0.0
    kg.close()


# ── 3. Edge Operations ─────────────────────────────────────────────

def test_add_edge():
    """Can add edges between nodes."""
    kg = make_kg()
    n1 = kg.add_node("deadline", "trigger")
    n2 = kg.add_node("anxiety", "concern")
    assert kg.add_edge(n1, n2, "triggers")
    neighbors = kg.get_neighbors(n1)
    assert len(neighbors) == 1
    assert neighbors[0]["name"] == "anxiety"
    kg.close()

def test_edge_invalid_type():
    """Adding an edge with invalid type raises ValueError."""
    kg = make_kg()
    n1 = kg.add_node("a", "concern")
    n2 = kg.add_node("b", "emotion")
    try:
        kg.add_edge(n1, n2, "invalid_edge")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
    kg.close()

def test_edge_missing_node():
    """Adding an edge to nonexistent node returns False."""
    kg = make_kg()
    n1 = kg.add_node("real", "concern")
    assert not kg.add_edge(n1, "nonexistent_id", "triggers")
    kg.close()

def test_get_neighbors_filtered():
    """Can filter neighbors by edge type."""
    kg = make_kg()
    c = kg.add_node("anxiety", "concern")
    t = kg.add_node("deadline", "trigger")
    cp = kg.add_node("breathing", "coping")
    kg.add_edge(t, c, "triggers")
    kg.add_edge(cp, c, "helps_with")
    triggers = kg.get_neighbors(t, edge_type="triggers")
    assert len(triggers) == 1
    kg.close()


# ── 4. Session Operations ──────────────────────────────────────────

def test_session_lifecycle():
    """Can start and end a session."""
    kg = make_kg()
    sid = kg.start_session()
    assert sid.startswith("sess_")
    kg.end_session(sid, summary="Explored anxiety", mood_start=0.3, mood_end=0.5)
    session = kg.get_last_session()
    assert session["id"] == sid
    assert session["summary"] == "Explored anxiety"
    assert session["mood_start"] == 0.3
    assert session["mood_end"] == 0.5
    assert session["ended_at"] is not None
    kg.close()

def test_session_history():
    """Session history returns in reverse chronological order."""
    kg = make_kg()
    s1 = kg.start_session()
    kg.end_session(s1, summary="First")
    s2 = kg.start_session()
    kg.end_session(s2, summary="Second")
    history = kg.get_session_history()
    assert len(history) == 2
    assert history[0]["summary"] == "Second"  # most recent first
    kg.close()

def test_session_tracks_graph_growth():
    """Session records node count at start and end."""
    kg = make_kg()
    kg.add_node("pre-existing", "concern")
    sid = kg.start_session()
    kg.add_node("new concern", "concern", session_id=sid)
    kg.end_session(sid)
    session = kg.get_last_session()
    assert session["node_count_start"] == 1
    assert session["node_count_end"] == 2
    kg.close()

def test_edges_linked_to_session():
    """Edges record which session created them."""
    kg = make_kg()
    sid = kg.start_session()
    n1 = kg.add_node("trigger", "trigger", session_id=sid)
    n2 = kg.add_node("concern", "concern", session_id=sid)
    kg.add_edge(n1, n2, "triggers", session_id=sid)
    session_edges = kg.get_edges_for_session(sid)
    assert len(session_edges) == 1
    kg.close()


# ── 5. Search ───────────────────────────────────────────────────────

def test_fts_search():
    """Full-text search finds nodes by name and keywords."""
    kg = make_kg()
    kg.add_node("Lord of the Rings", "media",
                intent_keywords="lotr,tolkien,fellowship,journey")
    kg.add_node("breathing exercise", "coping")
    results = kg.search_nodes("tolkien")
    assert len(results) == 1
    assert results[0]["name"] == "Lord of the Rings"
    kg.close()


# ── 6. Export ───────────────────────────────────────────────────────

def test_react_flow_export():
    """Export produces valid React Flow format."""
    kg = make_kg()
    n1 = kg.add_node("anxiety", "concern")
    n2 = kg.add_node("breathing", "coping")
    kg.add_edge(n2, n1, "helps_with")
    rf = kg.to_react_flow()
    assert len(rf["nodes"]) == 2
    assert len(rf["edges"]) == 1
    assert rf["nodes"][0]["data"]["label"] in ("anxiety", "breathing")
    assert rf["edges"][0]["label"] == "helps_with"
    kg.close()


# ── 7. Multi-User Isolation ─────────────────────────────────────────

def test_user_isolation():
    """Two users have completely separate KGs."""
    kg1 = TherapyKG("alice", data_dir=_test_dir)
    kg2 = TherapyKG("bob", data_dir=_test_dir)
    kg1.add_node("alice concern", "concern")
    kg2.add_node("bob concern", "concern")
    assert len(kg1.get_nodes_by_type("concern")) == 1
    assert len(kg2.get_nodes_by_type("concern")) == 1
    assert kg1.get_nodes_by_type("concern")[0]["name"] == "alice concern"
    assert kg2.get_nodes_by_type("concern")[0]["name"] == "bob concern"
    kg1.close()
    kg2.close()

def test_list_user_kgs():
    """Can list all user KGs in data directory."""
    kg1 = TherapyKG("alice", data_dir=_test_dir)
    _ = kg1.conn
    kg2 = TherapyKG("bob", data_dir=_test_dir)
    _ = kg2.conn
    users = list_user_kgs(_test_dir)
    assert "alice" in users
    assert "bob" in users
    kg1.close()
    kg2.close()


# ── 8. Stats ────────────────────────────────────────────────────────

def test_stats():
    """Stats returns correct counts."""
    kg = make_kg()
    kg.add_node("a", "concern")
    kg.add_node("b", "trigger")
    kg.add_edge(
        kg.get_nodes_by_type("concern")[0]["id"],
        kg.get_nodes_by_type("concern")[0]["id"],  # self-edge for simplicity
        "connected_to"
    )
    # Actually let's use proper nodes
    s = kg.stats()
    assert s["node_count"] == 2
    assert s["user_id"] == "test_user"
    kg.close()


# ── Runner ──────────────────────────────────────────────────────────

ALL_TESTS = [
    test_kg_creates_db,
    test_kg_schema_has_tables,
    test_add_node,
    test_add_node_invalid_type,
    test_node_upsert,
    test_update_node,
    test_delete_node,
    test_get_nodes_by_type,
    test_get_active_concerns,
    test_intensity_clamped,
    test_add_edge,
    test_edge_invalid_type,
    test_edge_missing_node,
    test_get_neighbors_filtered,
    test_session_lifecycle,
    test_session_history,
    test_session_tracks_graph_growth,
    test_edges_linked_to_session,
    test_fts_search,
    test_react_flow_export,
    test_user_isolation,
    test_list_user_kgs,
    test_stats,
]


def run_tests():
    passed = 0
    failed = 0

    print("Therapy KG Tests")
    print("=" * 60)

    for test_fn in ALL_TESTS:
        setup()
        try:
            test_fn()
            passed += 1
            print(f"  [PASS] {test_fn.__doc__.strip()}")
        except AssertionError as e:
            failed += 1
            print(f"  [FAIL] {test_fn.__doc__.strip()}")
            print(f"         {e}")
        except Exception as e:
            failed += 1
            print(f"  [ERROR] {test_fn.__doc__.strip()}")
            print(f"          {type(e).__name__}: {e}")
        finally:
            teardown()

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{passed + failed} passed, {failed} failed")
    print(f"{'='*60}")
    return passed, failed


if __name__ == "__main__":
    passed, failed = run_tests()
    sys.exit(1 if failed > 0 else 0)
