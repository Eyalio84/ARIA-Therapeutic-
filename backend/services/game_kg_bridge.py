"""
Game → Therapy KG Bridge — Maps game events to therapeutic knowledge graph nodes/edges.

Every meaningful game action feeds the user's therapy KG:
- Choices → concern/emotion nodes + explored_in edges
- NPC interactions → coping/trigger nodes
- Quest completions → breakthrough nodes
- Location visits → session context
- Mirror moments → breakthrough/emotion nodes
- Endings → goal nodes
- Free text input → safety check → auto-flagging

Also tracks achievements and auto-flags concerning patterns.
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from data.build_therapy_kg import TherapyKG


# ── Therapeutic Note → Node Type Mapping ─────────────────────────────

# Which therapeutic_note values map to which node types and intensities
THERAPEUTIC_NOTE_MAP = {
    # Approach/growth patterns → breakthrough
    "opens_up_to_support": ("breakthrough", 0.7, "Opened up to support"),
    "assertiveness_breakthrough": ("breakthrough", 0.8, "Assertiveness breakthrough"),
    "empathy_for_antagonist": ("breakthrough", 0.6, "Showed empathy for adversary"),
    "recognizes_need_for_support": ("breakthrough", 0.7, "Recognized need for support"),
    "seeks_support": ("breakthrough", 0.6, "Actively sought support"),
    # Avoidance patterns → concern
    "self_reliant": ("concern", 0.4, "Prefers self-reliance — may avoid seeking help"),
    "cautious_trust": ("concern", 0.3, "Cautious about trust"),
    "strategic_avoidance": ("concern", 0.5, "Strategically avoids confrontation"),
    "avoidance_pattern": ("concern", 0.6, "Avoidance pattern detected"),
    # Emotional patterns → emotion
    "emotional_weight": ("emotion", 0.6, "Carrying emotional weight"),
    "fear_response": ("emotion", 0.5, "Fear-driven response"),
    "anger_expression": ("emotion", 0.5, "Expressed anger in-game"),
}

# Concerning patterns that trigger auto-flagging
FLAGGABLE_NOTES = {
    "avoidance_pattern": ("attention", "avoidance_pattern"),
    "strategic_avoidance": ("info", "avoidance_pattern"),
    "emotional_weight": ("info", "emotional_weight"),
}

# Achievement triggers from game events
ACHIEVEMENT_TRIGGERS = {
    "first_action": "first_step",
    "game_generated": "world_builder",
    "new_location": "new_place",
    "helper_npc_met": "helped_someone",
    "antagonist_confronted": "faced_hard",
    "mirror_expanded": "opened_mirror",
    "session_resumed": "came_back",
    "quest_completed": "finished_quest",
    "item_found": "found_item",
    "npc_talked": "talked_npc",
}


class GameKGBridge:
    """
    Bridges game events to therapy KG and dashboard.

    Usage:
        bridge = GameKGBridge(therapy_service, dashboard_service)
        bridge.process_action_result(user_id, session_id, action_result, player_state)
    """

    def __init__(self, therapy_service=None, dashboard_service=None):
        self._therapy = therapy_service
        self._dashboard = dashboard_service

    def _get_kg(self, user_id: str) -> Optional[TherapyKG]:
        if self._therapy:
            return self._therapy._get_kg(user_id)
        return None

    # ── Main Entry Point ─────────────────────────────────────────────

    def process_action_result(self, user_id: str, session_id: str,
                               result: Dict[str, Any],
                               player_state: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process a GameAction result and write relevant data to therapy KG + dashboard.

        Returns a summary of what was written.
        """
        kg = self._get_kg(user_id)
        if not kg:
            return {"skipped": True, "reason": "no_therapy_service"}

        written = {
            "nodes_added": [],
            "edges_added": [],
            "flags_added": [],
            "achievements": [],
        }

        action_type = result.get("action_type", "")

        # 1. Process KG events from runtime
        kg_events = result.get("kg_events", [])
        for event in kg_events:
            self._process_kg_event(kg, user_id, session_id, event, written)

        # 2. Process action-specific mappings
        if action_type == "choose":
            self._process_choice(kg, user_id, session_id, result, written)
        elif action_type == "talk":
            self._process_npc_talk(kg, user_id, session_id, result, written)
        elif action_type == "move":
            self._process_move(kg, user_id, session_id, result, player_state, written)
        elif action_type == "take":
            self._process_item(kg, user_id, session_id, result, written)
        elif action_type == "ending":
            self._process_ending(kg, user_id, session_id, result, written)

        # 3. Mirror moments
        if result.get("mirror_moment"):
            self._process_mirror(kg, user_id, session_id, result, written)

        # 4. Quest updates
        if result.get("quest_update", {}).get("quest_complete"):
            self._process_quest_complete(kg, user_id, session_id, result, written)

        # 5. Check achievements
        self._check_achievements(user_id, session_id, action_type, result,
                                  player_state, written)

        return written

    # ── Event Processors ─────────────────────────────────────────────

    def _process_kg_event(self, kg: TherapyKG, user_id: str, session_id: str,
                           event: Dict, written: Dict):
        """Process a raw kg_event from the runtime."""
        etype = event.get("type")

        if etype == "add_node":
            node_id = kg.add_node(
                name=event.get("name", "unknown"),
                node_type=event.get("node_type", "concern"),
                description=event.get("description", ""),
                session_id=session_id,
            )
            written["nodes_added"].append(node_id)

        elif etype == "interaction":
            node_id = kg.add_node(
                name=event.get("name", "interaction"),
                node_type=event.get("node_type", "trigger"),
                description=event.get("description", "Game interaction"),
                session_id=session_id,
            )
            written["nodes_added"].append(node_id)

        elif etype == "choice":
            note = event.get("note", "")
            if note in THERAPEUTIC_NOTE_MAP:
                node_type, intensity, description = THERAPEUTIC_NOTE_MAP[note]
                node_id = kg.add_node(
                    name=note,
                    node_type=node_type,
                    description=description,
                    intensity=intensity,
                    session_id=session_id,
                )
                written["nodes_added"].append(node_id)

                # Auto-flag if concerning
                if note in FLAGGABLE_NOTES and self._dashboard:
                    severity, category = FLAGGABLE_NOTES[note]
                    flag_id = self._dashboard.add_flag(
                        user_id, session_id, severity, category,
                        description,
                        user_content=event.get("choice_text", ""),
                    )
                    written["flags_added"].append(flag_id)

    def _process_choice(self, kg: TherapyKG, user_id: str, session_id: str,
                         result: Dict, written: Dict):
        """Process a quest choice with therapeutic mapping."""
        quest_update = result.get("quest_update", {})
        state_changes = result.get("state_changes", {})

        # Track courage/trust changes as emotional indicators
        if state_changes.get("courage", 0) > 0:
            node_id = kg.add_node(
                "courage_growth", "emotion",
                "Player chose a courageous option",
                intensity=0.6, session_id=session_id,
            )
            written["nodes_added"].append(node_id)

        if state_changes.get("trust", 0) > 0:
            node_id = kg.add_node(
                "trust_building", "emotion",
                "Player chose to build trust",
                intensity=0.6, session_id=session_id,
            )
            written["nodes_added"].append(node_id)

    def _process_npc_talk(self, kg: TherapyKG, user_id: str, session_id: str,
                           result: Dict, written: Dict):
        """Process NPC conversation."""
        npc = result.get("npc", {})
        if not npc:
            return

        npc_name = npc.get("name", "unknown")
        npc_role = npc.get("role", "neutral")

        # First conversation with an NPC is always meaningful
        node_id = kg.add_node(
            f"talked_to_{npc_name}", "coping",
            f"Talked to {npc_name} ({npc_role})",
            intensity=0.4, session_id=session_id,
        )
        written["nodes_added"].append(node_id)

    def _process_move(self, kg: TherapyKG, user_id: str, session_id: str,
                       result: Dict, player_state: Dict, written: Dict):
        """Process location change — track exploration."""
        location = result.get("location", {})
        if not location:
            return

        loc_name = location.get("name", "unknown")

        # Track new location discoveries
        visited = player_state.get("visited_locations", []) if player_state else []
        if location.get("id") and location["id"] not in visited:
            node_id = kg.add_node(
                f"discovered_{loc_name}", "goal",
                f"Explored new area: {loc_name}",
                intensity=0.3, session_id=session_id,
            )
            written["nodes_added"].append(node_id)

    def _process_item(self, kg: TherapyKG, user_id: str, session_id: str,
                       result: Dict, written: Dict):
        """Process item pickup."""
        item = result.get("item", {})
        if not item:
            return

        # Items with therapeutic meaning get tracked
        node_id = kg.add_node(
            f"found_{item.get('name', 'item')}", "coping",
            f"Found: {item.get('name', 'unknown item')}",
            intensity=0.3, session_id=session_id,
        )
        written["nodes_added"].append(node_id)

    def _process_ending(self, kg: TherapyKG, user_id: str, session_id: str,
                         result: Dict, written: Dict):
        """Process game ending — major therapeutic event."""
        ending = result.get("ending", {})
        if not ending:
            return

        node_id = kg.add_node(
            f"ending_{ending.get('id', 'unknown')}",
            "breakthrough",
            f"Reached ending: {ending.get('title', 'unknown')}",
            intensity=0.9, session_id=session_id,
        )
        written["nodes_added"].append(node_id)

    def _process_mirror(self, kg: TherapyKG, user_id: str, session_id: str,
                         result: Dict, written: Dict):
        """Process mirror moment — reflective breakthrough."""
        mirror_text = result.get("mirror_text", "")
        node_id = kg.add_node(
            "mirror_moment", "breakthrough",
            f"Mirror moment triggered: {mirror_text[:100]}",
            intensity=0.7, session_id=session_id,
        )
        written["nodes_added"].append(node_id)

    def _process_quest_complete(self, kg: TherapyKG, user_id: str,
                                 session_id: str, result: Dict, written: Dict):
        """Process quest completion — narrative arc achievement."""
        quest_update = result.get("quest_update", {})
        quest_name = quest_update.get("quest", "unknown quest")

        node_id = kg.add_node(
            f"completed_{quest_name}", "breakthrough",
            f"Completed quest: {quest_name}",
            intensity=0.8, session_id=session_id,
        )
        written["nodes_added"].append(node_id)

    # ── Achievement Checking ─────────────────────────────────────────

    def _check_achievements(self, user_id: str, session_id: str,
                             action_type: str, result: Dict,
                             player_state: Dict, written: Dict):
        """Check if any achievements should be awarded."""
        if not self._dashboard:
            return

        triggers = []

        # Action-type triggers
        if action_type == "start":
            triggers.append("first_action")
        elif action_type == "move" and result.get("location"):
            triggers.append("new_location")
        elif action_type == "take":
            triggers.append("item_found")
        elif action_type == "talk":
            npc = result.get("npc", {})
            triggers.append("npc_talked")
            if npc.get("role") == "helper":
                triggers.append("helper_npc_met")
            elif npc.get("role") == "antagonist":
                triggers.append("antagonist_confronted")
        elif action_type == "ending":
            triggers.append("game_generated")

        # Mirror moment
        if result.get("mirror_moment"):
            triggers.append("mirror_expanded")

        # Quest complete
        if result.get("quest_update", {}).get("quest_complete"):
            triggers.append("quest_completed")

        # Award achievements
        for trigger in triggers:
            achievement_id = ACHIEVEMENT_TRIGGERS.get(trigger)
            if achievement_id:
                earned = self._dashboard.earn_achievement(
                    user_id, achievement_id, session_id
                )
                if earned:
                    written["achievements"].append(earned)

    # ── Safety Check for Free Text ───────────────────────────────────

    def check_user_text(self, user_id: str, session_id: str,
                         text: str) -> Optional[Dict]:
        """
        Run safety check on free-text user input.
        Auto-flags concerning content.

        Returns flag dict if flagged, None otherwise.
        """
        if not self._therapy:
            return None

        safety_result = self._therapy.safety.check_user_input(text)

        if safety_result.action in ("escalate", "block") and self._dashboard:
            severity = "urgent" if safety_result.action == "escalate" else "concern"
            flag_id = self._dashboard.add_flag(
                user_id, session_id, severity, "disclosure",
                safety_result.message or "Safety check triggered",
                user_content=text[:500],
            )
            return {
                "flag_id": flag_id,
                "action": safety_result.action,
                "message": safety_result.message,
                "resources": safety_result.resources if hasattr(safety_result, 'resources') else [],
            }

        return None

    # ── Session Events ───────────────────────────────────────────────

    def on_session_start(self, user_id: str, session_id: str,
                          is_returning: bool = False):
        """Called when a game session starts."""
        if is_returning and self._dashboard:
            self._dashboard.earn_achievement(user_id, "came_back", session_id)

    def on_session_end(self, user_id: str, session_id: str,
                        player_state: Dict = None):
        """Called when a game session ends. Summarize for KG."""
        kg = self._get_kg(user_id)
        if not kg:
            return

        # Add session summary node
        turn_count = player_state.get("turn_count", 0) if player_state else 0
        quests_done = len(player_state.get("completed_quests", [])) if player_state else 0

        kg.add_node(
            f"session_{session_id[:8]}", "session",
            f"Game session: {turn_count} turns, {quests_done} quests completed",
            session_id=session_id,
        )
