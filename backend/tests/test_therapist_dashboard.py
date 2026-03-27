#!/usr/bin/env python3
"""
Therapist Dashboard Tests — clinical oversight features.
"""

import sys
import os
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.therapist_dashboard import TherapistDashboardService, ACHIEVEMENT_DEFS
from data.build_therapy_kg import TherapyKG

_test_dir = None

def setup():
    global _test_dir
    _test_dir = tempfile.mkdtemp()

def teardown():
    global _test_dir
    if _test_dir and os.path.exists(_test_dir):
        shutil.rmtree(_test_dir)

def make_dashboard():
    return TherapistDashboardService(data_dir=_test_dir)


# ─── Choice Timeline ───────────────────────────────────────────

def test_choice_timeline():
    """Builds choice evolution timeline from choices log."""
    dash = make_dashboard()
    log = [
        {"quest": "quest_journey", "choice": "seek_help", "therapeutic_note": "seeks_support", "turn": 1},
        {"quest": "quest_challenge", "choice": "confront", "therapeutic_note": "confrontation", "turn": 5},
        {"quest": "quest_challenge", "choice": "stand_firm", "therapeutic_note": "assertiveness_breakthrough", "turn": 8},
    ]
    result = dash.get_choice_timeline("alice", log)
    assert result["total_choices"] == 3
    assert len(result["timeline"]) == 3
    dash.close()

def test_choice_pattern_detection():
    """Detects shift from avoidance to engagement."""
    dash = make_dashboard()
    log = [
        {"quest": "q1", "choice": "c1", "therapeutic_note": "self_reliant", "turn": 1},
        {"quest": "q1", "choice": "c2", "therapeutic_note": "cautious_trust", "turn": 2},
        {"quest": "q2", "choice": "c3", "therapeutic_note": "opens_up_to_support", "turn": 5},
        {"quest": "q2", "choice": "c4", "therapeutic_note": "assertiveness_breakthrough", "turn": 8},
    ]
    result = dash.get_choice_timeline("bob", log)
    patterns = result["patterns"]
    assert any("avoidance" in p.lower() or "engagement" in p.lower() or "breakthrough" in p.lower()
               for p in patterns), f"Expected pattern detection, got: {patterns}"
    dash.close()


# ─── Mirror Analytics ───────────────────────────────────────────

def test_mirror_analytics_high():
    """High engagement ratio detected correctly."""
    dash = make_dashboard()
    result = dash.get_mirror_analytics({"mirror_bubbles_shown": 5, "mirror_bubbles_expanded": 4})
    assert result["engagement_level"] == "high"
    assert result["engagement_ratio"] == 0.8
    dash.close()

def test_mirror_analytics_low():
    """Low engagement ratio detected correctly."""
    dash = make_dashboard()
    result = dash.get_mirror_analytics({"mirror_bubbles_shown": 5, "mirror_bubbles_expanded": 0})
    assert result["engagement_level"] == "low"
    dash.close()

def test_mirror_analytics_none():
    """No mirrors shown handled gracefully."""
    dash = make_dashboard()
    result = dash.get_mirror_analytics({"mirror_bubbles_shown": 0, "mirror_bubbles_expanded": 0})
    assert "surface-level" in result["interpretation"].lower() or "no mirror" in result["interpretation"].lower()
    dash.close()


# ─── Antagonist Analysis ───────────────────────────────────────

def test_antagonist_analysis():
    """Surfaces antagonist in user's exact words."""
    dash = make_dashboard()
    synthesis = {
        "story": {
            "antagonist": "A creeping fog that steals colors and makes everything dull",
            "desire": "To bring the colors back",
        },
        "character": {"fear": "being alone"},
    }
    result = dash.get_antagonist_analysis(synthesis)
    assert "creeping fog" in result["user_exact_words"]
    assert result["desired_resolution"] == "To bring the colors back"
    assert "Do NOT interpret" in result["interpretation_note"]
    dash.close()


# ─── Session Notes ──────────────────────────────────────────────

def test_add_and_get_notes():
    """Can add and retrieve therapist notes."""
    dash = make_dashboard()
    note_id = dash.add_note("carol", "node", "concern_123", "May relate to family dynamics")
    notes = dash.get_notes("carol")
    assert len(notes) >= 1
    assert notes[0]["note"] == "May relate to family dynamics"
    dash.close()


# ─── Mood Check-In ──────────────────────────────────────────────

def test_record_mood():
    """Can record mood check-in."""
    dash = make_dashboard()
    dash.record_mood("dave", "sess_1", mood_start=2)
    dash.record_mood("dave", "sess_1", mood_end=4)
    history = dash.get_mood_history("dave")
    assert len(history) >= 1
    assert history[0]["mood_start"] == 2
    assert history[0]["mood_end"] == 4
    dash.close()

