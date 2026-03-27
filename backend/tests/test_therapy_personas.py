#!/usr/bin/env python3
"""
Therapy Persona Computer Tests — All 4 dimensions.

Tests:
  1. Emotional (X): empathy levels from KG intensity
  2. Relational (Y): KG traversal and entity detection
  3. Linguistic (Z): adaptive voice and media integration
  4. Temporal (T): session stages and THE HANDOFF MOMENT
"""

import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from persona.therapy_emotional import TherapyEmotionalComputer
from persona.therapy_relational import TherapyRelationalComputer
from persona.therapy_linguistic import TherapyLinguisticComputer
from persona.therapy_temporal import TherapyTemporalComputer
from data.build_therapy_kg import TherapyKG


# ── Setup ───────────────────────────────────────────────────────────

_test_dir = None

def setup():
    global _test_dir
    _test_dir = tempfile.mkdtemp()

def teardown():
    global _test_dir
    if _test_dir and os.path.exists(_test_dir):
        shutil.rmtree(_test_dir)

def make_populated_kg():
    """Create a KG with realistic therapy data."""
    kg = TherapyKG("test_user", data_dir=_test_dir)
    s1 = kg.start_session()
    c1 = kg.add_node("work anxiety", "concern", "Anxious about deadlines", intensity=0.7, session_id=s1)
    t1 = kg.add_node("deadlines", "trigger", intensity=0.6, session_id=s1)
    e1 = kg.add_node("overwhelm", "emotion", intensity=0.8, session_id=s1)
    m1 = kg.add_node("Lord of the Rings", "media", "Journey and fellowship",
                      session_id=s1, intent_keywords="lotr,tolkien,fellowship")
    cp1 = kg.add_node("deep breathing", "coping", "Box breathing 4-4-4-4", intensity=0.5, session_id=s1)
    kg.add_edge(t1, c1, "triggers", session_id=s1)
    kg.add_edge(c1, e1, "feels_like", session_id=s1)
    kg.add_edge(m1, c1, "analogy_for", session_id=s1)
    kg.add_edge(cp1, c1, "helps_with", session_id=s1)
    kg.end_session(s1, summary="Explored work anxiety, LOTR analogy", mood_start=0.3, mood_end=0.5)
    return kg


# ─────────────────────────────────────────────────────────────────
# 1. EMOTIONAL COMPUTER (X)
# ─────────────────────────────────────────────────────────────────

def test_emotional_no_context():
    """No context → neutral open mood."""
    comp = TherapyEmotionalComputer()
    state = comp.compute(None)
    assert state.mood == "neutral_open"

def test_emotional_crisis_flag():
    """Crisis flag → maximum gentleness."""
    comp = TherapyEmotionalComputer()
    state = comp.compute({"has_crisis_flag": True})
    assert state.mood == "crisis_gentle"
    assert state.value <= 0.2

def test_emotional_breakthrough():
    """Recent breakthrough → celebrating mood."""
    comp = TherapyEmotionalComputer()
    state = comp.compute({"recent_breakthrough": True})
    assert state.mood == "celebrating"
    assert state.value >= 0.7

def test_emotional_high_intensity_concerns():
    """High concern intensity → deeply empathetic."""
    comp = TherapyEmotionalComputer()
    state = comp.compute({
        "active_concerns": [{"intensity": 0.9, "name": "grief"}]
    })
    assert state.mood == "deeply_empathetic"

def test_emotional_moderate_improving():
    """Moderate concerns + improving trajectory → encouraging."""
    comp = TherapyEmotionalComputer()
    state = comp.compute({
        "active_concerns": [{"intensity": 0.6, "name": "stress"}],
        "last_session": {"mood_start": 0.3, "mood_end": 0.5}
    })
    assert state.mood == "encouraging"

def test_emotional_distress_in_message():
    """Distress words with no KG → validating."""
    comp = TherapyEmotionalComputer()
    state = comp.compute({
        "active_concerns": [],
        "user_message": "I feel so hopeless and alone"
    })
    assert state.mood == "validating"


# ─────────────────────────────────────────────────────────────────
# 2. RELATIONAL COMPUTER (Y)
# ─────────────────────────────────────────────────────────────────

def test_relational_no_kg():
    """No KG loaded → not activated."""
    comp = TherapyRelationalComputer()
    state = comp.compute({"user_message": "hello"})
    assert not state.activated

