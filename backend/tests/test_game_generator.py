#!/usr/bin/env python3
"""
Game Generator Tests — interview synthesis → game config.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.game_generator import GameGenerator, GameConfig


gen = GameGenerator()

# Sample synthesis (as produced by GameInterviewEngine)
SAMPLE_SYNTHESIS = {
    "user_id": "test_user",
    "depth": "standard",
    "vibe": "build_cool",
    "character": {
        "name": "Kai",
        "companion": "A brave dolphin named Splash",
        "protects": "their little sister",
        "strength": "they can always find a way when nobody else can",
        "joy": "swimming in the ocean at sunset",
        "fear": "being alone when it matters most",
        "misunderstood": "people think they don't care, but they care too much",
    },
    "world": {
        "safe_place": "A treehouse by the ocean with fairy lights and old books",
        "exciting_place": "The Crystal Caves beneath the island",
        "avoided_place": "The Fog Valley where things get confusing",
        "people": "Mostly friendly but some are hiding secrets",
        "weather": "Sunny with sudden storms that pass quickly",
        "rules": "Animals can understand you if you're being honest",
        "secret_place": "An underwater garden only Splash knows about",
    },
    "story": {
        "catalyst": "The ocean started turning grey and Splash got sick",
        "helper": "Luna, an older girl who knows about the old magic",
        "antagonist": "A creeping fog that steals colors and makes everything dull and heavy",
        "desire": "To bring the colors back and feel alive again",
        "surprise": "They discovered they could sing to the water and it would respond",
        "secret": "Kai caused the grey by accident, trying to protect everyone from a storm",
        "forgiveness": "Kai needs to forgive themselves for the accident",
        "resilience": "Splash never gives up on Kai, even when sick",
    },
    "challenges": {
        "courage_level": "My character is at 4, maybe finding their voice would move it to 5",
        "problem_style": "Find the key — there's always a smarter way",
        "failure_response": "They get quiet for a while, then try again differently",
        "trust_style": "They watch how someone treats animals",
        "solo_or_team": "With others, but they need to know they CAN do it alone too",
    },
    "choices": {
        "risk_preference": "The unknown path — even if it's scary",
        "help_response": "Always help, figure out the risk later",
        "desired_ending": "A quiet peace where everyone is safe and the colors are back",
        "sacrifice": "They'd give up their singing voice to save Splash",
        "selfless_wish": "They'd wish for their little sister to never feel afraid",
    },
    "preferences": {
        "genre": "Fantasy and ocean adventure",
        "cool_things": "dolphins, underwater caves, bioluminescence",
        "hero_reference": "Moana",
        "desired_feeling": "brave and free",
    },
    "interview_stats": {
        "questions_answered": 25,
        "mirror_bubbles_shown": 4,
        "mirror_bubbles_expanded": 2,
    },
}


# ─── Config Generation ──────────────────────────────────────────

def test_generates_config():
    """Generator produces a valid GameConfig."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert isinstance(config, GameConfig)
    assert config.game_id.startswith("game_")

def test_protagonist_name():
    """Protagonist name comes from interview."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.protagonist_name == "Kai"

def test_has_companion():
    """Companion is extracted from interview."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.companion
    assert "Splash" in config.companion.get("name", "") or "Splash" in config.companion.get("description", "")

def test_has_title():
    """Game has a title."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.title
    assert len(config.title) > 3

def test_has_theme():
    """Game has a theme derived from answers."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.theme


# ─── Locations ──────────────────────────────────────────────────

def test_has_locations():
    """Game has 5+ locations."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.locations) >= 5

def test_safe_place_exists():
    """Safe place from interview is a location."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    safe = next((l for l in config.locations if l.id == "safe_place"), None)
    assert safe is not None
    assert safe.atmosphere == "warm"

def test_locations_have_exits():
    """Locations are connected via exits."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    total_exits = sum(len(l.exits) for l in config.locations)
    assert total_exits >= 5, f"Need at least 5 exits, got {total_exits}"

def test_locations_have_mood_colors():
    """Locations have mood colors for atmosphere."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    for loc in config.locations:
        assert loc.mood_color.startswith("#"), f"Location {loc.id} missing mood_color"

def test_starting_location_exists():
    """Starting location is a valid location."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.starting_location
    ids = [l.id for l in config.locations]
    assert config.starting_location in ids


# ─── NPCs ───────────────────────────────────────────────────────

def test_has_npcs():
    """Game has 3+ NPCs."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.npcs) >= 3

def test_npc_roles():
    """NPCs include helper, mentor, and wildcard roles."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    roles = {n.role for n in config.npcs}
    assert "helper" in roles
    assert "mentor" in roles
    assert "wildcard" in roles

def test_antagonist_from_interview():
    """Antagonist NPC exists when interview mentions one."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    antagonist = next((n for n in config.npcs if n.role == "antagonist"), None)
    assert antagonist is not None
    assert antagonist.therapeutic_mapping == "externalized_struggle"

def test_npcs_have_therapeutic_mappings():
    """All NPCs have hidden therapeutic mappings."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    for npc in config.npcs:
        assert npc.therapeutic_mapping, f"NPC {npc.id} missing therapeutic_mapping"


# ─── Items ──────────────────────────────────────────────────────

def test_has_items():
    """Game has 5+ items."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.items) >= 5

