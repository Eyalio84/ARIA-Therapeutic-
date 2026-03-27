"""
Game Runtime — Executes a GameConfig as a playable narrative game.

Handles:
- Location navigation (visual map + exits)
- NPC dialogue
- Item pickup/use
- Quest progression with branching choices
- State variable tracking
- Ending detection
- Session save/restore (perfect continuity)
- KG feedback (every meaningful choice writes to user's therapy KG)
- Timed sessions with natural rest points

The runtime does NOT call an LLM for basic navigation/interaction.
LLM is used only for dynamic NPC dialogue and narrative enrichment.
"""

import json
import os
import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

from services.game_generator import GameConfig, GameLocation, GameNPC, GameItem, Quest, QuestStage, QuestChoice, GameEnding
from services.therapy_safety import TherapySafetyService


# ─────────────────────────────────────────────────────────────────
# Player State
# ─────────────────────────────────────────────────────────────────

@dataclass
class PlayerState:
    """Complete player state — serializable for save/restore."""
    location_id: str
    inventory: List[str] = field(default_factory=list)
    variables: Dict[str, int] = field(default_factory=dict)
    visited_locations: List[str] = field(default_factory=list)
    active_quest: str = ""
    active_stage: str = ""
    completed_quests: List[str] = field(default_factory=list)
    completed_stages: List[str] = field(default_factory=list)
    npc_interactions: Dict[str, int] = field(default_factory=dict)
    choices_log: List[Dict[str, str]] = field(default_factory=list)
    turn_count: int = 0
    session_start_time: float = 0.0
    ending_reached: str = ""


@dataclass
class GameAction:
    """Result of a player action."""
    action_type: str  # "move", "look", "talk", "take", "use", "choose", "quest", "ending"
    narrative: str
    location: Optional[Dict] = None
    npc: Optional[Dict] = None
    item: Optional[Dict] = None
    quest_update: Optional[Dict] = None
    choices: List[Dict] = field(default_factory=list)
    state_changes: Dict[str, int] = field(default_factory=dict)
    mirror_moment: bool = False  # Should trigger a mirror bubble
    mirror_text: str = ""
    is_rest_point: bool = False  # Natural pause for session end
    ending: Optional[Dict] = None
    available_actions: List[str] = field(default_factory=list)
    map_update: Optional[Dict] = None
    kg_events: List[Dict] = field(default_factory=list)  # Events to write to therapy KG


# ─────────────────────────────────────────────────────────────────
# Runtime Engine
# ─────────────────────────────────────────────────────────────────