def test_relational_detects_concern():
    """Detects concern mention in user message from KG."""
    kg = make_populated_kg()
    comp = TherapyRelationalComputer(therapy_kg=kg)
    state = comp.compute({"user_message": "My work anxiety is getting worse"})
    assert state.activated
    assert state.target == "work anxiety"
    assert state.relation_type == "concern"
    kg.close()

def test_relational_surfaces_media():
    """Surfaces media analogies connected to detected concern."""
    kg = make_populated_kg()
    comp = TherapyRelationalComputer(therapy_kg=kg)
    state = comp.compute({"user_message": "I'm stressed about work anxiety again"})
    assert state.activated
    media = state.context.get("media_analogies", [])
    assert len(media) >= 1
    assert any("Lord of the Rings" in m.get("name", "") for m in media)
    kg.close()

def test_relational_surfaces_coping():
    """Surfaces coping strategies for detected concern."""
    kg = make_populated_kg()
    comp = TherapyRelationalComputer(therapy_kg=kg)
    state = comp.compute({"user_message": "work anxiety is bad today"})
    assert state.activated
    coping = state.context.get("coping_strategies", [])
    assert len(coping) >= 1
    assert any("breathing" in c.get("name", "") for c in coping)
    kg.close()

def test_relational_implicit_concern():
    """No direct match but active concerns → implicit activation."""
    kg = make_populated_kg()
    comp = TherapyRelationalComputer(therapy_kg=kg)
    active = kg.get_active_concerns()
    state = comp.compute({
        "user_message": "I had a rough day",
        "active_concerns": active
    })
    assert state.activated
    assert state.context.get("match_type") == "implicit_active"
    kg.close()

def test_relational_swap_kg():
    """Can swap KG at runtime for different users."""
    kg1 = TherapyKG("user1", data_dir=_test_dir)
    kg1.add_node("depression", "concern")
    kg2 = TherapyKG("user2", data_dir=_test_dir)
    kg2.add_node("social anxiety", "concern")

    comp = TherapyRelationalComputer(therapy_kg=kg1)
    s1 = comp.compute({"user_message": "depression"})
    assert s1.activated

    comp.set_kg(kg2)
    s2 = comp.compute({"user_message": "social anxiety"})
    assert s2.activated
    assert s2.target == "social anxiety"

    kg1.close()
    kg2.close()


# ─────────────────────────────────────────────────────────────────
# 3. LINGUISTIC COMPUTER (Z)
# ─────────────────────────────────────────────────────────────────

def test_linguistic_base_voice():
    """Returns therapy companion voice."""
    comp = TherapyLinguisticComputer()
    state = comp.compute(None)
    assert state.dialect == "therapy_companion"
    assert "Aria" in state.voice_instruction
    assert "non-judgmental" in state.voice_instruction.lower() or "never evaluate" in state.voice_instruction.lower()

def test_linguistic_media_integration():
    """Voice instruction includes user's media preferences."""
    comp = TherapyLinguisticComputer()
    state = comp.compute({
        "media_analogies": [{"name": "Lord of the Rings"}, {"name": "Star Wars"}]
    })
    assert "Lord of the Rings" in state.voice_instruction
    assert "Star Wars" in state.voice_instruction

def test_linguistic_crisis_tone():
    """Crisis mood → maximum gentleness tone."""
    comp = TherapyLinguisticComputer()
    state = comp.compute({"emotional_mood": "crisis_gentle"})
    assert "gentleness" in state.voice_instruction.lower() or "gentle" in state.voice_instruction.lower()

def test_linguistic_celebration_tone():
    """Celebrating mood → warm celebration tone."""
    comp = TherapyLinguisticComputer()
    state = comp.compute({"emotional_mood": "celebrating"})
    assert "celebration" in state.voice_instruction.lower() or "breakthrough" in state.voice_instruction.lower()

def test_linguistic_vocabulary():
    """Vocabulary transforms clinical → human language."""
    comp = TherapyLinguisticComputer()
    state = comp.compute(None)
    assert state.vocabulary.get("patient") == "person"
    assert state.vocabulary.get("disorder") == "challenge"
    assert state.vocabulary.get("should") == "might"


# ─────────────────────────────────────────────────────────────────
# 4. TEMPORAL COMPUTER (T)
# ─────────────────────────────────────────────────────────────────

def test_temporal_no_context():
    """No context → step 0, opening stage."""
    comp = TherapyTemporalComputer()
    state = comp.compute(None)
    assert state.step == 0

