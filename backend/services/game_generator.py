"""
Game Generator — Transforms interview synthesis into a playable game config.

Takes the structured output from GameInterviewEngine.synthesize() and produces
a full game_config.json with Grey Peace complexity: locations, NPCs, items,
quests, state variables, branching narrative, and multiple endings.

Uses Gemini API for narrative content generation. Falls back to template-based
generation if API is unavailable (for testing/offline use).

The game config includes hidden therapeutic mappings that only the therapist
dashboard sees — which quest explores which concern, which NPC represents
which relationship pattern.
"""

import json
import uuid
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict


# ─────────────────────────────────────────────────────────────────
# Game Config Data Structures
# ─────────────────────────────────────────────────────────────────

@dataclass
class GameNPC:
    """Non-player character."""
    id: str
    name: str
    description: str
    role: str              # helper, mentor, wildcard, antagonist, companion
    personality: str
    location_id: str
    dialogue_style: str
    relationship: str      # relationship to protagonist
    therapeutic_mapping: str = ""  # Hidden — what this NPC represents (therapist only)

@dataclass
class GameLocation:
    """A place in the game world."""
    id: str
    name: str
    description: str
    atmosphere: str        # Emotional tone for mood visuals
    exits: Dict[str, str] = field(default_factory=dict)  # direction → location_id
    npcs: List[str] = field(default_factory=list)
    items: List[str] = field(default_factory=list)
    discovery_condition: str = ""  # What must happen to unlock this location
    mood_color: str = "#2a2a3e"    # Primary mood color for atmosphere
    mood_secondary: str = "#1a1a2e"

@dataclass
class GameItem:
    """An item the player can find/use."""
    id: str
    name: str
    description: str
    location_id: str       # Where it's found (or "inventory" if starting item)
    use_effect: str        # What happens when used
    symbolic_meaning: str = ""  # Hidden — therapist sees this

@dataclass
class QuestChoice:
    """A branching choice within a quest."""
    id: str
    text: str              # What the player sees
    result_text: str       # Narrative result
    effects: Dict[str, Any] = field(default_factory=dict)  # state variable changes
    leads_to: str = ""     # Next quest stage or ""
    therapeutic_note: str = ""  # Hidden — what this choice reveals

@dataclass
class QuestStage:
    """A stage within a quest arc."""
    id: str
    title: str
    narrative: str         # Scene description
    location_id: str
    choices: List[QuestChoice] = field(default_factory=list)
    requires: Dict[str, Any] = field(default_factory=dict)  # State requirements

@dataclass
class Quest:
    """A quest arc with branching stages."""
    id: str
    title: str
    description: str
    stages: List[QuestStage] = field(default_factory=list)
    therapeutic_mapping: str = ""  # Hidden — which concern this quest explores

@dataclass
class GameEnding:
    """A possible game ending."""
    id: str
    title: str
    narrative: str
    conditions: Dict[str, Any] = field(default_factory=dict)  # State conditions to trigger
    tone: str = "hopeful"  # hopeful, bittersweet, triumphant, peaceful

@dataclass
class GameConfig:
    """Complete game configuration — output of the generator."""
    game_id: str
    title: str
    theme: str
    tone: str
    protagonist_name: str
    companion: Dict[str, str] = field(default_factory=dict)
    locations: List[GameLocation] = field(default_factory=list)
    npcs: List[GameNPC] = field(default_factory=list)
    items: List[GameItem] = field(default_factory=list)
    quests: List[Quest] = field(default_factory=list)
    endings: List[GameEnding] = field(default_factory=list)
    state_variables: Dict[str, Any] = field(default_factory=dict)
    starting_location: str = ""
    starting_narrative: str = ""
    visual_map: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "GameConfig":
        """Reconstruct a GameConfig from a saved dict."""
        return cls(
            game_id=d.get("game_id", ""),
            title=d.get("title", "Untitled"),
            theme=d.get("theme", ""),
            tone=d.get("tone", ""),
            protagonist_name=d.get("protagonist_name", "Hero"),
            companion=d.get("companion", {}),
            locations=[GameLocation(**loc) if isinstance(loc, dict) else loc for loc in d.get("locations", [])],
            npcs=[GameNPC(**npc) if isinstance(npc, dict) else npc for npc in d.get("npcs", [])],
            items=[GameItem(**item) if isinstance(item, dict) else item for item in d.get("items", [])],
            quests=[cls._quest_from_dict(q) if isinstance(q, dict) else q for q in d.get("quests", [])],
            endings=[GameEnding(**e) if isinstance(e, dict) else e for e in d.get("endings", [])],
            state_variables=d.get("state_variables", {}),
            starting_location=d.get("starting_location", ""),
            starting_narrative=d.get("starting_narrative", ""),
            visual_map=d.get("visual_map", {}),
        )

    @staticmethod
    def _quest_from_dict(q: Dict) -> "Quest":
        stages = []
        for s in q.get("stages", []):
            if isinstance(s, dict):
                choices = [QuestChoice(**c) if isinstance(c, dict) else c for c in s.get("choices", [])]
                stage = QuestStage(
                    id=s.get("id", ""), title=s.get("title", ""),
                    narrative=s.get("narrative", ""), location_id=s.get("location_id", ""),
                    choices=choices, requires=s.get("requires", {}),
                )
                stages.append(stage)
            else:
                stages.append(s)
        return Quest(
            id=q.get("id", ""), title=q.get("title", ""),
            description=q.get("description", ""), stages=stages,
            therapeutic_mapping=q.get("therapeutic_mapping", ""),
        )


