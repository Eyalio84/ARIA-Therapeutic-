#!/usr/bin/env python3
"""
Game Runtime Tests — the playable engine.
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.game_generator import GameGenerator
from services.game_runtime import GameRuntime, PlayerState

# Generate a game config from the sample interview
from tests.test_game_generator import SAMPLE_SYNTHESIS

gen = GameGenerator()
CONFIG = gen.generate(SAMPLE_SYNTHESIS)
runtime = GameRuntime()


def fresh_game(user_id="player1"):
    """Start a fresh game and return the opening."""
    return runtime.load_game(user_id, CONFIG)


# ─── Game Start ─────────────────────────────────────────────────

def test_load_game():
    """Loading a game returns the opening scene."""
    result = fresh_game("t_load")
    assert result.action_type == "start"
    assert "Kai" in result.narrative
    assert result.location is not None

def test_starting_items_in_inventory():
    """Starting items are in player inventory."""
    fresh_game("t_inv")
    player = runtime.get_state("t_inv")
    assert "keepsake" in player.inventory

def test_first_quest_active():
    """First quest is set as active."""
    fresh_game("t_quest")
    player = runtime.get_state("t_quest")
    assert player.active_quest == "quest_journey"

def test_starting_variables():
    """State variables initialized from config."""
    fresh_game("t_vars")
    player = runtime.get_state("t_vars")
    assert player.variables.get("courage") == 4


# ─── Navigation ─────────────────────────────────────────────────

def test_look():
    """Look command describes current location."""
    fresh_game("t_look")
    result = runtime.process_action("t_look", "look")
    assert result.action_type == "look"
    assert len(result.narrative) > 20

def test_move_valid():
    """Can move to connected location."""
    fresh_game("t_move")
    # Safe place should have exits
    player = runtime.get_state("t_move")
    config = runtime._configs["t_move"]
    loc = runtime._get_location(config, player.location_id)
    if loc and loc.exits:
        direction = list(loc.exits.keys())[0]
        result = runtime.process_action("t_move", "move", direction)
        assert result.action_type == "move"
        assert result.location is not None

def test_move_invalid():
    """Moving in invalid direction fails gracefully."""
    fresh_game("t_bad_move")
    result = runtime.process_action("t_bad_move", "move", "teleport")
    assert result.action_type == "move_fail"

def test_visited_locations_tracked():
    """Moving to a new location adds it to visited list."""
    fresh_game("t_visited")
    player = runtime.get_state("t_visited")
    config = runtime._configs["t_visited"]
    loc = runtime._get_location(config, player.location_id)
    if loc and loc.exits:
        direction = list(loc.exits.keys())[0]
        runtime.process_action("t_visited", "move", direction)
        player = runtime.get_state("t_visited")
        assert len(player.visited_locations) >= 2

def test_map_shows_discovered():
    """Map highlights visited locations."""
    fresh_game("t_map")
    result = runtime.process_action("t_map", "map")
    assert result.map_update
    nodes = result.map_update.get("nodes", [])
    current = [n for n in nodes if n.get("current")]
    assert len(current) == 1


# ─── NPCs ───────────────────────────────────────────────────────

def test_talk_to_npc():
    """Can talk to NPC at current location."""
    fresh_game("t_talk")
    # Move to meeting place where helper NPC is
    runtime.process_action("t_talk", "move", "go out")
    result = runtime.process_action("t_talk", "talk", "helper")
    assert result.action_type == "talk"
    assert result.npc is not None

def test_talk_nonexistent_npc():
    """Talking to nonexistent NPC fails gracefully."""
    fresh_game("t_bad_talk")
    result = runtime.process_action("t_bad_talk", "talk", "nobody")
    assert result.action_type == "talk_fail"

def test_npc_interaction_tracked():
    """NPC interactions are counted."""
    fresh_game("t_npc_count")
    runtime.process_action("t_npc_count", "move", "go out")
    runtime.process_action("t_npc_count", "talk", "helper")
    runtime.process_action("t_npc_count", "talk", "helper")
    player = runtime.get_state("t_npc_count")
    assert player.npc_interactions.get("helper", 0) >= 2


# ─── Items ──────────────────────────────────────────────────────

def test_take_item():
    """Can pick up items at current location."""
    fresh_game("t_take")
    # Find a location with items
    config = runtime._configs["t_take"]
    for loc in config.locations:
        items_at = [i for i in config.items if i.location_id == loc.id]
        if items_at and loc.id != "inventory":
            # Navigate there
            runtime._players["t_take"].location_id = loc.id
            result = runtime.process_action("t_take", "take", items_at[0].id)
            assert result.action_type == "take"
            assert items_at[0].id in runtime.get_state("t_take").inventory
            break

def test_use_item():
    """Can use items from inventory."""
    fresh_game("t_use")
    result = runtime.process_action("t_use", "use", "keepsake")
    assert result.action_type == "use"
    assert "Keepsake" in result.narrative

def test_use_nonexistent_item():
    """Using nonexistent item fails gracefully."""
    fresh_game("t_bad_use")
    result = runtime.process_action("t_bad_use", "use", "banana")
    assert result.action_type == "use_fail"

def test_inventory_command():
    """Inventory command lists items."""
    fresh_game("t_inv_cmd")
    result = runtime.process_action("t_inv_cmd", "inventory")
    assert result.action_type == "inventory"
    assert "Keepsake" in result.narrative


# ─── Quests ─────────────────────────────────────────────────────

def test_quest_status():
    """Quest command shows current quest."""
    fresh_game("t_q_status")
    result = runtime.process_action("t_q_status", "quest")
    assert result.action_type == "quest"
    assert "Journey" in result.narrative

def test_make_quest_choice():
    """Can make quest choices that affect state."""
    fresh_game("t_choice")
    player = runtime.get_state("t_choice")
    # The first quest stage is at safe_place
    result = runtime.process_action("t_choice", "choose", "seek_help")
    assert result.action_type == "choose"
    assert result.state_changes  # Should have effects
    player = runtime.get_state("t_choice")
    assert len(player.choices_log) >= 1

def test_choice_advances_quest():
    """Making a choice advances to the next stage."""
    fresh_game("t_advance")
    player = runtime.get_state("t_advance")
    old_stage = player.active_stage
    runtime.process_action("t_advance", "choose", "investigate_alone")
    player = runtime.get_state("t_advance")
    assert player.active_stage != old_stage or old_stage in player.completed_stages

def test_choices_logged_with_therapeutic_notes():
    """Choice log includes therapeutic notes."""
    fresh_game("t_notes")
    runtime.process_action("t_notes", "choose", "seek_help")
    player = runtime.get_state("t_notes")
    assert player.choices_log
    assert player.choices_log[0].get("therapeutic_note")

def test_kg_events_from_choices():
    """Quest choices generate KG events."""
    fresh_game("t_kg")
    result = runtime.process_action("t_kg", "choose", "seek_help")
    assert result.kg_events  # Should have at least one KG event


# ─── State & Save/Restore ──────────────────────────────────────

def test_status_command():
    """Status command shows player state."""
    fresh_game("t_status")
    result = runtime.process_action("t_status", "status")
    assert result.action_type == "status"
    assert "Kai" in result.narrative

def test_save_state():
    """Can save player state as dict."""
    fresh_game("t_save")
    runtime.process_action("t_save", "choose", "seek_help")
    state = runtime.save_state("t_save")
    assert state["turn_count"] >= 1
    assert len(state["choices_log"]) >= 1
    assert state["location_id"]

def test_restore_state():
    """Can restore a saved game — THE HANDOFF."""
    fresh_game("t_restore")
    runtime.process_action("t_restore", "move", "go out")
    runtime.process_action("t_restore", "choose", "seek_help")
    saved = runtime.save_state("t_restore")

    # Clear and restore
    del runtime._players["t_restore"]
    result = runtime.restore_state("t_restore", CONFIG, saved)
    assert result.action_type == "restore"
    assert "Kai" in result.narrative
    assert result.location is not None
    # State should be preserved
    player = runtime.get_state("t_restore")
    assert len(player.choices_log) >= 1

def test_available_actions_contextual():
    """Available actions change based on context."""
    fresh_game("t_actions")
    result = runtime.process_action("t_actions", "look")
    actions = result.available_actions
    assert "look" in actions
    assert "status" in actions
    assert any("go" in a for a in actions)  # At least one exit


# ─── Session Management ────────────────────────────────────────

def test_session_timer():
    """Session timer detects when time is up."""
    fresh_game("t_timer")
    player = runtime.get_state("t_timer")
    # Fake elapsed time
    player.session_start_time = time.time() - 1300  # 21+ minutes ago
    result = runtime.check_session_time("t_timer", max_minutes=20)
    assert result is not None
    assert result.is_rest_point

def test_session_timer_not_expired():
    """Session timer returns None when time remains."""
    fresh_game("t_timer_ok")
    result = runtime.check_session_time("t_timer_ok", max_minutes=20)
    assert result is None


# ─── Mirror Moments ─────────────────────────────────────────────

def test_item_use_can_trigger_mirror():
    """Using symbolic items can trigger mirror moments."""
    fresh_game("t_mirror")
    result = runtime.process_action("t_mirror", "use", "keepsake")
    # Keepsake is symbolic (core_value)
    assert result.mirror_moment is True
    assert result.mirror_text


# ─── Edge Cases ─────────────────────────────────────────────────

def test_unknown_action():
    """Unknown actions fail gracefully with help text."""
    fresh_game("t_unknown")
    result = runtime.process_action("t_unknown", "dance")
    assert result.action_type == "unknown"
    assert "try" in result.narrative.lower()

def test_no_active_game():
    """Actions without a loaded game fail gracefully."""
    result = runtime.process_action("nonexistent_user", "look")
    assert result.action_type == "error"


# ─── Runner ─────────────────────────────────────────────────────

ALL_TESTS = [
    # Start (4)
    test_load_game,
    test_starting_items_in_inventory,
    test_first_quest_active,
    test_starting_variables,
    # Navigation (5)
    test_look,
    test_move_valid,
    test_move_invalid,
    test_visited_locations_tracked,
    test_map_shows_discovered,
    # NPCs (3)
    test_talk_to_npc,
    test_talk_nonexistent_npc,
    test_npc_interaction_tracked,
    # Items (4)
    test_take_item,
    test_use_item,
    test_use_nonexistent_item,
    test_inventory_command,
    # Quests (5)
    test_quest_status,
    test_make_quest_choice,
    test_choice_advances_quest,
    test_choices_logged_with_therapeutic_notes,
    test_kg_events_from_choices,
    # State (4)
    test_status_command,
    test_save_state,
    test_restore_state,
    test_available_actions_contextual,
    # Sessions (2)
    test_session_timer,
    test_session_timer_not_expired,
    # Mirror (1)
    test_item_use_can_trigger_mirror,
    # Edge cases (2)
    test_unknown_action,
    test_no_active_game,
]


def run_tests():
    passed = 0
    failed = 0

    print("Game Runtime Tests")
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