class GameRuntime:
    """
    Executes a GameConfig as a playable narrative game.

    Stateless per-call — all state lives in PlayerState.
    Multiple users can play simultaneously.
    """

    def __init__(self):
        self._configs: Dict[str, GameConfig] = {}
        self._players: Dict[str, PlayerState] = {}
        self._safety = TherapySafetyService()

    def _safe_narrative(self, text: str) -> str:
        """Run safety check on generated narrative. Sanitize if needed."""
        result = self._safety.check_response(text)
        if result.action == "block":
            return "The story continues in a new direction..."
        return text

    def load_game(self, user_id: str, config: GameConfig) -> GameAction:
        """Load a game config and start playing. Returns the opening scene."""
        self._configs[user_id] = config
        player = PlayerState(
            location_id=config.starting_location,
            variables=dict(config.state_variables),
            visited_locations=[config.starting_location],
            session_start_time=time.time(),
        )
        # Add starting items (location_id == "inventory")
        for item in config.items:
            if item.location_id == "inventory":
                player.inventory.append(item.id)

        # Set first quest active
        if config.quests:
            player.active_quest = config.quests[0].id
            if config.quests[0].stages:
                player.active_stage = config.quests[0].stages[0].id

        self._players[user_id] = player

        # Build opening scene
        location = self._get_location(config, config.starting_location)
        return GameAction(
            action_type="start",
            narrative=config.starting_narrative,
            location=self._location_dict(location) if location else None,
            available_actions=self._get_available_actions(user_id),
            map_update=config.visual_map,
        )

    def process_action(self, user_id: str, action: str, target: str = "") -> GameAction:
        """
        Process a player action and return the result.

        Actions:
          - "move <direction>" — navigate to connected location
          - "look" — describe current location
          - "talk <npc_id>" — interact with NPC
          - "take <item_id>" — pick up item
          - "use <item_id>" — use an item
          - "choose <choice_id>" — make a quest choice
          - "status" — show player state
          - "map" — show visual map
          - "inventory" — list inventory
        """
        config = self._configs.get(user_id)
        player = self._players.get(user_id)
        if not config or not player:
            return GameAction(action_type="error", narrative="No active game.")

        player.turn_count += 1
        action_lower = action.lower().strip()

        # Parse action
        if action_lower.startswith("move") or action_lower.startswith("go"):
            direction = target or action_lower.split(maxsplit=1)[-1] if " " in action_lower else target
            return self._handle_move(user_id, direction)

        elif action_lower == "look":
            return self._handle_look(user_id)

        elif action_lower.startswith("talk"):
            npc_id = target or (action_lower.split(maxsplit=1)[-1] if " " in action_lower else "")
            return self._handle_talk(user_id, npc_id)

        elif action_lower.startswith("take"):
            item_id = target or (action_lower.split(maxsplit=1)[-1] if " " in action_lower else "")
            return self._handle_take(user_id, item_id)

        elif action_lower.startswith("use"):
            item_id = target or (action_lower.split(maxsplit=1)[-1] if " " in action_lower else "")
            return self._handle_use(user_id, item_id)

        elif action_lower.startswith("choose"):
            choice_id = target or (action_lower.split(maxsplit=1)[-1] if " " in action_lower else "")
            return self._handle_choice(user_id, choice_id)

        elif action_lower == "status":
            return self._handle_status(user_id)

        elif action_lower == "map":
            return GameAction(
                action_type="map",
                narrative="You study your map.",
                map_update=self._get_player_map(user_id),
                available_actions=self._get_available_actions(user_id),
            )

        elif action_lower == "inventory":
            return self._handle_inventory(user_id)

        elif action_lower == "quest":
            return self._handle_quest_status(user_id)

        else:
            return GameAction(
                action_type="unknown",
                narrative=f"You're not sure how to '{action}'. Try: look, move, talk, take, use, or quest.",
                available_actions=self._get_available_actions(user_id),
            )

    def save_state(self, user_id: str) -> Dict[str, Any]:
        """Save player state for session persistence."""
        player = self._players.get(user_id)
        if not player:
            return {}
        return asdict(player)

    def restore_state(self, user_id: str, config: GameConfig,
                      state: Dict[str, Any]) -> GameAction:
        """Restore a saved game state. Returns the current scene."""
        self._configs[user_id] = config
        player = PlayerState(**state)
        player.session_start_time = time.time()
        self._players[user_id] = player

        location = self._get_location(config, player.location_id)
        loc_name = location.name if location else "a familiar place"

        # THE HANDOFF MOMENT
        narrative = f"You're back. {config.protagonist_name} is at {loc_name}."
        if config.companion:
            cn = config.companion.get("name", "Your companion")
            narrative += f" {cn} is right here with you."
        narrative += " Ready to continue?"

        return GameAction(
            action_type="restore",
            narrative=narrative,
            location=self._location_dict(location) if location else None,
            available_actions=self._get_available_actions(user_id),
            map_update=self._get_player_map(user_id),
        )

    def check_session_time(self, user_id: str, max_minutes: int = 20) -> Optional[GameAction]:
        """Check if session should end. Returns rest point suggestion if time's up."""
        player = self._players.get(user_id)
        if not player:
            return None
        elapsed = (time.time() - player.session_start_time) / 60
        if elapsed >= max_minutes:
            config = self._configs.get(user_id)
            protagonist = config.protagonist_name if config else "You"
            return GameAction(
                action_type="rest_point",
                narrative=(
                    f"The light changes. {protagonist} finds a quiet moment to rest. "
                    f"The journey will be here when you're ready to return."
                ),
                is_rest_point=True,
                available_actions=["continue", "save and rest"],
            )
        return None

    def get_state(self, user_id: str) -> Optional[PlayerState]:
        """Get current player state."""
        return self._players.get(user_id)

    # ── Action Handlers ─────────────────────────────────────────

    def _handle_move(self, user_id: str, direction: str) -> GameAction:
        """Move to a connected location."""
        config = self._configs[user_id]
        player = self._players[user_id]
        location = self._get_location(config, player.location_id)

        if not location or not direction:
            return GameAction(
                action_type="move_fail",
                narrative="Where would you like to go?",
                available_actions=self._get_available_actions(user_id),
            )

        # Find the exit
        target_id = location.exits.get(direction)
        if not target_id:
            # Try fuzzy match
            for d, tid in location.exits.items():
                if direction.lower() in d.lower() or d.lower() in direction.lower():
                    target_id = tid
                    break

        if not target_id:
            exits = ", ".join(location.exits.keys())
            return GameAction(
                action_type="move_fail",
                narrative=f"You can't go that way. Available paths: {exits}",
                available_actions=self._get_available_actions(user_id),
            )

        # Check discovery conditions
        target_loc = self._get_location(config, target_id)
        if target_loc and target_loc.discovery_condition:
            if not self._check_condition(player, target_loc.discovery_condition):
                return GameAction(
                    action_type="move_blocked",
                    narrative="Something blocks the way. You're not ready for this path yet.",
                    available_actions=self._get_available_actions(user_id),
                )

        # Move
        player.location_id = target_id
        if target_id not in player.visited_locations:
            player.visited_locations.append(target_id)

        target_loc = self._get_location(config, target_id)
        narrative = f"You travel to {target_loc.name}.\n\n{target_loc.description}" if target_loc else "You arrive somewhere new."

        # Check for NPCs
        npcs_here = [n for n in config.npcs if n.location_id == target_id]
        if npcs_here:
            names = ", ".join(n.name for n in npcs_here)
            narrative += f"\n\nYou notice someone here: {names}."

        # Check for items
        items_here = [i for i in config.items if i.location_id == target_id and i.id not in player.inventory]
        if items_here:
            names = ", ".join(i.name for i in items_here)
            narrative += f"\n\nSomething catches your eye: {names}."

        # Check for active quest stage at this location
        quest_prompt = self._check_quest_at_location(user_id, target_id)

        return GameAction(
            action_type="move",
            narrative=narrative,
            location=self._location_dict(target_loc) if target_loc else None,
            available_actions=self._get_available_actions(user_id),
            quest_update=quest_prompt,
            map_update=self._get_player_map(user_id),
        )

    def _handle_look(self, user_id: str) -> GameAction:
        """Describe current location."""
        config = self._configs[user_id]
        player = self._players[user_id]
        location = self._get_location(config, player.location_id)

        if not location:
            return GameAction(action_type="look", narrative="You look around but nothing is clear.")

        narrative = f"**{location.name}**\n\n{location.description}"

        exits = ", ".join(f"{d} → {self._get_location_name(config, tid)}" for d, tid in location.exits.items())
        if exits:
            narrative += f"\n\nPaths: {exits}"

        npcs_here = [n for n in config.npcs if n.location_id == player.location_id]
        if npcs_here:
            for n in npcs_here:
                narrative += f"\n\n**{n.name}** is here. {n.description}"

        items_here = [i for i in config.items if i.location_id == player.location_id and i.id not in player.inventory]
        if items_here:
            for i in items_here:
                narrative += f"\n\nYou see: **{i.name}** — {i.description}"

        return GameAction(
            action_type="look",
            narrative=narrative,
            location=self._location_dict(location),
            available_actions=self._get_available_actions(user_id),
        )

    def _handle_talk(self, user_id: str, npc_id: str) -> GameAction:
        """Talk to an NPC."""
        config = self._configs[user_id]
        player = self._players[user_id]

        # Find NPC — by id or fuzzy name match
        npc = self._find_npc(config, npc_id, player.location_id)
        if not npc:
            return GameAction(
                action_type="talk_fail",
                narrative="There's nobody by that name here.",
                available_actions=self._get_available_actions(user_id),
            )

        # Track interaction
        player.npc_interactions[npc.id] = player.npc_interactions.get(npc.id, 0) + 1
        count = player.npc_interactions[npc.id]

        # Generate dialogue based on role and interaction count
        dialogue = self._generate_npc_dialogue(npc, count, player)

        kg_events = []
        if npc.role == "helper" and count == 1:
            kg_events.append({"type": "add_node", "name": npc.name, "node_type": "coping",
                             "description": f"Met {npc.name} — a helper figure"})
        elif npc.role == "antagonist":
            kg_events.append({"type": "interaction", "name": "confronted_challenge",
                             "node_type": "trigger"})

        return GameAction(
            action_type="talk",
            narrative=dialogue,
            npc={"id": npc.id, "name": npc.name, "role": npc.role},
            available_actions=self._get_available_actions(user_id),
            kg_events=kg_events,
        )

    def _handle_take(self, user_id: str, item_id: str) -> GameAction:
        """Pick up an item."""
        config = self._configs[user_id]
        player = self._players[user_id]

        item = self._find_item(config, item_id, player.location_id)
        if not item:
            return GameAction(
                action_type="take_fail",
                narrative="You don't see that here.",
                available_actions=self._get_available_actions(user_id),
            )

        if item.id in player.inventory:
            return GameAction(
                action_type="take_fail",
                narrative="You already have that.",
                available_actions=self._get_available_actions(user_id),
            )

        player.inventory.append(item.id)
        player.variables["items_collected"] = player.variables.get("items_collected", 0) + 1

        return GameAction(
            action_type="take",
            narrative=f"You pick up the **{item.name}**. {item.description}",
            item={"id": item.id, "name": item.name},
            state_changes={"items_collected": 1},
            available_actions=self._get_available_actions(user_id),
        )

    def _handle_use(self, user_id: str, item_id: str) -> GameAction:
        """Use an item from inventory."""
        config = self._configs[user_id]
        player = self._players[user_id]

        # Find in inventory
        item = None
        for i in config.items:
            if (i.id == item_id or i.name.lower() == item_id.lower()) and i.id in player.inventory:
                item = i
                break

        if not item:
            return GameAction(
                action_type="use_fail",
                narrative="You don't have that, or it can't be used right now.",
                available_actions=self._get_available_actions(user_id),
            )

        # Apply effects from use_effect text
        state_changes = self._parse_item_effects(item.use_effect, player)

        # Mirror moment for symbolic items
        mirror = item.symbolic_meaning in ("core_value", "self_reflection", "inner_strength")

        return GameAction(
            action_type="use",
            narrative=f"You use the **{item.name}**. {item.use_effect}",
            item={"id": item.id, "name": item.name},
            state_changes=state_changes,
            mirror_moment=mirror,
            mirror_text=f"This item seems to mean something special to {config.protagonist_name}." if mirror else "",
            available_actions=self._get_available_actions(user_id),
        )

    def _handle_choice(self, user_id: str, choice_id: str) -> GameAction:
        """Make a quest choice."""
        config = self._configs[user_id]
        player = self._players[user_id]

        # Find the active quest and stage
        quest = self._get_active_quest(config, player)
        if not quest:
            return GameAction(
                action_type="choice_fail",
                narrative="There's no active quest choice right now.",
                available_actions=self._get_available_actions(user_id),
            )

        stage = self._get_active_stage(quest, player)
        if not stage:
            return GameAction(
                action_type="choice_fail",
                narrative="There's no decision to make right now.",
                available_actions=self._get_available_actions(user_id),
            )

        # Find the choice
        choice = next((c for c in stage.choices if c.id == choice_id), None)
        if not choice:
            # Fuzzy match
            for c in stage.choices:
                if choice_id.lower() in c.text.lower() or choice_id == str(stage.choices.index(c) + 1):
                    choice = c
                    break

        if not choice:
            options = "\n".join(f"  {i+1}. {c.text}" for i, c in enumerate(stage.choices))
            return GameAction(
                action_type="choice_fail",
                narrative=f"Choose one:\n{options}",
                choices=[{"id": c.id, "text": c.text} for c in stage.choices],
                available_actions=self._get_available_actions(user_id),
            )

        # Apply choice effects
        for var, delta in choice.effects.items():
            player.variables[var] = player.variables.get(var, 0) + delta

        # Log the choice
        player.choices_log.append({
            "quest": quest.id,
            "stage": stage.id,
            "choice": choice.id,
            "therapeutic_note": choice.therapeutic_note,
            "turn": player.turn_count,
        })

        # Mark stage complete
        player.completed_stages.append(stage.id)

        # Advance quest
        if choice.leads_to:
            player.active_stage = choice.leads_to
        else:
            # Quest stage done — check if quest is complete
            remaining = [s for s in quest.stages
                        if s.id not in player.completed_stages
                        and self._meets_requirements(player, s.requires)]
            if remaining:
                player.active_stage = remaining[0].id
            else:
                # Quest complete
                player.completed_quests.append(quest.id)
                player.variables["quests_completed"] = player.variables.get("quests_completed", 0) + 1
                # Find next quest
                next_quest = self._find_next_quest(config, player)
                if next_quest:
                    player.active_quest = next_quest.id
                    if next_quest.stages:
                        player.active_stage = next_quest.stages[0].id
                else:
                    player.active_quest = ""
                    player.active_stage = ""

        # Check for endings
        ending = self._check_endings(config, player)

        # KG events from choice
        kg_events = []
        if choice.therapeutic_note:
            kg_events.append({
                "type": "choice",
                "note": choice.therapeutic_note,
                "quest": quest.therapeutic_mapping,
                "choice_text": choice.text,
            })

        # Mirror moment for high-weight choices
        is_mirror = choice.therapeutic_note in (
            "opens_up_to_support", "assertiveness_breakthrough",
            "empathy_for_antagonist", "recognizes_need_for_support",
        )

        result = GameAction(
            action_type="choose",
            narrative=choice.result_text,
            quest_update={
                "quest": quest.title,
                "stage_completed": stage.title,
                "quest_complete": quest.id in player.completed_quests,
            },
            state_changes=dict(choice.effects),
            choices=[],
            mirror_moment=is_mirror,
            mirror_text=f"That was a meaningful choice." if is_mirror else "",
            available_actions=self._get_available_actions(user_id),
            kg_events=kg_events,
            ending=asdict(ending) if ending else None,
        )

        if ending:
            result.action_type = "ending"
            result.narrative += f"\n\n---\n\n**{ending.title}**\n\n{ending.narrative}"
            player.ending_reached = ending.id

        return result

    def _handle_status(self, user_id: str) -> GameAction:
        """Show player status."""
        config = self._configs[user_id]
        player = self._players[user_id]
        location = self._get_location(config, player.location_id)

        lines = [f"**{config.protagonist_name}** — {config.title}"]
        lines.append(f"Location: {location.name if location else 'Unknown'}")
        lines.append(f"Turns: {player.turn_count}")

        if player.variables:
            vars_str = " | ".join(f"{k}: {v}" for k, v in player.variables.items()
                                  if k not in ("items_collected", "quests_completed", "companions_met", "choices_made"))
            if vars_str:
                lines.append(f"Stats: {vars_str}")

        lines.append(f"Items: {len(player.inventory)} | Quests done: {len(player.completed_quests)}")
        lines.append(f"Places visited: {len(player.visited_locations)}/{len(config.locations)}")

        return GameAction(
            action_type="status",
            narrative="\n".join(lines),
            available_actions=self._get_available_actions(user_id),
        )

    def _handle_inventory(self, user_id: str) -> GameAction:
        """List inventory items."""
        config = self._configs[user_id]
        player = self._players[user_id]

        if not player.inventory:
            return GameAction(
                action_type="inventory",
                narrative="Your pockets are empty.",
                available_actions=self._get_available_actions(user_id),
            )

        lines = ["**Your items:**"]
        for item_id in player.inventory:
            item = next((i for i in config.items if i.id == item_id), None)
            if item:
                lines.append(f"  - **{item.name}**: {item.description}")

        return GameAction(
            action_type="inventory",
            narrative="\n".join(lines),
            available_actions=self._get_available_actions(user_id),
        )

    def _handle_quest_status(self, user_id: str) -> GameAction:
        """Show current quest status and choices if available."""
        config = self._configs[user_id]
        player = self._players[user_id]

        quest = self._get_active_quest(config, player)
        if not quest:
            if player.completed_quests:
                return GameAction(
                    action_type="quest",
                    narrative="All current quests are complete. Explore to find what's next.",
                    available_actions=self._get_available_actions(user_id),
                )
            return GameAction(
                action_type="quest",
                narrative="No active quest yet. Explore the world.",
                available_actions=self._get_available_actions(user_id),
            )

        stage = self._get_active_stage(quest, player)
        if not stage:
            return GameAction(
                action_type="quest",
                narrative=f"**{quest.title}**: {quest.description}\n\nExplore to find what's next.",
                available_actions=self._get_available_actions(user_id),
            )

        # Check if stage is at current location
        if stage.location_id and stage.location_id != player.location_id:
            loc = self._get_location(config, stage.location_id)
            loc_name = loc.name if loc else "somewhere else"
            return GameAction(
                action_type="quest",
                narrative=f"**{quest.title}** — {stage.title}\n\nYou need to go to {loc_name}.",
                available_actions=self._get_available_actions(user_id),
            )

        # Show stage with choices
        narrative = f"**{quest.title}** — {stage.title}\n\n{stage.narrative}"
        choices = [{"id": c.id, "text": c.text} for c in stage.choices]

        return GameAction(
            action_type="quest",
            narrative=narrative,
            choices=choices,
            available_actions=self._get_available_actions(user_id),
        )

    # ── Helpers ──────────────────────────────────────────────────

    def _get_location(self, config: GameConfig, loc_id: str) -> Optional[GameLocation]:
        return next((l for l in config.locations if l.id == loc_id), None)

    def _get_location_name(self, config: GameConfig, loc_id: str) -> str:
        loc = self._get_location(config, loc_id)
        return loc.name if loc else loc_id

    def _location_dict(self, loc: GameLocation) -> Dict:
        return {
            "id": loc.id, "name": loc.name, "description": loc.description,
            "atmosphere": loc.atmosphere, "exits": loc.exits,
            "mood_color": loc.mood_color, "mood_secondary": loc.mood_secondary,
        }

    def _find_npc(self, config: GameConfig, npc_id: str, location_id: str) -> Optional[GameNPC]:
        for n in config.npcs:
            if n.location_id == location_id:
                if n.id == npc_id or npc_id.lower() in n.name.lower():
                    return n
        return None

    def _find_item(self, config: GameConfig, item_id: str, location_id: str) -> Optional[GameItem]:
        for i in config.items:
            if i.location_id == location_id:
                if i.id == item_id or item_id.lower() in i.name.lower():
                    return i
        return None

    def _generate_npc_dialogue(self, npc: GameNPC, count: int, player: PlayerState) -> str:
        """Generate NPC dialogue based on role and interaction count."""
        name = npc.name

        if count == 1:
            if npc.role == "helper":
                return f'**{name}** looks at you warmly. "I had a feeling someone would come. I\'m glad it\'s you."'
            elif npc.role == "mentor":
                return f'**{name}** studies you thoughtfully. "You carry something important. I can see it in how you move."'
            elif npc.role == "wildcard":
                return f'**{name}** tilts their head. "Interesting. You\'re not what I expected. That\'s... good, I think."'
            elif npc.role == "antagonist":
                return f'**{name}** stands before you. {npc.description}\n\nThe air feels heavier here.'
        elif count == 2:
            if npc.role == "helper":
                return f'**{name}** smiles. "Still here? Good. That means you\'re serious about this."'
            elif npc.role == "mentor":
                return f'**{name}** nods. "You\'re learning. Not everyone does."'
            elif npc.role == "antagonist":
                return f'**{name}** is still here. Waiting. Maybe understanding is the first step.'
        else:
            if npc.role == "helper":
                return f'**{name}** is here. A steady presence. "Whatever you need. I\'m not going anywhere."'
            elif npc.role == "mentor":
                return f'**{name}** shares a quiet moment with you. Some things don\'t need words.'

        return f'**{name}**: "{npc.personality}"'

    def _parse_item_effects(self, use_text: str, player: PlayerState) -> Dict[str, int]:
        """Parse state changes from item use_effect text."""
        changes = {}
        import re
        matches = re.findall(r'\+(\d+)\s+(courage|trust|items_collected)', use_text.lower())
        for amount, var in matches:
            changes[var] = int(amount)
            player.variables[var] = player.variables.get(var, 0) + int(amount)
        return changes

    def _get_active_quest(self, config: GameConfig, player: PlayerState) -> Optional[Quest]:
        if not player.active_quest:
            return None
        return next((q for q in config.quests if q.id == player.active_quest), None)

    def _get_active_stage(self, quest: Quest, player: PlayerState) -> Optional[QuestStage]:
        if not player.active_stage:
            return None
        return next((s for s in quest.stages if s.id == player.active_stage), None)

    def _check_quest_at_location(self, user_id: str, location_id: str) -> Optional[Dict]:
        """Check if there's an active quest stage at this location."""
        config = self._configs[user_id]
        player = self._players[user_id]
        quest = self._get_active_quest(config, player)
        if not quest:
            return None
        stage = self._get_active_stage(quest, player)
        if not stage or stage.location_id != location_id:
            return None
        if not self._meets_requirements(player, stage.requires):
            return None
        return {
            "quest": quest.title,
            "stage": stage.title,
            "narrative": stage.narrative,
            "choices": [{"id": c.id, "text": c.text} for c in stage.choices],
        }

    def _find_next_quest(self, config: GameConfig, player: PlayerState) -> Optional[Quest]:
        """Find the next incomplete quest whose requirements are met."""
        for q in config.quests:
            if q.id not in player.completed_quests:
                if q.stages:
                    first_stage = q.stages[0]
                    if self._meets_requirements(player, first_stage.requires):
                        return q
        return None

    def _check_endings(self, config: GameConfig, player: PlayerState) -> Optional[GameEnding]:
        """Check if any ending conditions are met."""
        if player.ending_reached:
            return None  # Already ended

        for ending in config.endings:
            if not ending.conditions:
                continue  # Default ending — checked last
            if all(player.variables.get(k, 0) >= v for k, v in ending.conditions.items()):
                return ending

        # Check default ending (empty conditions) if all quests complete
        if len(player.completed_quests) >= len(config.quests) and config.quests:
            default = next((e for e in config.endings if not e.conditions), None)
            return default

        return None

    def _meets_requirements(self, player: PlayerState, requires: Dict[str, Any]) -> bool:
        """Check if player meets stage requirements."""
        if not requires:
            return True
        return all(player.variables.get(k, 0) >= v for k, v in requires.items())

    def _check_condition(self, player: PlayerState, condition: str) -> bool:
        """Check a discovery condition string like 'courage >= 6'."""
        if not condition:
            return True
        import re
        match = re.match(r'(\w+)\s*(>=|>|==)\s*(\d+)', condition)
        if not match:
            return True
        var, op, val = match.group(1), match.group(2), int(match.group(3))
        player_val = player.variables.get(var, 0)
        if op == ">=":
            return player_val >= val
        elif op == ">":
            return player_val > val
        elif op == "==":
            return player_val == val
        return True

    def _get_available_actions(self, user_id: str) -> List[str]:
        """Get contextually available actions."""
        config = self._configs.get(user_id)
        player = self._players.get(user_id)
        if not config or not player:
            return []

        actions = ["look", "map", "status", "inventory"]

        location = self._get_location(config, player.location_id)
        if location:
            for direction in location.exits:
                actions.append(f"go {direction}")

            npcs_here = [n for n in config.npcs if n.location_id == player.location_id]
            for n in npcs_here:
                actions.append(f"talk {n.name.lower()}")

            items_here = [i for i in config.items
                         if i.location_id == player.location_id and i.id not in player.inventory]
            for i in items_here:
                actions.append(f"take {i.name.lower()}")

        if player.inventory:
            actions.append("use <item>")

        # Quest choices
        quest = self._get_active_quest(config, player)
        if quest:
            actions.append("quest")
            stage = self._get_active_stage(quest, player)
            if stage and stage.location_id == player.location_id:
                for c in stage.choices:
                    actions.append(f"choose {c.id}")

        return actions

    def _get_player_map(self, user_id: str) -> Dict[str, Any]:
        """Get visual map with discovered locations highlighted."""
        config = self._configs.get(user_id)
        player = self._players.get(user_id)
        if not config or not player:
            return {}

        map_data = dict(config.visual_map) if config.visual_map else {"nodes": [], "edges": []}
        # Update discovery status
        for node in map_data.get("nodes", []):
            node["discovered"] = node["id"] in player.visited_locations
            node["current"] = node["id"] == player.location_id

        return map_data