# ─────────────────────────────────────────────────────────────────
# Generator
# ─────────────────────────────────────────────────────────────────

class GameGenerator:
    """
    Transforms interview synthesis into a playable game config.

    Two modes:
    - Gemini mode: uses API for rich narrative generation
    - Template mode: generates from templates (offline/testing)
    """

    def __init__(self, gemini_api_key: str = None):
        self.api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")

    def generate(self, synthesis: Dict[str, Any],
                 use_gemini: bool = False) -> GameConfig:
        """
        Generate a complete game config from interview synthesis.

        Args:
            synthesis: Output from GameInterviewEngine.synthesize()
            use_gemini: If True, use Gemini API for narrative generation

        Returns:
            GameConfig ready for GameRuntime
        """
        if use_gemini and self.api_key:
            return self._generate_with_gemini(synthesis)
        return self._generate_from_templates(synthesis)

    # ── Template-Based Generation (offline/testing) ─────────────

    def _generate_from_templates(self, s: Dict[str, Any]) -> GameConfig:
        """Generate game config from templates using interview answers."""
        game_id = f"game_{uuid.uuid4().hex[:8]}"
        char = s.get("character", {})
        world = s.get("world", {})
        story = s.get("story", {})
        challenges = s.get("challenges", {})
        choices = s.get("choices", {})
        prefs = s.get("preferences", {})

        protagonist = char.get("name", "Hero") or "Hero"
        companion_desc = char.get("companion", "")
        genre = prefs.get("genre", "fantasy") or "fantasy"
        desired_feeling = prefs.get("desired_feeling", "excitement") or "excitement"

        # Determine tone from preferences
        tone = self._determine_tone(desired_feeling, genre)

        # Build title
        title = self._generate_title(protagonist, world, genre)

        # Build locations
        locations = self._build_locations(world, genre, tone)

        # Build NPCs
        npcs = self._build_npcs(char, story, locations)

        # Build companion
        companion = {}
        if companion_desc:
            companion = {
                "name": self._extract_companion_name(companion_desc),
                "description": companion_desc,
                "type": "companion",
            }

        # Build items
        items = self._build_items(char, world, prefs, locations)

        # Build quests
        quests = self._build_quests(story, challenges, choices, locations, npcs)

        # Build endings
        endings = self._build_endings(choices, story, protagonist)

        # State variables
        state_vars = {
            "courage": int(self._extract_number(challenges.get("courage_level", "5"), 5)),
            "trust": 3,
            "items_collected": 0,
            "quests_completed": 0,
            "companions_met": 0,
            "choices_made": 0,
        }

        # Visual map data
        visual_map = self._build_visual_map(locations)

        # Starting narrative
        starting_narrative = (
            f"You are {protagonist}. "
            f"You open your eyes in {locations[0].name if locations else 'a familiar place'}. "
        )
        if companion_desc:
            cn = companion.get("name", "your companion")
            starting_narrative += f"{cn} is by your side. "
        starting_narrative += "Something feels different today. An adventure is about to begin."

        return GameConfig(
            game_id=game_id,
            title=title,
            theme=self._extract_theme(story, char),
            tone=tone,
            protagonist_name=protagonist,
            companion=companion,
            locations=locations,
            npcs=npcs,
            items=items,
            quests=quests,
            endings=endings,
            state_variables=state_vars,
            starting_location=locations[0].id if locations else "",
            starting_narrative=starting_narrative,
            visual_map=visual_map,
        )

    def _determine_tone(self, feeling: str, genre: str) -> str:
        """Determine game tone from preferences."""
        feeling_lower = (feeling or "").lower()
        if any(w in feeling_lower for w in ["excit", "thrill", "adventure"]):
            return "adventurous"
        if any(w in feeling_lower for w in ["mystery", "curious", "discover"]):
            return "mysterious"
        if any(w in feeling_lower for w in ["brave", "hero", "strong"]):
            return "heroic"
        if any(w in feeling_lower for w in ["laugh", "fun", "happy"]):
            return "lighthearted"
        if any(w in feeling_lower for w in ["peace", "calm", "safe"]):
            return "serene"
        return "adventurous"

    def _generate_title(self, protagonist: str, world: Dict, genre: str) -> str:
        """Generate a game title."""
        safe_place = world.get("safe_place", "")
        exciting = world.get("exciting_place", "")
        if exciting:
            # Extract a key word from the exciting place
            words = exciting.split()
            key = next((w for w in words if len(w) > 4 and w[0].isupper()), None)
            if key:
                return f"{protagonist} and the {key}"
        return f"The Journey of {protagonist}"

    def _build_locations(self, world: Dict, genre: str, tone: str) -> List[GameLocation]:
        """Build 5-8 locations from world answers."""
        locations = []
        mood_palettes = {
            "adventurous": ("#2d4a3e", "#1a3028"),
            "mysterious": ("#2a2a4e", "#1a1a3e"),
            "heroic": ("#4a3a2a", "#3a2a1a"),
            "lighthearted": ("#3a4a3e", "#2a3a2e"),
            "serene": ("#2a3a4a", "#1a2a3a"),
        }
        palette = mood_palettes.get(tone, ("#2a2a3e", "#1a1a2e"))

        # Location 1: Safe place (always exists)
        safe = world.get("safe_place", "A quiet, familiar room")
        locations.append(GameLocation(
            id="safe_place",
            name=self._extract_place_name(safe, "The Haven"),
            description=safe or "A warm, safe space where you feel at home.",
            atmosphere="warm",
            mood_color="#2d4a3e",
            mood_secondary="#1a3028",
        ))

        # Location 2: Exciting place
        exciting = world.get("exciting_place", "A vast unexplored land")
        locations.append(GameLocation(
            id="exciting_place",
            name=self._extract_place_name(exciting, "The Frontier"),
            description=exciting or "An exciting place full of possibility.",
            atmosphere="exciting",
            exits={"back": "safe_place"},
            mood_color=palette[0],
            mood_secondary=palette[1],
        ))
        locations[0].exits["explore"] = "exciting_place"

        # Location 3: Meeting place (where helper NPC is)
        locations.append(GameLocation(
            id="meeting_place",
            name="The Crossroads",
            description="A place where paths converge. Travelers and locals gather here.",
            atmosphere="social",
            exits={"back": "safe_place", "forward": "exciting_place"},
            mood_color="#3a3a4a",
            mood_secondary="#2a2a3a",
        ))
        locations[0].exits["go out"] = "meeting_place"

        # Location 4: Challenge area
        locations.append(GameLocation(
            id="challenge_area",
            name="The Proving Ground",
            description="This is where your character's courage will be tested.",
            atmosphere="tense",
            exits={"retreat": "meeting_place"},
            mood_color="#4a2a2a",
            mood_secondary="#3a1a1a",
        ))
        locations[1].exits["onward"] = "challenge_area"

        # Location 5: Avoided place (if mentioned)
        avoided = world.get("avoided_place", "")
        if avoided:
            locations.append(GameLocation(
                id="avoided_place",
                name=self._extract_place_name(avoided, "The Shadows"),
                description=avoided,
                atmosphere="unsettling",
                exits={"leave": "meeting_place"},
                discovery_condition="courage >= 6",
                mood_color="#3a2a3a",
                mood_secondary="#2a1a2a",
            ))
            locations[2].exits["the other way"] = "avoided_place"

        # Location 6: Secret place (deep interview only)
        secret = world.get("secret_place", "")
        if secret:
            locations.append(GameLocation(
                id="secret_place",
                name=self._extract_place_name(secret, "The Hidden Chamber"),
                description=secret,
                atmosphere="mystical",
                exits={"return": "exciting_place"},
                discovery_condition="items_collected >= 3",
                mood_color="#2a3a4a",
                mood_secondary="#1a2a3a",
            ))

        # Location 7: Climax location
        locations.append(GameLocation(
            id="climax_location",
            name="The Heart of It All",
            description="This is where everything comes together. The final challenge awaits.",
            atmosphere="intense",
            exits={"back": "challenge_area"},
            discovery_condition="quests_completed >= 1",
            mood_color="#4a3a2a",
            mood_secondary="#3a2a1a",
        ))

        # Location 8: Resolution location
        locations.append(GameLocation(
            id="resolution",
            name="The New Dawn",
            description="The world feels different now. Something has changed — in the world, or in you.",
            atmosphere="hopeful",
            exits={"explore": "safe_place"},
            discovery_condition="quests_completed >= 2",
            mood_color="#3a4a3a",
            mood_secondary="#2a3a2a",
        ))

        return locations

    def _build_npcs(self, char: Dict, story: Dict, locations: List[GameLocation]) -> List[GameNPC]:
        """Build 3-5 NPCs from story answers."""
        npcs = []

        # Helper NPC
        helper = story.get("helper", "")
        npcs.append(GameNPC(
            id="helper",
            name=self._extract_name(helper, "A Trusted Friend"),
            description=helper or "Someone who believes in you when you need it most.",
            role="helper",
            personality="warm, supportive, honest",
            location_id="meeting_place",
            dialogue_style="encouraging and kind",
            relationship="ally",
            therapeutic_mapping="support_system",
        ))

        # Mentor NPC
        npcs.append(GameNPC(
            id="mentor",
            name="The Guide",
            description="Someone who has seen much and shares their wisdom carefully.",
            role="mentor",
            personality="wise, patient, sometimes cryptic",
            location_id="exciting_place",
            dialogue_style="thoughtful, uses metaphors",
            relationship="teacher",
            therapeutic_mapping="wisdom_figure",
        ))

        # Wildcard NPC
        npcs.append(GameNPC(
            id="wildcard",
            name="The Stranger",
            description="You can't quite figure them out. They seem to know more than they say.",
            role="wildcard",
            personality="unpredictable, curious, surprisingly insightful",
            location_id="meeting_place",
            dialogue_style="questions that make you think",
            relationship="unknown",
            therapeutic_mapping="mirror_character",
        ))

        # Antagonist (from story)
        antagonist_desc = story.get("antagonist", "")
        if antagonist_desc:
            npcs.append(GameNPC(
                id="antagonist",
                name="The Shadow",
                description=antagonist_desc,
                role="antagonist",
                personality="represents the challenge the protagonist must overcome",
                location_id="challenge_area",
                dialogue_style="challenging, confrontational but not cruel",
                relationship="obstacle",
                therapeutic_mapping="externalized_struggle",
            ))

        return npcs

    def _build_items(self, char: Dict, world: Dict, prefs: Dict,
                     locations: List[GameLocation]) -> List[GameItem]:
        """Build 5-10 items."""
        items = []

        # Item 1: Protagonist's keepsake (from what they protect)
        protects = char.get("protects", "")
        items.append(GameItem(
            id="keepsake",
            name="Keepsake",
            description=f"A reminder of what matters most{': ' + protects if protects else '.'}",
            location_id="inventory",  # Starting item
            use_effect="Looking at it fills you with determination. +1 courage.",
            symbolic_meaning="core_value",
        ))

        # Item 2: Map fragment
        items.append(GameItem(
            id="map_fragment",
            name="Torn Map",
            description="A piece of an old map. There must be more pieces out there.",
            location_id="exciting_place",
            use_effect="Reveals a new path on the map.",
            symbolic_meaning="direction_seeking",
        ))

        # Item 3: Courage token
        items.append(GameItem(
            id="courage_token",
            name="Courage Stone",
            description="A small stone that feels warm in your hand. Someone left it here for a reason.",
            location_id="challenge_area",
            use_effect="Holding it makes you feel braver. +2 courage.",
            symbolic_meaning="inner_strength",
        ))

        # Item 4: Companion treat (if companion exists)
        if char.get("companion"):
            items.append(GameItem(
                id="companion_treat",
                name="Companion Gift",
                description="Something your companion loves. Strengthens your bond.",
                location_id="safe_place",
                use_effect="Your companion seems happier and more confident. +1 trust.",
                symbolic_meaning="nurturing_relationship",
            ))

        # Item 5: Message in a bottle / letter
        items.append(GameItem(
            id="letter",
            name="Unopened Letter",
            description="A letter addressed to you. The handwriting is unfamiliar.",
            location_id="meeting_place",
            use_effect="Reading it reveals a clue about the antagonist's weakness.",
            symbolic_meaning="hidden_knowledge",
        ))

        # Item 6: Mirror shard
        items.append(GameItem(
            id="mirror_shard",
            name="Mirror Shard",
            description="A piece of a broken mirror. When you look into it, you see... something unexpected.",
            location_id="challenge_area",
            use_effect="Shows you a glimpse of who your character could become.",
            symbolic_meaning="self_reflection",
        ))

        # Cool things from preferences
        cool = prefs.get("cool_things", "")
        if cool:
            items.append(GameItem(
                id="special_item",
                name="Special Find",
                description=f"Something connected to what you love: {cool}",
                location_id="exciting_place",
                use_effect="Inspires you. +1 to all state variables.",
                symbolic_meaning="personal_joy",
            ))

        return items

    def _build_quests(self, story: Dict, challenges: Dict, choices: Dict,
                      locations: List[GameLocation],
                      npcs: List[GameNPC]) -> List[Quest]:
        """Build 2-4 quest arcs."""
        quests = []

        # Quest 1: The Journey Begins (always present)
        catalyst = story.get("catalyst", "Something changed")
        quests.append(Quest(
            id="quest_journey",
            title="The Journey Begins",
            description=f"Something has changed: {catalyst}. It's time to act.",
            stages=[
                QuestStage(
                    id="journey_start",
                    title="Setting Out",
                    narrative=f"The change has come: {catalyst}. You can feel it in the air. What do you do?",
                    location_id="safe_place",
                    choices=[
                        QuestChoice(
                            id="seek_help",
                            text="Find someone who might know what's happening",
                            result_text="You head to The Crossroads, hoping to find answers.",
                            effects={"trust": 1},
                            leads_to="journey_ally",
                            therapeutic_note="seeks_support",
                        ),
                        QuestChoice(
                            id="investigate_alone",
                            text="Look into it yourself first",
                            result_text="You set out alone. The path ahead is uncertain, but it's yours.",
                            effects={"courage": 1},
                            leads_to="journey_explore",
                            therapeutic_note="self_reliant",
                        ),
                    ],
                ),
                QuestStage(
                    id="journey_ally",
                    title="Finding an Ally",
                    narrative="At The Crossroads, you meet someone who seems to understand.",
                    location_id="meeting_place",
                    choices=[
                        QuestChoice(
                            id="trust_ally",
                            text="Tell them what's going on",
                            result_text="They listen carefully. 'I've seen this before,' they say. 'I can help.'",
                            effects={"trust": 1, "companions_met": 1},
                            therapeutic_note="opens_up_to_support",
                        ),
                        QuestChoice(
                            id="cautious",
                            text="Share a little, keep the rest close",
                            result_text="You share just enough. They nod. 'When you're ready, I'm here.'",
                            effects={"companions_met": 1},
                            therapeutic_note="cautious_trust",
                        ),
                    ],
                ),
                QuestStage(
                    id="journey_explore",
                    title="On Your Own",
                    narrative="The world is bigger than you expected. But you find signs that you're on the right path.",
                    location_id="exciting_place",
                    choices=[
                        QuestChoice(
                            id="press_on",
                            text="Keep going deeper",
                            result_text="Every step forward reveals something new about this world — and about yourself.",
                            effects={"courage": 1, "items_collected": 1},
                            therapeutic_note="persistence",
                        ),
                        QuestChoice(
                            id="return_for_help",
                            text="Go back and find someone to join you",
                            result_text="Sometimes the bravest thing is knowing when to ask for help.",
                            effects={"trust": 1},
                            leads_to="journey_ally",
                            therapeutic_note="recognizes_need_for_support",
                        ),
                    ],
                ),
            ],
            therapeutic_mapping="approach_to_change",
        ))

        # Quest 2: The Challenge (always present)
        antagonist = story.get("antagonist", "a great challenge")
        desire = story.get("desire", "something important")
        quests.append(Quest(
            id="quest_challenge",
            title="Facing the Shadow",
            description=f"The challenge grows: {antagonist}. But what you want is worth fighting for: {desire}.",
            stages=[
                QuestStage(
                    id="challenge_approach",
                    title="The Approach",
                    narrative=f"You can feel it getting closer — {antagonist}. But so is what you're looking for.",
                    location_id="challenge_area",
                    requires={"quests_completed": 1},
                    choices=[
                        QuestChoice(
                            id="confront",
                            text="Face it head on",
                            result_text="You stand your ground. Whatever happens, you chose to face it.",
                            effects={"courage": 2},
                            leads_to="challenge_face",
                            therapeutic_note="confrontation",
                        ),
                        QuestChoice(
                            id="find_another_way",
                            text="Look for another way around",
                            result_text="Not every battle needs to be fought directly. You look for a smarter path.",
                            effects={"courage": 1, "trust": 1},
                            leads_to="challenge_alternative",
                            therapeutic_note="strategic_avoidance",
                        ),
                    ],
                ),
                QuestStage(
                    id="challenge_face",
                    title="The Confrontation",
                    narrative="This is the moment. Everything led to this.",
                    location_id="climax_location",
                    choices=[
                        QuestChoice(
                            id="stand_firm",
                            text="Hold your ground and speak your truth",
                            result_text="Your voice doesn't waver. Something shifts — not in the world, but in you.",
                            effects={"courage": 3, "quests_completed": 1},
                            therapeutic_note="assertiveness_breakthrough",
                        ),
                        QuestChoice(
                            id="show_compassion",
                            text="Try to understand what's really driving the challenge",
                            result_text="You look deeper. Behind the shadow, there's something more human than you expected.",
                            effects={"trust": 2, "courage": 1, "quests_completed": 1},
                            therapeutic_note="empathy_for_antagonist",
                        ),
                    ],
                ),
                QuestStage(
                    id="challenge_alternative",
                    title="The Clever Path",
                    narrative="You found another way. It wasn't easy, but you made it work.",
                    location_id="climax_location",
                    choices=[
                        QuestChoice(
                            id="outsmart",
                            text="Use what you've learned to find a solution",
                            result_text="Every experience, every person you met — it all comes together now.",
                            effects={"courage": 2, "trust": 1, "quests_completed": 1},
                            therapeutic_note="resourcefulness",
                        ),
                        QuestChoice(
                            id="ask_for_help_final",
                            text="Call on your allies to help",
                            result_text="You're not alone in this. Together, you find a way through.",
                            effects={"trust": 3, "quests_completed": 1},
                            therapeutic_note="community_support",
                        ),
                    ],
                ),
            ],
            therapeutic_mapping="core_struggle",
        ))

        # Quest 3: Resolution (links to desired ending)
        ending_pref = choices.get("desired_ending", "")
        quests.append(Quest(
            id="quest_resolution",
            title="What Comes After",
            description="The challenge is behind you. But the story isn't over — it's changing.",
            stages=[
                QuestStage(
                    id="resolution_choice",
                    title="A New Chapter",
                    narrative="You've come so far. The world around you reflects the journey. What now?",
                    location_id="resolution",
                    requires={"quests_completed": 2},
                    choices=[
                        QuestChoice(
                            id="new_beginning",
                            text="Start something new with everything you've learned",
                            result_text="The adventure doesn't end. It transforms. You carry everything forward.",
                            effects={"quests_completed": 1},
                            therapeutic_note="growth_orientation",
                        ),
                        QuestChoice(
                            id="go_home",
                            text="Return to where it all started — but different now",
                            result_text="The same place. But you're not the same person. And that changes everything.",
                            effects={"quests_completed": 1},
                            therapeutic_note="integration",
                        ),
                        QuestChoice(
                            id="keep_exploring",
                            text="There's more out there. Keep going.",
                            result_text="The horizon calls. Your companion by your side, you set out once more.",
                            effects={"quests_completed": 1},
                            therapeutic_note="openness_to_future",
                        ),
                    ],
                ),
            ],
            therapeutic_mapping="resolution_style",
        ))

        return quests

    def _build_endings(self, choices: Dict, story: Dict,
                       protagonist: str) -> List[GameEnding]:
        """Build 2-4 possible endings."""
        return [
            GameEnding(
                id="ending_triumph",
                title="The Hero's Return",
                narrative=f"{protagonist} stood tall. The journey had changed everything — not the world, but {protagonist} themselves. The courage was always there. It just needed a story to come alive.",
                conditions={"courage": 8},
                tone="triumphant",
            ),
            GameEnding(
                id="ending_peace",
                title="A Quiet Dawn",
                narrative=f"No fireworks, no grand victory. Just {protagonist}, standing in the place they'd once called home, feeling something they hadn't felt in a long time: peace. The kind that comes from knowing who you are.",
                conditions={"trust": 6},
                tone="peaceful",
            ),
            GameEnding(
                id="ending_together",
                title="Not Alone",
                narrative=f"In the end, it wasn't about winning or solving everything. It was about the people {protagonist} found along the way. The ones who stayed. The ones who understood.",
                conditions={"companions_met": 2, "trust": 5},
                tone="hopeful",
            ),
            GameEnding(
                id="ending_new_horizon",
                title="The Horizon",
                narrative=f"{protagonist} looked ahead. The old story was done. A new one was beginning — and this time, they got to choose every word.",
                conditions={},  # Default ending
                tone="hopeful",
            ),
        ]

    # ── Gemini Generation ───────────────────────────────────────

    def _generate_with_gemini(self, synthesis: Dict[str, Any]) -> GameConfig:
        """Generate game config using Gemini API for rich narrative."""
        # Start with template-based structure
        config = self._generate_from_templates(synthesis)

        # TODO: Enhance with Gemini API calls:
        # 1. Enrich location descriptions with vivid, personalized narrative
        # 2. Generate unique NPC dialogue based on character personality
        # 3. Create more nuanced quest narratives from interview answers
        # 4. Generate atmospheric descriptions for mood visuals
        # 5. Create personalized item descriptions tied to user's preferences

        return config

    # ── Utility Methods ─────────────────────────────────────────

    def _extract_place_name(self, description: str, default: str) -> str:
        """Extract a short place name from a description."""
        if not description:
            return default
        # Take first few significant words
        words = description.split()[:4]
        name = " ".join(w for w in words if len(w) > 2)
        return name.title() if name else default

    def _extract_name(self, description: str, default: str) -> str:
        """Extract a character name from a description."""
        if not description:
            return default
        # If it looks like a name (starts with capital, short)
        words = description.split()
        if words and words[0][0].isupper() and len(words[0]) > 1:
            return words[0]
        return default

    def _extract_companion_name(self, description: str) -> str:
        """Extract companion name from description."""
        if not description:
            return "Companion"
        words = description.split()
        # Look for a capitalized word that could be a name
        for w in words:
            if w[0].isupper() and len(w) > 2 and w.lower() not in {"the", "and", "but", "for"}:
                return w
        # Fallback: first noun-like word
        return words[0].title() if words else "Companion"

    def _extract_theme(self, story: Dict, char: Dict) -> str:
        """Extract a theme from story and character answers."""
        desire = story.get("desire", "")
        protects = char.get("protects", "")
        if desire:
            return f"The journey to find {desire}"
        if protects:
            return f"Protecting what matters most"
        return "A journey of discovery"

    def _extract_number(self, text: str, default: int) -> int:
        """Extract a number from text."""
        import re
        match = re.search(r'\d+', str(text))
        return int(match.group()) if match else default

    def _build_visual_map(self, locations: List[GameLocation]) -> Dict[str, Any]:
        """Build visual map data for the frontend."""
        nodes = []
        edges = []

        # Simple grid layout
        positions = [
            (200, 400),   # safe_place (center-left)
            (400, 200),   # exciting_place (top-right)
            (200, 200),   # meeting_place (top-left)
            (400, 400),   # challenge_area (center-right)
            (100, 100),   # avoided_place (far top-left)
            (300, 100),   # secret_place (top-center)
            (500, 300),   # climax (far right)
            (300, 500),   # resolution (bottom-center)
        ]

        for i, loc in enumerate(locations):
            pos = positions[i] if i < len(positions) else (100 + i * 80, 300)
            nodes.append({
                "id": loc.id,
                "label": loc.name,
                "x": pos[0],
                "y": pos[1],
                "atmosphere": loc.atmosphere,
                "color": loc.mood_color,
                "discovered": loc.discovery_condition == "",
            })

        # Build edges from exits
        for loc in locations:
            for direction, target_id in loc.exits.items():
                edges.append({
                    "source": loc.id,
                    "target": target_id,
                    "label": direction,
                })

        return {"nodes": nodes, "edges": edges}