def test_temporal_session_stages():
    """Steps progress through session stages."""
    comp = TherapyTemporalComputer()
    s1 = comp.compute({"session_id": "s1", "user_message": "Hi", "turn_count": 0})
    assert s1.momentum["stage"] == "opening"
    s2 = comp.compute({"session_id": "s1", "user_message": "Tell me more", "turn_count": 2})
    assert s2.momentum["stage"] == "exploration"

def test_temporal_deepening_detection():
    """Detects deepening signals in user message."""
    comp = TherapyTemporalComputer()
    state = comp.compute({
        "session_id": "s1",
        "user_message": "The truth is I've never told anyone this",
        "turn_count": 5
    })
    assert state.momentum["stage"] == "deepening"

def test_temporal_closing_detection():
    """Detects closing signals."""
    comp = TherapyTemporalComputer()
    state = comp.compute({
        "session_id": "s1",
        "user_message": "Thank you, I should go now",
        "turn_count": 8
    })
    assert state.momentum["stage"] == "closing"

def test_temporal_handoff_generation():
    """THE HANDOFF MOMENT: generates continuity prompt from last session."""
    comp = TherapyTemporalComputer()
    state = comp.compute({
        "session_id": "new_session",
        "user_message": "Hey Aria",
        "turn_count": 0,
        "last_session": {
            "id": "old_sess",
            "summary": "Explored work anxiety, LOTR analogy",
            "mood_start": 0.3,
            "mood_end": 0.5,
            "node_count_start": 2,
            "node_count_end": 5,
        },
        "active_concerns": [{"id": "c1", "name": "work anxiety", "type": "concern"}],
        "media_analogies": [{"name": "Lord of the Rings"}],
    })
    assert state.momentum.get("has_handoff") is True
    handoff = state.momentum.get("handoff_prompt", "")
    assert "work anxiety" in handoff
    assert "Lord of the Rings" in handoff

def test_temporal_velocity_improving():
    """Velocity detects improving mood trajectory."""
    comp = TherapyTemporalComputer()
    state = comp.compute({
        "session_id": "s3",
        "user_message": "Hi",
        "turn_count": 0,
        "session_history": [
            {"id": "s1", "mood_start": 0.2, "mood_end": 0.3},
            {"id": "s2", "mood_start": 0.3, "mood_end": 0.6},
        ]
    })
    assert state.velocity["trend"] == "improving"

def test_temporal_velocity_declining():
    """Velocity detects declining mood trajectory."""
    comp = TherapyTemporalComputer()
    state = comp.compute({
        "session_id": "s3",
        "user_message": "Hi",
        "turn_count": 0,
        "session_history": [
            {"id": "s1", "mood_start": 0.5, "mood_end": 0.6},
            {"id": "s2", "mood_start": 0.4, "mood_end": 0.3},
        ]
    })
    assert state.velocity["trend"] == "declining"


# ─────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────

ALL_TESTS = [
    # Emotional (6)
    test_emotional_no_context,
    test_emotional_crisis_flag,
    test_emotional_breakthrough,
    test_emotional_high_intensity_concerns,
    test_emotional_moderate_improving,
    test_emotional_distress_in_message,
    # Relational (6)
    test_relational_no_kg,
    test_relational_detects_concern,
    test_relational_surfaces_media,
    test_relational_surfaces_coping,
    test_relational_implicit_concern,
    test_relational_swap_kg,
    # Linguistic (5)
    test_linguistic_base_voice,
    test_linguistic_media_integration,
    test_linguistic_crisis_tone,
    test_linguistic_celebration_tone,
    test_linguistic_vocabulary,
    # Temporal (7)
    test_temporal_no_context,
    test_temporal_session_stages,
    test_temporal_deepening_detection,
    test_temporal_closing_detection,
    test_temporal_handoff_generation,
    test_temporal_velocity_improving,
    test_temporal_velocity_declining,
]


def run_tests():
    passed = 0
    failed = 0

    print("Therapy Persona Computer Tests (4D)")
    print("=" * 60)

    categories = {
        "EMOTIONAL (X)": ALL_TESTS[:6],
        "RELATIONAL (Y)": ALL_TESTS[6:12],
        "LINGUISTIC (Z)": ALL_TESTS[12:17],
        "TEMPORAL (T)": ALL_TESTS[17:],
    }

    for category, tests in categories.items():
        print(f"\n--- {category} ---")
        for test_fn in tests:
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
