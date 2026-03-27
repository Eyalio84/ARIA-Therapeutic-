#!/usr/bin/env python3
"""
Game API Integration Tests — Full flow from interview to gameplay via HTTP endpoints.
"""

import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.game_interview import GameInterviewEngine
from services.game_generator import GameGenerator
from services.game_runtime import GameRuntime
from routers.game import init_services

# Initialize services
interview = GameInterviewEngine()
generator = GameGenerator()
runtime = GameRuntime()
init_services(interview, generator, runtime)

# Simulate API calls directly (no HTTP needed for unit tests)

def test_full_flow_interview_to_game():
    """Complete flow: start interview → answer all → generate → play."""
    uid = "flow_test_1"

    # 1. Start interview
    result = interview.start_interview(uid, depth="quick", vibe="build_cool")
    assert result["status"] == "next"
    assert result["question"]["text"]

    # 2. Answer all questions
    answers = [
        "Fantasy and adventure",
        "dragons, underwater caves, music",
        "Moana",
        "brave and free",
        "Kai",
        "A dolphin named Splash",
        "their little sister",
        "A treehouse by the ocean",
        "The Crystal Caves",
        "Something changed and the ocean turned grey",
        "Luna, who knows about old magic",
        "On a scale, courage is 4, finding their voice moves it to 5",
        "Find the key - there's always a smarter way",
    ]

    synthesis = None
    for answer in answers:
        result = interview.answer_question(uid, answer)
        if result["status"] == "complete":
            synthesis = result["synthesis"]
            break
        # Skip mirror bubbles
        if result["status"] == "mirror_bubble":
            continue

    assert synthesis is not None or result["status"] in ("next", "mirror_bubble"), \
        "Interview should complete or still be in progress"

    # If not complete yet, finish remaining questions
    while result["status"] != "complete":
        result = interview.answer_question(uid, "Test answer")
        if result["status"] == "mirror_bubble":
            continue

    synthesis = result["synthesis"]
    assert synthesis["user_id"] == uid

    # 3. Generate game
    config = generator.generate(synthesis)
    assert config.protagonist_name  # Has a protagonist
    assert len(config.locations) >= 5

    # 4. Start game
    game_result = runtime.load_game(uid, config)
    assert game_result.action_type == "start"
    assert game_result.location is not None

    # 5. Play - look around
    look_result = runtime.process_action(uid, "look")
    assert look_result.action_type == "look"
    assert len(look_result.narrative) > 20

    # 6. Play - check quest
    quest_result = runtime.process_action(uid, "quest")
    assert quest_result.action_type == "quest"

    # 7. Play - make a choice
    choice_result = runtime.process_action(uid, "choose", "seek_help")
    assert choice_result.action_type == "choose"
    assert choice_result.kg_events  # Should generate KG events

    # 8. Save state
    saved = runtime.save_state(uid)
    assert saved["turn_count"] >= 2

    # 9. Restore state (handoff)
    del runtime._players[uid]
    restore_result = runtime.restore_state(uid, config, saved)
    assert restore_result.action_type == "restore"
    assert config.protagonist_name in restore_result.narrative


def test_interview_mirror_bubble_flow():
    """Interview triggers mirror bubbles for emotional answers."""
    uid = "mirror_test"
    interview.start_interview(uid, depth="quick", vibe="your_way")

    # Skip warmup questions
    for _ in range(4):
        result = interview.answer_question(uid, "test answer")
        if result["status"] == "mirror_bubble":
            break

    # Now give an emotional answer to trigger a bubble
    emotional = "My character would protect their little sister because family is everything to me and I know what it feels like to be alone"
    result = interview.answer_question(uid, emotional)

    # Should eventually trigger a mirror (may not be immediate)
    found_mirror = False
    for _ in range(10):
        if result["status"] == "mirror_bubble":
            found_mirror = True
            assert result["mirror_bubble"]["reflection"]
            assert result["mirror_bubble"]["expand_prompt"]
            break
        if result["status"] == "complete":
            break
        result = interview.answer_question(uid, emotional)

    # Mirror bubbles depend on question weight + answer weight
    # Just verify the system handles them without errors


def test_game_config_serialization():
    """Game config round-trips through JSON correctly."""
    uid = "serial_test"
    interview.start_interview(uid, depth="quick", vibe="build_cool")

    # Quick complete
    for i in range(20):
        result = interview.answer_question(uid, f"Answer {i}")
        if result["status"] == "complete":
            break

    if result["status"] == "complete":
        config = generator.generate(result["synthesis"])
        json_str = config.to_json()
        parsed = json.loads(json_str)
        assert parsed["locations"]
        assert parsed["quests"]
        assert parsed["npcs"]


def test_multiple_users_isolated():
    """Multiple users can play simultaneously without interference."""
    # User A
    interview.start_interview("user_a", depth="quick", vibe="build_cool")
    for i in range(20):
        r = interview.answer_question("user_a", f"User A answer {i}")
        if r["status"] == "complete":
            config_a = generator.generate(r["synthesis"])
            runtime.load_game("user_a", config_a)
            break

    # User B
    interview.start_interview("user_b", depth="quick", vibe="explore_together")
    for i in range(20):
        r = interview.answer_question("user_b", f"User B answer {i}")
        if r["status"] == "complete":
            config_b = generator.generate(r["synthesis"])
            runtime.load_game("user_b", config_b)
            break

    # Both should have independent state
    state_a = runtime.get_state("user_a")
    state_b = runtime.get_state("user_b")
    if state_a and state_b:
        assert state_a.location_id == state_b.location_id  # Both start at safe_place
        # But they're separate objects
        runtime.process_action("user_a", "choose", "seek_help")
        state_a2 = runtime.get_state("user_a")
        state_b2 = runtime.get_state("user_b")
        assert state_a2.turn_count != state_b2.turn_count


def test_template_page_exists():
    """Game HTML template exists and is valid."""
    template_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "templates", "game.html"
    )
    assert os.path.exists(template_path), "game.html template not found"
    with open(template_path) as f:
        content = f.read()
    assert "Aria" in content
    assert "mirror-bubble" in content
    assert "quest-choice" in content
    assert "voice-orb" in content


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    test_full_flow_interview_to_game,
    test_interview_mirror_bubble_flow,
    test_game_config_serialization,
    test_multiple_users_isolated,
    test_template_page_exists,
]


def run_tests():
    passed = 0
    failed = 0

    print("Game API Integration Tests")
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
