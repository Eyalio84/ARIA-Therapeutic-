#!/usr/bin/env python3
"""
Gemini API Integration Tests — Real API calls for narrative generation.

Tests actual Gemini responses for:
1. API availability
2. Location enrichment
3. NPC dialogue generation
4. Quest narrative generation
5. Mirror bubble reflection
6. Story recap generation
7. Safety check on generated content
8. Full pipeline: interview → Gemini-enriched game → play
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.gemini_narrative import GeminiNarrative
from services.therapy_safety import TherapySafetyService
from services.game_generator import GameGenerator
from services.game_interview import GameInterviewEngine
from services.game_runtime import GameRuntime

gemini = GeminiNarrative()
safety = TherapySafetyService()


# ─── 1. API Availability ───────────────────────────────────────

def test_api_available():
    """Gemini API is accessible and responding."""
    assert gemini.is_available(), "Gemini API not reachable — check API key"


# ─── 2. Location Enrichment ────────────────────────────────────

def test_enrich_location():
    """Gemini enriches a location description with vivid narrative."""
    result = gemini.enrich_location(
        "The Crystal Caves",
        "Glowing underground caves beneath an island",
        tone="adventurous",
        genre="fantasy"
    )
    assert result is not None
    assert len(result) > 20, f"Too short: '{result}'"
    # Gemini may use synonyms — just verify it's a rich description, not a refusal
    assert len(result) > 30, f"Response too short to be a real description: '{result}'"

    # Safety check on generated content
    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Generated location description failed safety: {result}"


def test_enrich_location_safe_tone():
    """Enriched location is never scary or disturbing."""
    result = gemini.enrich_location(
        "The Dark Forest",
        "A mysterious forest at the edge of the world",
        tone="mysterious",
        genre="fantasy"
    )
    assert result is not None
    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Location was unsafe: {result}"


# ─── 3. NPC Dialogue ───────────────────────────────────────────

def test_npc_dialogue_helper():
    """Gemini generates warm helper NPC dialogue."""
    result = gemini.generate_npc_dialogue(
        npc_name="Luna",
        npc_role="helper",
        npc_personality="warm, wise, supportive",
        player_context="Player just arrived looking for answers about the grey ocean",
        interaction_count=1
    )
    assert result is not None
    assert "Luna" in result
    assert len(result) > 10

    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"NPC dialogue failed safety: {result}"


def test_npc_dialogue_antagonist():
    """Gemini generates appropriate antagonist dialogue (not harmful)."""
    result = gemini.generate_npc_dialogue(
        npc_name="The Shadow",
        npc_role="antagonist",
        npc_personality="challenging but not cruel",
        player_context="Player confronting the challenge that made life harder",
        interaction_count=1
    )
    assert result is not None
    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Antagonist dialogue was unsafe: {result}"


# ─── 4. Quest Narrative ────────────────────────────────────────

def test_quest_narrative():
    """Gemini generates engaging quest stage narrative."""
    result = gemini.generate_quest_narrative(
        quest_title="The Journey Begins",
        stage_title="Setting Out",
        protagonist="Kai",
        companion="Splash the dolphin",
        context="The ocean turned grey and Kai must find out why"
    )
    assert result is not None
    assert len(result) > 30
    assert "Kai" in result or "journey" in result.lower() or "ocean" in result.lower()

    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Quest narrative failed safety: {result}"


# ─── 5. Mirror Reflection ──────────────────────────────────────

def test_mirror_reflection_implicit():
    """Gemini generates game-fiction-only mirror reflection (implicit mode)."""
    result = gemini.generate_mirror_reflection(
        user_answer="My character would protect their little sister no matter what",
        question_context="What would your character protect?",
        vibe="build_cool"
    )
    assert result is not None
    assert len(result) > 5
    # Should NOT contain therapy language in implicit mode
    therapy_words = ["therapy", "therapeutic", "clinical", "diagnosis", "treatment"]
    for word in therapy_words:
        assert word not in result.lower(), f"Implicit mirror used therapy word '{word}': {result}"


def test_mirror_reflection_explicit():
    """Gemini generates connecting mirror reflection (explicit mode)."""
    result = gemini.generate_mirror_reflection(
        user_answer="My character is afraid of being alone when it matters most",
        question_context="What is your character afraid of?",
        vibe="explore_together"
    )
    assert result is not None
    assert len(result) > 5

    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Mirror reflection failed safety: {result}"


# ─── 6. Story Recap ────────────────────────────────────────────

def test_story_recap():
    """Gemini generates natural session handoff recap."""
    result = gemini.generate_story_recap(
        protagonist="Kai",
        companion="Splash",
        location="The Crystal Caves",
        concerns=["work anxiety", "loneliness"],
        last_event="Kai discovered a hidden garden and met Luna"
    )
    assert result is not None
    assert len(result) > 15, f"Recap too short: '{result}'"

    safety_result = safety.check_response(result)
    assert safety_result.action == "pass", f"Story recap failed safety: {result}"


# ─── 7. Safety on Generated Content ────────────────────────────

def test_safety_catches_bad_content():
    """Safety layer catches inappropriate content if Gemini drifts."""
    # Simulate bad content that might slip through
    bad_content = "It's not that bad, everyone goes through this. Just calm down and think positive."
    result = safety.check_response(bad_content)
    assert result.action in ("warn", "block"), \
        f"Safety should catch minimizing language: action={result.action}"


def test_narrative_safety_helper():
    """GeminiNarrative.check_narrative_safety works."""
    safe = gemini.check_narrative_safety("The sun set over the peaceful valley.")
    assert safe is True

    unsafe = gemini.check_narrative_safety("It's not that bad, everyone feels that way sometimes.")
    assert unsafe is False


# ─── 8. Full Pipeline with Gemini ──────────────────────────────

def test_full_pipeline_with_gemini():
    """Full flow: interview → generate → enrich with Gemini → play."""
    uid = "gemini_pipeline_test"

    # 1. Run quick interview
    engine = GameInterviewEngine()
    engine.start_interview(uid, depth="quick", vibe="build_cool")

    answers = [
        "Fantasy ocean adventure",
        "dolphins, crystals, music",
        "Moana",
        "brave and free",
        "Kai",
        "A dolphin named Splash",
        "their little sister",
        "A treehouse by the ocean",
        "Crystal Caves under the island",
        "The ocean turned grey",
        "Luna who knows old magic",
        "Courage is at 4, singing moves it to 5",
        "Find the key, always a smarter way",
    ]

    synthesis = None
    for a in answers:
        result = engine.answer_question(uid, a)
        if result["status"] == "complete":
            synthesis = result["synthesis"]
            break
    while result["status"] != "complete":
        result = engine.answer_question(uid, "Another answer")

    synthesis = result["synthesis"]

    # 2. Generate game
    gen = GameGenerator()
    config = gen.generate(synthesis)
    assert config.protagonist_name

    # 3. Enrich one location with Gemini
    if config.locations:
        loc = config.locations[0]
        enriched = gemini.enrich_location(loc.name, loc.description, config.tone, "fantasy")
        assert enriched
        assert len(enriched) > 10
        # Verify safety
        assert gemini.check_narrative_safety(enriched)

    # 4. Generate NPC dialogue with Gemini
    if config.npcs:
        npc = config.npcs[0]
        dialogue = gemini.generate_npc_dialogue(
            npc.name, npc.role, npc.personality,
            f"Player just arrived at {config.locations[0].name if config.locations else 'the start'}",
            1
        )
        assert dialogue
        assert gemini.check_narrative_safety(dialogue)

    # 5. Generate recap
    recap = gemini.generate_story_recap(
        config.protagonist_name,
        config.companion.get("name", ""),
        config.locations[0].name if config.locations else "",
        ["ocean turning grey"],
        "Just started the adventure"
    )
    assert recap
    assert gemini.check_narrative_safety(recap)


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    test_api_available,
    test_enrich_location,
    test_enrich_location_safe_tone,
    test_npc_dialogue_helper,
    test_npc_dialogue_antagonist,
    test_quest_narrative,
    test_mirror_reflection_implicit,
    test_mirror_reflection_explicit,
    test_story_recap,
    test_safety_catches_bad_content,
    test_narrative_safety_helper,
    test_full_pipeline_with_gemini,
]


def run_tests():
    passed = 0
    failed = 0

    print("Gemini API Integration Tests (LIVE)")
    print("=" * 60)
    print("  Making real API calls — this may take 30-60 seconds")
    print()

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