def test_mood_velocity():
    """Mood velocity detects improving trend."""
    dash = make_dashboard()
    dash.record_mood("eve", "s1", mood_start=2, mood_end=3)
    dash.record_mood("eve", "s2", mood_start=3, mood_end=4)
    velocity = dash.get_mood_velocity("eve")
    assert velocity["trend"] == "improving"
    assert velocity["delta"] == 1
    dash.close()


# ─── Flagged Moments ────────────────────────────────────────────

def test_add_flag():
    """Can flag a moment for therapist attention."""
    dash = make_dashboard()
    flag_id = dash.add_flag(
        "frank", "sess_2", "attention", "disclosure",
        "User described unsafe home through game character",
        "My character's house isn't safe when dad gets angry"
    )
    flags = dash.get_flags("frank")
    assert len(flags) >= 1
    assert flags[0]["severity"] == "attention"
    assert "unsafe home" in flags[0]["description"]
    dash.close()

def test_annotate_flag():
    """Therapist can annotate a flagged moment."""
    dash = make_dashboard()
    flag_id = dash.add_flag("grace", "sess_1", "concern", "emotional_weight",
                            "Recurring protection theme")
    assert dash.annotate_flag(flag_id, "Discussed in clinical session 3/25")
    flags = dash.get_flags("grace")
    assert flags[0]["therapist_note"] == "Discussed in clinical session 3/25"
    dash.close()


# ─── Achievements ───────────────────────────────────────────────

def test_earn_achievement():
    """Can earn an achievement."""
    dash = make_dashboard()
    result = dash.earn_achievement("hank", "first_step", "sess_1")
    assert result is not None
    assert result["title"] == "First Step"
    dash.close()

def test_achievement_not_duplicated():
    """Same achievement can't be earned twice."""
    dash = make_dashboard()
    r1 = dash.earn_achievement("iris", "first_step", "sess_1")
    r2 = dash.earn_achievement("iris", "first_step", "sess_2")
    assert r1 is not None
    assert r2 is None  # Already earned
    dash.close()

def test_get_all_achievements():
    """Get all achievements with earned status."""
    dash = make_dashboard()
    dash.earn_achievement("jack", "first_step")
    dash.earn_achievement("jack", "world_builder")
    all_ach = dash.get_achievements("jack")
    assert len(all_ach) == len(ACHIEVEMENT_DEFS)
    earned = [a for a in all_ach if a["earned"]]
    assert len(earned) == 2
    dash.close()


# ─── Story Recap ────────────────────────────────────────────────

def test_story_recap():
    """Generates story recap for session handoff."""
    dash = make_dashboard()
    kg = TherapyKG("recap_user", data_dir=_test_dir)
    s1 = kg.start_session()
    kg.add_node("work anxiety", "concern", intensity=0.7, session_id=s1)
    kg.end_session(s1)

    recap = dash.generate_story_recap(
        "recap_user",
        kg=kg,
        game_state={"location_id": "Crystal Caves", "turn_count": 12,
                     "completed_quests": ["quest_journey"], "inventory": ["keepsake", "map"]},
        config={"protagonist_name": "Kai", "companion": {"name": "Splash"}}
    )
    assert "Kai" in recap
    assert "Splash" in recap
    assert "Ready to continue" in recap
    kg.close()
    dash.close()


# ─── Full Dashboard ─────────────────────────────────────────────

def test_full_dashboard():
    """Full dashboard compiles all data."""
    dash = make_dashboard()
    kg = TherapyKG("full_test", data_dir=_test_dir)
    kg.add_node("anxiety", "concern", intensity=0.7)

    dash.record_mood("full_test", "s1", mood_start=2, mood_end=3)
    dash.earn_achievement("full_test", "first_step")
    dash.add_flag("full_test", "s1", "info", "emotional_weight", "Test flag")

    result = dash.get_full_dashboard(
        "full_test",
        kg=kg,
        synthesis={"story": {"antagonist": "fear"}, "character": {"fear": "loneliness"}},
        choices_log=[{"quest": "q1", "choice": "c1", "therapeutic_note": "test", "turn": 1}],
        interview_stats={"mirror_bubbles_shown": 3, "mirror_bubbles_expanded": 1},
    )

    assert result["user_id"] == "full_test"
    assert result["kg_stats"]["node_count"] >= 1
    assert result["mood_history"]
    assert result["achievements"]
    assert result["flagged_moments"]
    assert result["antagonist_analysis"]
    assert result["choice_timeline"]
    assert result["mirror_analytics"]

    kg.close()
    dash.close()


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    test_choice_timeline,
    test_choice_pattern_detection,
    test_mirror_analytics_high,
    test_mirror_analytics_low,
    test_mirror_analytics_none,
    test_antagonist_analysis,
    test_add_and_get_notes,
    test_record_mood,
    test_mood_velocity,
    test_add_flag,
    test_annotate_flag,
    test_earn_achievement,
    test_achievement_not_duplicated,
    test_get_all_achievements,
    test_story_recap,
    test_full_dashboard,
]


def run_tests():
    passed = 0
    failed = 0

    print("Therapist Dashboard Tests")
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
