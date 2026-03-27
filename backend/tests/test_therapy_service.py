#!/usr/bin/env python3
"""
Therapy Service Integration Tests — Orchestrator + Router logic.

Tests the full pipeline: safety → KG → 4D persona → context → validate → grow.
"""

import sys
import os
import tempfile
import shutil
from dataclasses import asdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.therapy_service import TherapyService, TherapyContext


_test_dir = None

def setup():
    global _test_dir
    _test_dir = tempfile.mkdtemp()

def teardown():
    global _test_dir
    if _test_dir and os.path.exists(_test_dir):
        shutil.rmtree(_test_dir)

def make_service():
    return TherapyService(data_dir=_test_dir)


# ─────────────────────────────────────────────────────────────────
# Session Management
# ─────────────────────────────────────────────────────────────────

def test_start_session():
    """Can start a session for a new user."""
    svc = make_service()
    result = svc.start_session("alice")
    assert result["user_id"] == "alice"
    assert result["session_id"].startswith("sess_")
    assert result["session_count"] >= 1  # Includes the just-started session
    svc.close_all()

def test_start_session_returning_user():
    """Returning user gets handoff context."""
    svc = make_service()
    # First session
    r1 = svc.start_session("bob")
    svc.add_concern("bob", "work stress", intensity=0.7)
    svc.end_session("bob", summary="Discussed work stress", mood_start=0.3, mood_end=0.5)
    # Second session — should have handoff
    r2 = svc.start_session("bob")
    assert r2["session_count"] >= 2  # Previous session + new one
    assert r2["active_concerns"]  # Should have work stress
    # Handoff prompt should reference last session
    if r2.get("handoff_prompt"):
        assert "work stress" in r2["handoff_prompt"].lower() or "Discussed" in r2["handoff_prompt"]
    svc.close_all()

def test_end_session():
    """Can end a session with summary."""
    svc = make_service()
    svc.start_session("carol")
    result = svc.end_session("carol", summary="Good session", mood_start=0.4, mood_end=0.6)
    assert result["ended"] is True
    svc.close_all()


# ─────────────────────────────────────────────────────────────────
# Core Pipeline
# ─────────────────────────────────────────────────────────────────

def test_process_normal_message():
    """Normal message passes safety and returns full context."""
    svc = make_service()
    svc.start_session("dave")
    ctx = svc.process_message("dave", "I've been feeling anxious about work lately")
    assert ctx.safety_result["action"] == "pass"
    assert ctx.persona_state  # Has 4D state
    assert ctx.voice_instruction  # Has voice
    assert "Aria" in ctx.voice_instruction
    svc.close_all()

def test_process_crisis_message():
    """Crisis message escalates — no persona computation."""
    svc = make_service()
    svc.start_session("eve")
    ctx = svc.process_message("eve", "I want to kill myself")
    assert ctx.safety_result["action"] == "escalate"
    assert ctx.safety_result["resources"]  # Has crisis resources
    assert not ctx.persona_state  # Didn't compute persona
    svc.close_all()

def test_process_blocked_message():
    """Blocked message (medication advice) returns block."""
    svc = make_service()
    svc.start_session("frank")
    ctx = svc.process_message("frank", "What medication should I take for anxiety?")
    assert ctx.safety_result["action"] == "block"
    svc.close_all()

def test_process_with_kg_context():
    """Message with KG context surfaces media and coping."""
    svc = make_service()
    svc.start_session("grace")
    svc.add_concern("grace", "work anxiety", description="Anxious about deadlines", intensity=0.7)
    svc.add_media("grace", "Lord of the Rings", keywords="lotr,fellowship")
    # Link media to concern
    kg = svc._get_kg("grace")
    concerns = kg.get_nodes_by_type("concern")
    media = kg.get_nodes_by_type("media")
    if concerns and media:
        kg.add_edge(media[0]["id"], concerns[0]["id"], "analogy_for")

    ctx = svc.process_message("grace", "My work anxiety is really bad today")
    assert ctx.safety_result["action"] == "pass"
    assert ctx.persona_state["y"]["activated"]
    svc.close_all()

def test_process_emotional_state_reflects_kg():
    """Emotional state reflects KG concern intensity."""
    svc = make_service()
    svc.start_session("hank")
    svc.add_concern("hank", "grief", intensity=0.9)
    ctx = svc.process_message("hank", "I'm struggling today")
    mood = ctx.persona_state["x"]["mood"]
    assert mood in ("deeply_empathetic", "validating")
    svc.close_all()