def test_keepsake_is_starting_item():
    """Keepsake (from what character protects) starts in inventory."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    keepsake = next((i for i in config.items if i.id == "keepsake"), None)
    assert keepsake is not None
    assert keepsake.location_id == "inventory"
    assert "sister" in keepsake.description.lower() or "matters" in keepsake.description.lower()

def test_items_have_symbolic_meaning():
    """Items have hidden symbolic meanings."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    with_meaning = [i for i in config.items if i.symbolic_meaning]
    assert len(with_meaning) >= 3


# ─── Quests ─────────────────────────────────────────────────────

def test_has_quests():
    """Game has 2+ quest arcs."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.quests) >= 2

def test_quests_have_branching_choices():
    """Quests have stages with branching choices."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    total_choices = sum(
        len(stage.choices)
        for q in config.quests
        for stage in q.stages
    )
    assert total_choices >= 6, f"Need branching, got {total_choices} total choices"

def test_choices_have_effects():
    """Quest choices have state variable effects."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    choices_with_effects = 0
    for q in config.quests:
        for stage in q.stages:
            for choice in stage.choices:
                if choice.effects:
                    choices_with_effects += 1
    assert choices_with_effects >= 4

def test_quests_have_therapeutic_mappings():
    """Quests have hidden therapeutic mappings."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    for q in config.quests:
        assert q.therapeutic_mapping, f"Quest {q.id} missing therapeutic_mapping"

def test_choices_have_therapeutic_notes():
    """Individual choices have therapeutic notes."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    notes = []
    for q in config.quests:
        for stage in q.stages:
            for choice in stage.choices:
                if choice.therapeutic_note:
                    notes.append(choice.therapeutic_note)
    assert len(notes) >= 5, f"Need therapeutic notes on choices, got {len(notes)}"


# ─── Endings ────────────────────────────────────────────────────

def test_has_endings():
    """Game has 2+ endings."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.endings) >= 2

def test_endings_have_conditions():
    """At least some endings have trigger conditions."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    with_conditions = [e for e in config.endings if e.conditions]
    assert len(with_conditions) >= 1

def test_endings_mention_protagonist():
    """Endings reference the protagonist by name."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    for ending in config.endings:
        assert "Kai" in ending.narrative, f"Ending {ending.id} doesn't mention protagonist"


# ─── State Variables ────────────────────────────────────────────

def test_has_state_variables():
    """Game has state variables."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert "courage" in config.state_variables
    assert "trust" in config.state_variables

def test_courage_from_interview():
    """Courage starts at the level mentioned in interview."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert config.state_variables["courage"] == 4  # "My character is at 4"


# ─── Visual Map ─────────────────────────────────────────────────

def test_visual_map_has_nodes():
    """Visual map contains location nodes."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.visual_map["nodes"]) == len(config.locations)

def test_visual_map_has_edges():
    """Visual map contains connection edges."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    assert len(config.visual_map["edges"]) >= 3


# ─── Serialization ──────────────────────────────────────────────

def test_to_json():
    """Config serializes to valid JSON."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    json_str = config.to_json()
    import json
    parsed = json.loads(json_str)
    assert parsed["protagonist_name"] == "Kai"
    assert len(parsed["locations"]) >= 5

def test_to_dict():
    """Config converts to dict."""
    config = gen.generate(SAMPLE_SYNTHESIS)
    d = config.to_dict()
    assert isinstance(d, dict)
    assert d["protagonist_name"] == "Kai"


# ─── Edge Cases ─────────────────────────────────────────────────

def test_minimal_synthesis():
    """Generator handles minimal (mostly empty) synthesis."""
    minimal = {
        "user_id": "minimal",
        "depth": "quick",
        "vibe": "build_cool",
        "character": {"name": ""},
        "world": {},
        "story": {},
        "challenges": {},
        "choices": {},
        "preferences": {},
    }
    config = gen.generate(minimal)
    assert config.protagonist_name == "Hero"  # Default
    assert len(config.locations) >= 5
    assert len(config.quests) >= 2


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    test_generates_config,
    test_protagonist_name,
    test_has_companion,
    test_has_title,
    test_has_theme,
    test_has_locations,
    test_safe_place_exists,
    test_locations_have_exits,
    test_locations_have_mood_colors,
    test_starting_location_exists,
    test_has_npcs,
    test_npc_roles,
    test_antagonist_from_interview,
    test_npcs_have_therapeutic_mappings,
    test_has_items,
    test_keepsake_is_starting_item,
    test_items_have_symbolic_meaning,
    test_has_quests,
    test_quests_have_branching_choices,
    test_choices_have_effects,
    test_quests_have_therapeutic_mappings,
    test_choices_have_therapeutic_notes,
    test_has_endings,
    test_endings_have_conditions,
    test_endings_mention_protagonist,
    test_has_state_variables,
    test_courage_from_interview,
    test_visual_map_has_nodes,
    test_visual_map_has_edges,
    test_to_json,
    test_to_dict,
    test_minimal_synthesis,
]


def run_tests():
    passed = 0
    failed = 0

    print("Game Generator Tests")
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
