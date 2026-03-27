"""
Game Interview Engine — Story-driven therapeutic interview for narrative game creation.

Guides users through building a personalized game using SFBT + OARS patterns.
Questions are friendly, non-technical, answerable by a 12-year-old.
KG data seeds personalized suggestions. Mirror bubble logic detects emotional weight.

Three depths: Quick (10), Standard (20), Deep (30+)
Three vibes: "build_cool" (implicit), "your_way" (subtle), "explore_together" (explicit)
Five phases: Character, World, Story, Challenges, Choices

Research basis: Narrative Therapy, SFBT, OARS, Aesthetic Distance.
See docs/THERAPEUTIC-GAME-RESEARCH.md for full citations.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class InterviewDepth(Enum):
    QUICK = "quick"        # 10 questions
    STANDARD = "standard"  # 20 questions
    DEEP = "deep"          # 30+ questions


class VibeMode(Enum):
    BUILD_COOL = "build_cool"            # Implicit — pure game, no therapy
    YOUR_WAY = "your_way"                # Subtle — light mirrors
    EXPLORE_TOGETHER = "explore_together" # Explicit — connects to real feelings


class InterviewPhase(Enum):
    WARMUP = "warmup"
    CHARACTER = "character"
    WORLD = "world"
    STORY = "story"
    CHALLENGES = "challenges"
    CHOICES = "choices"
    SYNTHESIS = "synthesis"


@dataclass
class InterviewQuestion:
    """A single interview question."""
    id: str
    phase: InterviewPhase
    text: str
    purpose: str               # Internal — what this question reveals (never shown)
    depth_min: InterviewDepth  # Minimum depth to include this question
    follow_up: str = ""        # OARS-style follow-up prompt
    kg_seed_hint: str = ""     # If KG has data, suggest this (e.g., "companion_{media}")
    mirror_weight: float = 0.0 # 0.0-1.0 — likelihood this answer has emotional weight
    exit_ramp: str = ""        # Lighter alternative if user seems uncomfortable


@dataclass
class MirrorBubble:
    """A gentle reflection triggered by emotional weight in an answer."""
    reflection: str   # What Aria says in the bubble
    expand_prompt: str # What Aria says if user taps "Tell me more"


@dataclass
class InterviewState:
    """Tracks interview progress for a user."""
    user_id: str
    depth: InterviewDepth
    vibe: VibeMode
    current_phase: InterviewPhase = InterviewPhase.WARMUP
    current_index: int = 0
    answers: Dict[str, str] = field(default_factory=dict)
    warmup_answers: Dict[str, str] = field(default_factory=dict)
    mirror_bubbles_shown: int = 0
    mirror_bubbles_expanded: int = 0
    kg_seeds_used: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────────────────────
# WARMUP QUESTIONS (always asked, personalization)
# ─────────────────────────────────────────────────────────────────

WARMUP_QUESTIONS = [
    InterviewQuestion(
        id="warmup_stories",
        phase=InterviewPhase.WARMUP,
        text="If you could jump into any world — a movie, a book, a game, anything — which one would you pick?",
        purpose="Identify genre preference for game world generation",
        depth_min=InterviewDepth.QUICK,
    ),
    InterviewQuestion(
        id="warmup_cool",
        phase=InterviewPhase.WARMUP,
        text="Quick — name 3 things you think are awesome. Anything. Go.",
        purpose="Seed KG with preferences for character/world personalization",
        depth_min=InterviewDepth.QUICK,
    ),
    InterviewQuestion(
        id="warmup_hero",
        phase=InterviewPhase.WARMUP,
        text="Who's the coolest character you've ever seen in a movie, show, book, or game? What makes them cool?",
        purpose="Reference anchoring — reveals what qualities the user admires",
        depth_min=InterviewDepth.QUICK,
    ),
    InterviewQuestion(
        id="warmup_feeling",
        phase=InterviewPhase.WARMUP,
        text="What's your favorite feeling in a story — the thrill of a chase, solving a mystery, a moment that gives you chills, making you laugh, or something totally different?",
        purpose="Emotional tone preference for game atmosphere",
        depth_min=InterviewDepth.QUICK,
    ),
]


# ─────────────────────────────────────────────────────────────────
# PHASE 1: CHARACTER
# ─────────────────────────────────────────────────────────────────

CHARACTER_QUESTIONS = [
    # Quick (always included)
    InterviewQuestion(
        id="char_name",
        phase=InterviewPhase.CHARACTER,
        text="Time to name your character. What do people call them?",
        purpose="Character identity — name choice can be projective",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.1,
    ),
    InterviewQuestion(
        id="char_companion",
        phase=InterviewPhase.CHARACTER,
        text="Every great character has a sidekick. Who — or what — travels with yours?",
        purpose="Attachment/support system projection. KG can seed from media prefs",
        depth_min=InterviewDepth.QUICK,
        kg_seed_hint="companion_from_preferences",
        mirror_weight=0.2,
    ),
    InterviewQuestion(
        id="char_protect",
        phase=InterviewPhase.CHARACTER,
        text="Picture this: your character is running through chaos, and they grab ONE thing before everything changes. What is it — or who?",
        purpose="Core values projection — often reveals what user values most in real life",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.7,
        follow_up="That says a lot about who your character really is.",
        exit_ramp="Or — what's the first thing your character checks on when they wake up?",
    ),
    # Standard (added at 20 questions)
    InterviewQuestion(
        id="char_strength",
        phase=InterviewPhase.CHARACTER,
        text="Your character has something nobody else sees — a hidden skill, a quiet power, something they keep to themselves. What is it?",
        purpose="Hidden resilience — SFBT exception-finding through fiction",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.5,
        follow_up="That's the kind of thing that changes the game when it finally comes out.",
    ),
    InterviewQuestion(
        id="char_smile",
        phase=InterviewPhase.CHARACTER,
        text="It's a rare quiet moment in the story. Your character is actually smiling. What just happened?",
        purpose="Positive anchoring — identifies sources of joy",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.3,
    ),
    # Deep (added at 30+ questions)
    InterviewQuestion(
        id="char_fear",
        phase=InterviewPhase.CHARACTER,
        text="Your character is lying awake at night in the story. What thought keeps them from falling asleep?",
        purpose="Fear projection — gently surfaces real anxieties through fiction",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.8,
        follow_up="The characters who carry that kind of weight are usually the ones who end up changing everything.",
        exit_ramp="Or — what's the one thing your character always wants to be ready for?",
    ),
    InterviewQuestion(
        id="char_misunderstood",
        phase=InterviewPhase.CHARACTER,
        text="If the other characters in the story could see ONE thing about your character that they're getting wrong — what would it be?",
        purpose="Isolation/misunderstanding projection — common adolescent theme",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.7,
        follow_up="That gap between who someone is and who people think they are — that's where the best stories live.",
    ),
]


# ─────────────────────────────────────────────────────────────────
# PHASE 2: WORLD
# ─────────────────────────────────────────────────────────────────

WORLD_QUESTIONS = [
    InterviewQuestion(
        id="world_safe",
        phase=InterviewPhase.WORLD,
        text="Your character comes home after a long day. Where do they go? What does it look like, sound like, smell like?",
        purpose="Safe space identification — sand tray 'safe corner' equivalent",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.4,
        follow_up="I can almost see it. That's going to be an important place in the game.",
    ),
    InterviewQuestion(
        id="world_exciting",
        phase=InterviewPhase.WORLD,
        text="Now the fun part — what's the most incredible place in this world? The place your character can't wait to explore?",
        purpose="Adventure/exploration motivation — what draws them forward",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.1,
    ),
    InterviewQuestion(
        id="world_avoid",
        phase=InterviewPhase.WORLD,
        text="There's a place on the edge of the map that nobody goes to. What do people say about it? What does your character think is actually there?",
        purpose="Avoidance mapping — projects real avoidance patterns into geography",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.6,
        follow_up="The places nobody goes to always end up being important. Interesting.",
        exit_ramp="Or — what's the weirdest place your character has ever stumbled into?",
    ),
    InterviewQuestion(
        id="world_people",
        phase=InterviewPhase.WORLD,
        text="Your character walks into a crowded room in this world. What's the vibe? Who catches their eye first?",
        purpose="Interpersonal trust baseline — how the user perceives social environments",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.3,
    ),
    InterviewQuestion(
        id="world_weather",
        phase=InterviewPhase.WORLD,
        text="What does the sky look like in your character's world right now? Does it change with the story, or is it always the same?",
        purpose="Emotional atmosphere preference + world richness",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.1,
    ),
    InterviewQuestion(
        id="world_rules",
        phase=InterviewPhase.WORLD,
        text="What's the one thing that works differently in this world? One rule that doesn't exist in real life — magic, technology, a power, anything.",
        purpose="Fantasy mechanism — what power/control the user wishes existed",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.2,
    ),
    InterviewQuestion(
        id="world_secret",
        phase=InterviewPhase.WORLD,
        text="There's a place only your character knows about. Nobody else has found it. What is it, and why do they keep it to themselves?",
        purpose="Inner world / private self projection",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.5,
        follow_up="A secret place. That's going to matter later in the story. I can feel it.",
    ),
]


# ─────────────────────────────────────────────────────────────────
# PHASE 3: STORY
# ─────────────────────────────────────────────────────────────────

STORY_QUESTIONS = [
    InterviewQuestion(
        id="story_change",
        phase=InterviewPhase.STORY,
        text="Opening scene. Your character's normal day gets interrupted. Something happens that changes everything. What is it?",
        purpose="Catalyst identification — what disruptions feel significant to the user",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.6,
        follow_up="Now THAT's an opening. I can see this story already.",
    ),
    InterviewQuestion(
        id="story_helper",
        phase=InterviewPhase.STORY,
        text="Your character can't do this alone. Who shows up for them — and what's the one thing that makes your character trust this person?",
        purpose="Support system mapping — who the user trusts/wishes they had",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.5,
        follow_up="That's the kind of character the player will remember.",
    ),
    InterviewQuestion(
        id="story_harder",
        phase=InterviewPhase.STORY,
        text="Every great story needs a force working against the hero. What stands between your character and what they want? Describe it — a person, a creature, a force, a shadow, anything.",
        purpose="Antagonist creation — externalization of real struggles. This is where the user naturally builds the villain from their own pain.",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.8,
        follow_up="That's a villain that will make the player's choices feel real.",
        exit_ramp="Or — what's the biggest obstacle your character has faced so far in the story?",
    ),
    InterviewQuestion(
        id="story_want",
        phase=InterviewPhase.STORY,
        text="If your character reaches the end of this story and WINS — what does that look like? Not treasure or power — what's actually different about their life?",
        purpose="SFBT miracle question adapted — desired state through fiction",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.7,
        follow_up="That's what the whole game is building toward.",
    ),
    InterviewQuestion(
        id="story_surprised",
        phase=InterviewPhase.STORY,
        text="There's a moment in the story where your character does something nobody expected — including themselves. What happens?",
        purpose="SFBT exception-finding — unique outcomes in narrative therapy terms",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.6,
        follow_up="THAT'S the scene the player will remember.",
    ),
    InterviewQuestion(
        id="story_secret",
        phase=InterviewPhase.STORY,
        text="Your character carries something that nobody else in the story knows about. Not something they're hiding on purpose — just something they haven't found the right moment to say. What is it?",
        purpose="Hidden self — what the user carries privately. High projective value.",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.9,
        follow_up="The moment that comes out in the story is going to be powerful.",
        exit_ramp="Or — what's the thing your character is most proud of but never talks about?",
    ),
    InterviewQuestion(
        id="story_forgive",
        phase=InterviewPhase.STORY,
        text="Somewhere in this story, there's an unresolved thing between your character and someone else. Something unsaid, unfinished. What is it, and who's on the other end?",
        purpose="Forgiveness/reconciliation theme — deep therapeutic territory",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.9,
        follow_up="Unfinished business makes the best story arcs.",
        exit_ramp="Or — what's the conversation your character has been putting off?",
    ),
    InterviewQuestion(
        id="story_keeping_going",
        phase=InterviewPhase.STORY,
        text="The story gets dark for a moment. Your character could stop, turn around, give up. But they don't. Why not? What's pulling them forward?",
        purpose="SFBT coping question — resilience identification through fiction",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.6,
        follow_up="That's the engine of the whole story.",
    ),
]


# ─────────────────────────────────────────────────────────────────
# PHASE 4: CHALLENGES
# ─────────────────────────────────────────────────────────────────

CHALLENGE_QUESTIONS = [
    InterviewQuestion(
        id="chal_courage",
        phase=InterviewPhase.CHALLENGES,
        text="Let's build your character's stats. Courage meter: where does your character start — 1 is hiding under the bed, 10 is charging into the unknown. And what's the one thing that would push the needle up?",
        purpose="SFBT scaling question — gamified. Identifies incremental progress",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.4,
    ),
    InterviewQuestion(
        id="chal_solve",
        phase=InterviewPhase.CHALLENGES,
        text="Your character hits a locked door. No key in sight. Do they kick it down, search for a clever way in, call for backup, or say 'not this door' and find another way?",
        purpose="Problem-solving style — reveals approach to obstacles",
        depth_min=InterviewDepth.QUICK,
        mirror_weight=0.2,
    ),
    InterviewQuestion(
        id="chal_fail",
        phase=InterviewPhase.CHALLENGES,
        text="Your character tries something in the story and it doesn't work. Describe the next 10 seconds — what do they do, what do they feel, what happens next?",
        purpose="Failure response pattern — critical for therapeutic insight",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.6,
        follow_up="I love that reaction. It'll make the gameplay feel real.",
    ),
    InterviewQuestion(
        id="chal_trust",
        phase=InterviewPhase.CHALLENGES,
        text="A new character shows up in the story and offers to help. Your character isn't sure about them yet. What's the first thing your character notices that makes them think 'okay, maybe'?",
        purpose="Trust building pattern — interpersonal assessment style",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.5,
    ),
    InterviewQuestion(
        id="chal_alone",
        phase=InterviewPhase.CHALLENGES,
        text="Big moment coming up in the story. Your character can bring someone along or go solo. What feels right for this character — and what makes that the right call?",
        purpose="Independence vs. connection preference",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.4,
    ),
]


# ─────────────────────────────────────────────────────────────────
# PHASE 5: CHOICES
# ─────────────────────────────────────────────────────────────────

CHOICE_QUESTIONS = [
    InterviewQuestion(
        id="choice_fork",
        phase=InterviewPhase.CHOICES,
        text="Two paths. One leads back to everything your character knows. The other disappears into fog — could be incredible, could be nothing. Your character has about three seconds to decide. Which way do they go?",
        purpose="Risk tolerance / openness to change",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.3,
    ),
    InterviewQuestion(
        id="choice_help",
        phase=InterviewPhase.CHOICES,
        text="A stranger in the story is in trouble. Helping them means your character might lose time, get hurt, or miss something important. What does your character do — and how fast do they decide?",
        purpose="Altruism vs. self-preservation balance",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.4,
    ),
    InterviewQuestion(
        id="choice_ending",
        phase=InterviewPhase.CHOICES,
        text="Close your eyes for a second. The story is over. Your character made it. What does the final scene look like?",
        purpose="Desired resolution — what 'success' looks like to the user",
        depth_min=InterviewDepth.STANDARD,
        mirror_weight=0.5,
        follow_up="I can see that ending. Let's build a story that gets there.",
    ),
    InterviewQuestion(
        id="choice_sacrifice",
        phase=InterviewPhase.CHOICES,
        text="The story reaches a moment where your character can save someone they care about — but it costs them something precious. Not money, not an item. Something deeper. What do they give up?",
        purpose="Sacrifice/values hierarchy — deep projective",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.7,
        follow_up="That's the kind of moment that defines a whole character.",
        exit_ramp="Or — what would your character fight to keep, no matter what?",
    ),
    InterviewQuestion(
        id="choice_power",
        phase=InterviewPhase.CHOICES,
        text="Near the end of the story, your character finds something powerful. They can use it once, for anyone — but not for themselves. Who do they think of first, and what do they do?",
        purpose="Empathy/care direction — who the user thinks about when given power",
        depth_min=InterviewDepth.DEEP,
        mirror_weight=0.6,
    ),
]


# ─────────────────────────────────────────────────────────────────
# ENGINE
# ─────────────────────────────────────────────────────────────────

# All questions by phase
ALL_QUESTIONS = {
    InterviewPhase.WARMUP: WARMUP_QUESTIONS,
    InterviewPhase.CHARACTER: CHARACTER_QUESTIONS,
    InterviewPhase.WORLD: WORLD_QUESTIONS,
    InterviewPhase.STORY: STORY_QUESTIONS,
    InterviewPhase.CHALLENGES: CHALLENGE_QUESTIONS,
    InterviewPhase.CHOICES: CHOICE_QUESTIONS,
}

# Phase order
PHASE_ORDER = [
    InterviewPhase.WARMUP,
    InterviewPhase.CHARACTER,
    InterviewPhase.WORLD,
    InterviewPhase.STORY,
    InterviewPhase.CHALLENGES,
    InterviewPhase.CHOICES,
]

# Depth thresholds
DEPTH_INCLUDES = {
    InterviewDepth.QUICK: {InterviewDepth.QUICK},
    InterviewDepth.STANDARD: {InterviewDepth.QUICK, InterviewDepth.STANDARD},
    InterviewDepth.DEEP: {InterviewDepth.QUICK, InterviewDepth.STANDARD, InterviewDepth.DEEP},
}


class GameInterviewEngine:
    """
    Conducts a story-driven interview to build a personalized narrative game.

    Uses SFBT + OARS patterns. Questions are friendly, non-technical.
    KG data personalizes suggestions. Mirror bubbles detect emotional weight.
    """

    def __init__(self):
        self._states: Dict[str, InterviewState] = {}

    def start_interview(self, user_id: str, depth: str = "standard",
                        vibe: str = "build_cool",
                        kg_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Start a new interview for a user.

        Args:
            user_id: User identifier
            depth: "quick", "standard", or "deep"
            vibe: "build_cool", "your_way", or "explore_together"
            kg_data: Optional KG data for personalization (media, concerns, etc.)

        Returns:
            First question + interview metadata
        """
        depth_enum = InterviewDepth(depth)
        vibe_enum = VibeMode(vibe)

        state = InterviewState(
            user_id=user_id,
            depth=depth_enum,
            vibe=vibe_enum,
        )
        self._states[user_id] = state

        # Get the question plan for this depth
        questions = self._get_question_plan(depth_enum)

        # Personalize with KG data if available
        if kg_data:
            questions = self._personalize_questions(questions, kg_data)

        # Store the plan
        state._question_plan = questions

        # Return first question
        return self._format_next_question(state)

    def answer_question(self, user_id: str, answer: str) -> Dict[str, Any]:
        """
        Process an answer and return the next question or completion.

        Returns:
            {
                "status": "next" | "complete" | "mirror_bubble",
                "question": {...} | None,
                "mirror_bubble": {...} | None,
                "progress": {"current": N, "total": M, "phase": "..."},
                "synthesis": {...} | None  (only when complete)
            }
        """
        state = self._states.get(user_id)
        if not state:
            return {"status": "error", "message": "No active interview"}

        # Store the answer
        plan = getattr(state, '_question_plan', [])
        if state.current_index < len(plan):
            q = plan[state.current_index]
            state.answers[q.id] = answer

            # Check for mirror bubble
            bubble = self._check_mirror_bubble(q, answer, state.vibe)
            if bubble:
                state.mirror_bubbles_shown += 1
                state.current_index += 1
                return {
                    "status": "mirror_bubble",
                    "mirror_bubble": {
                        "reflection": bubble.reflection,
                        "expand_prompt": bubble.expand_prompt,
                    },
                    "progress": self._get_progress(state),
                    "next_question": self._peek_next(state),
                }

        state.current_index += 1

        # Check if interview is complete
        if state.current_index >= len(plan):
            synthesis = self._synthesize(state)
            return {
                "status": "complete",
                "synthesis": synthesis,
                "progress": self._get_progress(state),
                "stats": {
                    "questions_answered": len(state.answers),
                    "mirror_bubbles_shown": state.mirror_bubbles_shown,
                    "mirror_bubbles_expanded": state.mirror_bubbles_expanded,
                },
            }

        return self._format_next_question(state)

    def expand_mirror(self, user_id: str) -> Dict[str, Any]:
        """User tapped 'Tell me more' on a mirror bubble."""
        state = self._states.get(user_id)
        if state:
            state.mirror_bubbles_expanded += 1
        return {"status": "expanded"}

    def get_state(self, user_id: str) -> Optional[InterviewState]:
        """Get current interview state."""
        return self._states.get(user_id)

    # ── Internal ────────────────────────────────────────────────

    def _get_question_plan(self, depth: InterviewDepth) -> List[InterviewQuestion]:
        """Build the ordered question plan for a depth level."""
        included = DEPTH_INCLUDES[depth]
        plan = []
        for phase in PHASE_ORDER:
            questions = ALL_QUESTIONS.get(phase, [])
            for q in questions:
                if q.depth_min in included:
                    plan.append(q)
        return plan

    def _personalize_questions(self, questions: List[InterviewQuestion],
                                kg_data: Dict[str, Any]) -> List[InterviewQuestion]:
        """Personalize question text based on KG data."""
        media = kg_data.get("media", [])
        preferences = kg_data.get("preferences", [])

        personalized = []
        for q in questions:
            q_copy = InterviewQuestion(
                id=q.id, phase=q.phase, text=q.text, purpose=q.purpose,
                depth_min=q.depth_min, follow_up=q.follow_up,
                kg_seed_hint=q.kg_seed_hint, mirror_weight=q.mirror_weight,
                exit_ramp=q.exit_ramp,
            )

            # Seed companion question with preferences
            if q.kg_seed_hint == "companion_from_preferences" and preferences:
                pref = preferences[0] if preferences else ""
                if pref:
                    q_copy.text = (
                        f"Does your character have a companion? "
                        f"Maybe something like a {pref}, or anything you'd like."
                    )

            personalized.append(q_copy)

        return personalized

    def _check_mirror_bubble(self, question: InterviewQuestion,
                              answer: str, vibe: VibeMode) -> Optional[MirrorBubble]:
        """
        Check if an answer warrants a mirror bubble.

        Uses question's mirror_weight + answer emotional signals.
        """
        if question.mirror_weight < 0.4:
            return None  # Low weight questions don't trigger bubbles

        # Detect emotional weight in the answer
        emotional_signals = self._detect_emotional_weight(answer)

        # Combined score
        score = question.mirror_weight * 0.6 + emotional_signals * 0.4

        if score < 0.5:
            return None

        # Build the reflection based on vibe mode
        reflection = question.follow_up or "That feels important."

        if vibe == VibeMode.BUILD_COOL:
            # Implicit: stay in game fiction
            expand = "Want to tell me more about that part of the story?"
        elif vibe == VibeMode.YOUR_WAY:
            # Subtle: gentle bridge
            expand = "That seems like it matters — to your character, and maybe beyond the story too."
        else:
            # Explicit: direct connection
            expand = "Is that something that matters to you too? We can explore that if you'd like."

        return MirrorBubble(reflection=reflection, expand_prompt=expand)

    def _detect_emotional_weight(self, answer: str) -> float:
        """
        Detect emotional weight in an answer.

        Returns 0.0-1.0 score based on indicators.
        Not clinical assessment — just signal detection for mirror bubbles.
        """
        if not answer or len(answer.strip()) < 5:
            return 0.0

        answer_lower = answer.lower()
        score = 0.0

        # Length as engagement signal (longer = more invested)
        words = len(answer.split())
        if words > 20:
            score += 0.2
        if words > 40:
            score += 0.1

        # Personal pronouns suggest personal connection
        personal = sum(1 for w in ["my", "me", "i", "mine", "myself"]
                      if f" {w} " in f" {answer_lower} ")
        if personal >= 2:
            score += 0.3

        # Emotional vocabulary
        emotional_words = {
            "love", "hate", "afraid", "scared", "safe", "alone", "lost",
            "brave", "protect", "family", "friend", "miss", "wish",
            "hope", "hurt", "happy", "sad", "angry", "trust", "real",
            "always", "never", "important", "special", "secret",
        }
        emotional_count = sum(1 for w in emotional_words if w in answer_lower)
        score += min(0.3, emotional_count * 0.1)

        # Hesitation markers
        hesitation = any(h in answer_lower for h in
                        ["i think", "maybe", "i don't know", "i guess", "kind of", "sort of"])
        if hesitation:
            score += 0.1

        return min(1.0, score)

    def _format_next_question(self, state: InterviewState) -> Dict[str, Any]:
        """Format the next question for delivery."""
        plan = getattr(state, '_question_plan', [])
        if state.current_index >= len(plan):
            return {"status": "complete"}

        q = plan[state.current_index]
        return {
            "status": "next",
            "question": {
                "id": q.id,
                "text": q.text,
                "phase": q.phase.value,
                "has_exit_ramp": bool(q.exit_ramp),
                "exit_ramp": q.exit_ramp if q.exit_ramp else None,
            },
            "progress": self._get_progress(state),
        }

    def _peek_next(self, state: InterviewState) -> Optional[Dict]:
        """Peek at the next question (for after mirror bubble)."""
        plan = getattr(state, '_question_plan', [])
        if state.current_index < len(plan):
            q = plan[state.current_index]
            return {"id": q.id, "text": q.text, "phase": q.phase.value}
        return None

    def _get_progress(self, state: InterviewState) -> Dict[str, Any]:
        """Get interview progress."""
        plan = getattr(state, '_question_plan', [])
        total = len(plan)
        current = min(state.current_index, total)
        phase = plan[current].phase.value if current < total else "complete"
        return {
            "current": current + 1,
            "total": total,
            "phase": phase,
            "percent": round((current / total) * 100) if total > 0 else 100,
        }

    def _synthesize(self, state: InterviewState) -> Dict[str, Any]:
        """
        Synthesize interview answers into a game creation brief.

        This output feeds into GameGenerator to create the full game config.
        """
        answers = state.answers

        return {
            "user_id": state.user_id,
            "depth": state.depth.value,
            "vibe": state.vibe.value,
            "character": {
                "name": answers.get("char_name", ""),
                "companion": answers.get("char_companion", ""),
                "protects": answers.get("char_protect", ""),
                "strength": answers.get("char_strength", ""),
                "joy": answers.get("char_smile", ""),
                "fear": answers.get("char_fear", ""),
                "misunderstood": answers.get("char_misunderstood", ""),
            },
            "world": {
                "safe_place": answers.get("world_safe", ""),
                "exciting_place": answers.get("world_exciting", ""),
                "avoided_place": answers.get("world_avoid", ""),
                "people": answers.get("world_people", ""),
                "weather": answers.get("world_weather", ""),
                "rules": answers.get("world_rules", ""),
                "secret_place": answers.get("world_secret", ""),
            },
            "story": {
                "catalyst": answers.get("story_change", ""),
                "helper": answers.get("story_helper", ""),
                "antagonist": answers.get("story_harder", ""),
                "desire": answers.get("story_want", ""),
                "surprise": answers.get("story_surprised", ""),
                "secret": answers.get("story_secret", ""),
                "forgiveness": answers.get("story_forgive", ""),
                "resilience": answers.get("story_keeping_going", ""),
            },
            "challenges": {
                "courage_level": answers.get("chal_courage", ""),
                "problem_style": answers.get("chal_solve", ""),
                "failure_response": answers.get("chal_fail", ""),
                "trust_style": answers.get("chal_trust", ""),
                "solo_or_team": answers.get("chal_alone", ""),
            },
            "choices": {
                "risk_preference": answers.get("choice_fork", ""),
                "help_response": answers.get("choice_help", ""),
                "desired_ending": answers.get("choice_ending", ""),
                "sacrifice": answers.get("choice_sacrifice", ""),
                "selfless_wish": answers.get("choice_power", ""),
            },
            "preferences": {
                "genre": answers.get("warmup_stories", ""),
                "cool_things": answers.get("warmup_cool", ""),
                "hero_reference": answers.get("warmup_hero", ""),
                "desired_feeling": answers.get("warmup_feeling", ""),
            },
            "interview_stats": {
                "questions_answered": len(answers),
                "mirror_bubbles_shown": state.mirror_bubbles_shown,
                "mirror_bubbles_expanded": state.mirror_bubbles_expanded,
            },
        }