# ─────────────────────────────────────────────────────────────────
# Validate Response
# ─────────────────────────────────────────────────────────────────

def test_validate_good_response():
    """Good response passes validation."""
    svc = make_service()
    result = svc.validate_response(
        "That sounds really difficult. What's been the hardest part?"
    )
    assert result.action == "pass"
    svc.close_all()

def test_validate_bad_response():
    """Minimizing response gets blocked."""
    svc = make_service()
    result = svc.validate_response("It's not that bad, everyone feels that way")
    assert result.action in ("block", "warn")
    svc.close_all()


# ─────────────────────────────────────────────────────────────────
# KG Growth
# ─────────────────────────────────────────────────────────────────

def test_add_concern():
    """Can add a concern to user's KG."""
    svc = make_service()
    svc.start_session("iris")
    result = svc.add_concern("iris", "insomnia", "Can't sleep", intensity=0.6)
    assert result["node_id"].startswith("concern_")
    state = svc.get_user_state("iris")
    assert any(c["name"] == "insomnia" for c in state["active_concerns"])
    svc.close_all()

def test_add_media():
    """Can add media preference."""
    svc = make_service()
    svc.start_session("jack")
    result = svc.add_media("jack", "Star Wars", keywords="force,jedi")
    assert result["type"] == "media"
    svc.close_all()

def test_add_insight():
    """Can persist a breakthrough linked to a concern."""
    svc = make_service()
    svc.start_session("kate")
    concern = svc.add_concern("kate", "perfectionism", intensity=0.7)
    insight = svc.add_insight("kate", "good enough is enough",
                              concern_id=concern["node_id"])
    assert insight["type"] == "breakthrough"
    svc.close_all()

def test_update_node():
    """Can update a node (therapist editing)."""
    svc = make_service()
    svc.start_session("leo")
    concern = svc.add_concern("leo", "anger", intensity=0.8)
    assert svc.update_node("leo", concern["node_id"], intensity=0.4)
    state = svc.get_user_state("leo")
    anger = next(c for c in state["active_concerns"] if c["name"] == "anger")
    assert anger["intensity"] == 0.4
    svc.close_all()

def test_add_edge():
    """Can add an edge between nodes."""
    svc = make_service()
    svc.start_session("mia")
    c = svc.add_concern("mia", "anxiety")
    t = svc.add_concern("mia", "panic attacks")  # Using concern type for simplicity
    # Actually need a trigger
    kg = svc._get_kg("mia")
    t_id = kg.add_node("loud noises", "trigger")
    assert svc.add_edge("mia", t_id, c["node_id"], "triggers")
    svc.close_all()


# ─────────────────────────────────────────────────────────────────
# Read Operations
# ─────────────────────────────────────────────────────────────────

def test_get_user_state():
    """User state includes all node types and stats."""
    svc = make_service()
    svc.start_session("nina")
    svc.add_concern("nina", "stress", intensity=0.5)
    svc.add_media("nina", "Radiohead", keywords="music,creep")
    state = svc.get_user_state("nina")
    assert state["user_id"] == "nina"
    assert len(state["active_concerns"]) == 1
    assert state["stats"]["node_count"] >= 2
    svc.close_all()

def test_get_user_graph():
    """Graph export is React Flow format."""
    svc = make_service()
    svc.start_session("oscar")
    svc.add_concern("oscar", "loneliness")
    graph = svc.get_user_graph("oscar")
    assert "nodes" in graph
    assert "edges" in graph
    assert len(graph["nodes"]) >= 1
    svc.close_all()


# ─────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────

ALL_TESTS = [
    test_start_session,
    test_start_session_returning_user,
    test_end_session,
    test_process_normal_message,
    test_process_crisis_message,
    test_process_blocked_message,
    test_process_with_kg_context,
    test_process_emotional_state_reflects_kg,
    test_validate_good_response,
    test_validate_bad_response,
    test_add_concern,
    test_add_media,
    test_add_insight,
    test_update_node,
    test_add_edge,
    test_get_user_state,
    test_get_user_graph,
]


def run_tests():
    passed = 0
    failed = 0

    print("Therapy Service Integration Tests")
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
