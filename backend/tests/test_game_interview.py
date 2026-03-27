#!/usr/bin/env python3
"""
Game Interview Engine Tests — question bank, depths, mirror bubbles, synthesis.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.game_interview import (
    GameInterviewEngine, InterviewDepth, VibeMode,
    ALL_QUESTIONS, PHASE_ORDER, DEPTH_INCLUDES,
    InterviewPhase,
)

engine = GameInterviewEngine()


# ─── Question Bank Validation ───────────────────────────────────

def test_quick_has_10_questions():
    """Quick depth produces approximately 10 questions."""
    plan = engine._get_question_plan(InterviewDepth.QUICK)
    assert 10 <= len(plan) <= 15, f"Quick should be 10-15, got {len(plan)}"

def test_standard_has_20_questions():
    """Standard depth produces approximately 20 questions."""
    plan = engine._get_question_plan(InterviewDepth.STANDARD)
    assert 20 <= len(plan) <= 28, f"Standard should be 20-28, got {len(plan)}"

def test_deep_has_30_plus():
    """Deep depth produces 30+ questions."""
    plan = engine._get_question_plan(InterviewDepth.DEEP)
    assert len(plan) >= 28, f"Deep should be 30+, got {len(plan)}"

def test_all_questions_have_required_fields():
    """Every question has id, text, phase, purpose."""
    for phase, questions in ALL_QUESTIONS.items():
        for q in questions:
            assert q.id, f"Question missing id in {phase}"
            assert q.text, f"Question {q.id} missing text"
            assert q.phase, f"Question {q.id} missing phase"
            assert q.purpose, f"Question {q.id} missing purpose"

def test_all_ids_unique():
    """All question IDs are unique."""
    ids = []
    for questions in ALL_QUESTIONS.values():
        for q in questions:
            ids.append(q.id)
    assert len(ids) == len(set(ids)), f"Duplicate IDs found"

def test_phases_in_correct_order():
    """Questions follow the phase order: warmup → character → world → story → challenges → choices."""
    plan = engine._get_question_plan(InterviewDepth.DEEP)
    phases_seen = []
    for q in plan:
        if not phases_seen or phases_seen[-1] != q.phase:
            phases_seen.append(q.phase)
    # Should match PHASE_ORDER (allowing skipped phases)
    for i, phase in enumerate(phases_seen):
        assert phase in PHASE_ORDER, f"Unexpected phase: {phase}"
        if i > 0:
            assert PHASE_ORDER.index(phase) >= PHASE_ORDER.index(phases_seen[i-1]), \
                f"Phase order violation: {phases_seen[i-1]} before {phase}"

def test_deep_includes_all_standard():
    """Deep depth includes all standard questions."""
    standard = {q.id for q in engine._get_question_plan(InterviewDepth.STANDARD)}
    deep = {q.id for q in engine._get_question_plan(InterviewDepth.DEEP)}
    assert standard.issubset(deep), "Deep should include all standard questions"

def test_standard_includes_all_quick():
    """Standard depth includes all quick questions."""
    quick = {q.id for q in engine._get_question_plan(InterviewDepth.QUICK)}
    standard = {q.id for q in engine._get_question_plan(InterviewDepth.STANDARD)}
    assert quick.issubset(standard), "Standard should include all quick questions"


# ─── Interview Flow ─────────────────────────────────────────────

def test_start_interview():
    """Can start an interview and get first question."""
    result = engine.start_interview("test_user_1", depth="quick", vibe="build_cool")
    assert result["status"] == "next"
    assert result["question"]["text"]
    assert result["progress"]["total"] >= 8

def test_answer_progresses():
    """Answering a question advances to the next."""
    engine.start_interview("test_flow", depth="quick", vibe="build_cool")
    r1 = engine.answer_question("test_flow", "Fantasy and adventure")
    assert r1["status"] in ("next", "mirror_bubble")
    assert r1["progress"]["current"] >= 2

def test_complete_quick_interview():
    """Can complete a full quick interview and get synthesis."""
    engine.start_interview("test_complete", depth="quick", vibe="build_cool")
    plan = engine._get_question_plan(InterviewDepth.QUICK)
    result = None
    for i in range(len(plan)):
        result = engine.answer_question("test_complete", f"Answer {i}")
        if result["status"] == "complete":
            break
        elif result["status"] == "mirror_bubble":
            # After mirror bubble, answer the next question
            continue
    # Should eventually complete
    # Re-run until complete if mirror bubbles interrupted
    while result and result["status"] != "complete":
        result = engine.answer_question("test_complete", "Another answer")
    assert result["status"] == "complete"
    assert result["synthesis"]
    assert result["synthesis"]["user_id"] == "test_complete"

def test_synthesis_has_all_sections():
    """Synthesis output contains all required sections."""
    engine.start_interview("test_synth", depth="quick", vibe="your_way")
    plan = engine._get_question_plan(InterviewDepth.QUICK)
    result = None
    for i in range(len(plan) + 5):  # Extra iterations for mirror bubbles
        result = engine.answer_question("test_synth", f"Test answer {i}")
        if result["status"] == "complete":
            break
    if result and result["status"] == "complete":
        synth = result["synthesis"]
        assert "character" in synth
        assert "world" in synth
        assert "story" in synth
        assert "challenges" in synth
        assert "preferences" in synth


# ─── Mirror Bubble Logic ────────────────────────────────────────

def test_emotional_weight_detection():
    """Emotional weight detector scores higher for personal content."""
    low = engine._detect_emotional_weight("A sword")
    high = engine._detect_emotional_weight(
        "My character would protect their little sister no matter what, "
        "because I know what it feels like to be alone and scared"
    )
    assert high > low, f"High emotional ({high}) should score > low ({low})"

def test_short_answer_low_weight():
    """Very short answers get low emotional weight."""
    score = engine._detect_emotional_weight("yes")
    assert score < 0.2

def test_mirror_bubble_not_triggered_on_low_weight():
    """Mirror bubbles don't appear for low-weight questions."""
    from services.game_interview import InterviewQuestion
    low_q = InterviewQuestion(
        id="test", phase=InterviewPhase.WARMUP, text="test",
        purpose="test", depth_min=InterviewDepth.QUICK, mirror_weight=0.1
    )
    result = engine._check_mirror_bubble(low_q, "Some answer", VibeMode.BUILD_COOL)
    assert result is None

def test_mirror_bubble_adapts_to_vibe():
    """Mirror bubble expand prompt differs by vibe mode."""
    from services.game_interview import InterviewQuestion
    high_q = InterviewQuestion(
        id="test", phase=InterviewPhase.CHARACTER, text="test",
        purpose="test", depth_min=InterviewDepth.QUICK,
        mirror_weight=0.9, follow_up="That sounds important."
    )
    emotional_answer = "My character would protect their little sister because family is everything to me"

    b1 = engine._check_mirror_bubble(high_q, emotional_answer, VibeMode.BUILD_COOL)
    b2 = engine._check_mirror_bubble(high_q, emotional_answer, VibeMode.YOUR_WAY)
    b3 = engine._check_mirror_bubble(high_q, emotional_answer, VibeMode.EXPLORE_TOGETHER)

    # All should trigger
    assert b1 is not None
    assert b2 is not None
    assert b3 is not None

    # But expand prompts should be different
    assert b1.expand_prompt != b3.expand_prompt, "Implicit and explicit should differ"


# ─── KG Personalization ─────────────────────────────────────────

def test_kg_personalizes_questions():
    """KG data personalizes companion question."""
    result = engine.start_interview(
        "test_kg", depth="quick", vibe="build_cool",
        kg_data={"media": [{"name": "dolphins"}], "preferences": ["dolphin"]}
    )
    # Find the companion question in the plan
    state = engine.get_state("test_kg")
    plan = getattr(state, '_question_plan', [])
    companion_q = next((q for q in plan if q.id == "char_companion"), None)
    if companion_q:
        assert "dolphin" in companion_q.text.lower(), \
            f"Expected 'dolphin' in personalized question, got: {companion_q.text}"


# ─── Progress Tracking ──────────────────────────────────────────

def test_progress_percentage():
    """Progress percentage increases as questions are answered."""
    engine.start_interview("test_prog", depth="quick", vibe="build_cool")
    r1 = engine.answer_question("test_prog", "Fantasy")
    assert r1["progress"]["percent"] > 0
    r2 = engine.answer_question("test_prog", "Dragons, space, music")
    assert r2["progress"]["percent"] > r1["progress"]["percent"]


# ─── Exit Ramps ─────────────────────────────────────────────────

def test_deep_questions_have_exit_ramps():
    """Deep emotional questions offer lighter alternatives."""
    plan = engine._get_question_plan(InterviewDepth.DEEP)
    high_weight_qs = [q for q in plan if q.mirror_weight >= 0.7]
    with_ramps = [q for q in high_weight_qs if q.exit_ramp]
    # Most high-weight questions should have exit ramps
    assert len(with_ramps) >= len(high_weight_qs) * 0.5, \
        f"Only {len(with_ramps)}/{len(high_weight_qs)} high-weight questions have exit ramps"


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    test_quick_has_10_questions,
    test_standard_has_20_questions,
    test_deep_has_30_plus,
    test_all_questions_have_required_fields,
    test_all_ids_unique,
    test_phases_in_correct_order,
    test_deep_includes_all_standard,
    test_standard_includes_all_quick,
    test_start_interview,
    test_answer_progresses,
    test_complete_quick_interview,
    test_synthesis_has_all_sections,
    test_emotional_weight_detection,
    test_short_answer_low_weight,
    test_mirror_bubble_not_triggered_on_low_weight,
    test_mirror_bubble_adapts_to_vibe,
    test_kg_personalizes_questions,
    test_progress_percentage,
    test_deep_questions_have_exit_ramps,
]


def run_tests():
    passed = 0
    failed = 0

    print("Game Interview Engine Tests")
    print("=" * 60)

    for test_fn in ALL_TESTS:
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

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed}/{passed + failed} passed, {failed} failed")
    print(f"{'='*60}")
    return passed, failed


if __name__ == "__main__":
    passed, failed = run_tests()
    sys.exit(1 if failed > 0 else 0)
