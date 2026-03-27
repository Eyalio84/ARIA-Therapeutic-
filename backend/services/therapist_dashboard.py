"""
Therapist Dashboard Service — Clinical oversight for the narrative game engine.

Provides:
1. Choice Evolution Timeline — how user's choices change across sessions
2. Mirror Bubble Analytics — engagement depth tracking
3. Antagonist Analysis — externalized struggle surfaced in user's own words
4. Session Notes — therapist annotations on nodes/flags
5. Mood Check-In — 1-5 slider at session start/end → velocity tracking
6. Flagged Moments — concerning content with severity
7. KG Summary — nodes, edges, themes, growth rate
8. Soft Achievements — non-competitive acknowledgments
"""

import json
import os
import sqlite3
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime

from data.build_therapy_kg import TherapyKG


# ─────────────────────────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────────────────────────

@dataclass
class ChoiceEvent:
    """A single choice from the choice evolution timeline."""
    session: int
    quest: str
    choice_text: str
    therapeutic_note: str
    turn: int
    timestamp: str = ""

@dataclass
class MoodCheckIn:
    """Mood at session start and end."""
    session_id: str
    mood_start: int  # 1-5
    mood_end: int    # 1-5
    timestamp: str = ""

@dataclass
class Achievement:
    """A soft, non-competitive achievement."""
    id: str
    title: str
    description: str
    earned: bool = False
    session_earned: str = ""

@dataclass
class SessionNote:
    """Therapist annotation on a flagged moment or node."""
    id: str
    target_type: str  # "node", "flag", "choice", "session"
    target_id: str
    note: str
    timestamp: str = ""

@dataclass
class FlaggedMoment:
    """A moment flagged for therapist attention."""
    id: str
    session_id: str
    severity: str  # "info", "attention", "concern", "urgent"
    category: str  # "disclosure", "avoidance_pattern", "emotional_weight", "antagonist_theme"
    description: str
    user_content: str  # The actual user language (for context)
    timestamp: str = ""
    therapist_note: str = ""


# ─────────────────────────────────────────────────────────────────
# Achievement Definitions
# ─────────────────────────────────────────────────────────────────

ACHIEVEMENT_DEFS = [
    Achievement("first_step", "First Step", "Started your first adventure"),
    Achievement("world_builder", "World Builder", "Created a complete game world"),
    Achievement("new_place", "Explorer", "Visited a new place in your world"),
    Achievement("helped_someone", "Helping Hand", "Your character helped someone"),
    Achievement("faced_hard", "Brave Heart", "Faced something difficult"),
    Achievement("opened_mirror", "Looking Deeper", "Chose to explore a reflection"),
    Achievement("came_back", "Welcome Back", "Returned to continue your story"),
    Achievement("finished_quest", "Quest Complete", "Completed a quest arc"),
    Achievement("found_item", "Treasure Hunter", "Found a special item"),
    Achievement("talked_npc", "Made a Friend", "Had a meaningful conversation"),
]


# ─────────────────────────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────────────────────────

class TherapistDashboardService:
    """
    Provides clinical oversight data for the therapist.

    Reads from user's TherapyKG + game state.
    Stores therapist notes and mood check-ins in a separate SQLite DB.
    """

    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "therapist"
        )
        os.makedirs(self.data_dir, exist_ok=True)
        self._db_path = os.path.join(self.data_dir, "dashboard.db")
        self._conn: Optional[sqlite3.Connection] = None

    @property
    def conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self._db_path)
            self._conn.row_factory = sqlite3.Row
            self._conn.executescript("""
                CREATE TABLE IF NOT EXISTS session_notes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    note TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS mood_checkins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    mood_start INTEGER,
                    mood_end INTEGER,
                    timestamp TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS flagged_moments (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT NOT NULL,
                    user_content TEXT,
                    timestamp TEXT NOT NULL,
                    therapist_note TEXT DEFAULT ''
                );

                CREATE TABLE IF NOT EXISTS achievements (
                    user_id TEXT NOT NULL,
                    achievement_id TEXT NOT NULL,
                    session_earned TEXT,
                    timestamp TEXT NOT NULL,
                    PRIMARY KEY (user_id, achievement_id)
                );

                CREATE INDEX IF NOT EXISTS idx_notes_user ON session_notes(user_id);
                CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_checkins(user_id);
                CREATE INDEX IF NOT EXISTS idx_flags_user ON flagged_moments(user_id);
            """)
        return self._conn

    # ── 1. Choice Evolution Timeline ────────────────────────────

    def get_choice_timeline(self, user_id: str,
                            choices_log: List[Dict]) -> List[Dict[str, Any]]:
        """
        Build a choice evolution timeline from game choices_log.

        Shows how the user's choices change across sessions.
        """
        timeline = []
        for i, choice in enumerate(choices_log):
            timeline.append({
                "session_index": i,
                "quest": choice.get("quest", ""),
                "choice_id": choice.get("choice", ""),
                "therapeutic_note": choice.get("therapeutic_note", ""),
                "turn": choice.get("turn", 0),
                "therapeutic_mapping": choice.get("quest", ""),
            })

        # Detect evolution patterns
        patterns = self._detect_choice_patterns(timeline)

        return {
            "timeline": timeline,
            "patterns": patterns,
            "total_choices": len(timeline),
        }

    def _detect_choice_patterns(self, timeline: List[Dict]) -> List[str]:
        """Detect patterns in choice evolution."""
        patterns = []
        notes = [t.get("therapeutic_note", "") for t in timeline]

        # Check for shift from avoidance to confrontation
        avoidance_notes = {"self_reliant", "cautious_trust", "strategic_avoidance"}
        approach_notes = {"seeks_support", "opens_up_to_support", "confrontation",
                          "assertiveness_breakthrough", "recognizes_need_for_support"}

        early = notes[:len(notes)//2] if len(notes) >= 4 else []
        late = notes[len(notes)//2:] if len(notes) >= 4 else []

        early_avoidance = sum(1 for n in early if n in avoidance_notes)
        late_approach = sum(1 for n in late if n in approach_notes)

        if early_avoidance > 0 and late_approach > 0:
            patterns.append("Shift from avoidance toward engagement observed")

        # Check for consistent support-seeking
        support = sum(1 for n in notes if n in approach_notes)
        if support >= 3:
            patterns.append("Consistent pattern of seeking support and connection")

        # Check for growing courage
        if any(n == "assertiveness_breakthrough" for n in notes):
            patterns.append("Assertiveness breakthrough achieved")

        return patterns

    # ── 2. Mirror Bubble Analytics ──────────────────────────────

    def get_mirror_analytics(self, interview_stats: Dict,
                              game_stats: Dict = None) -> Dict[str, Any]:
        """
        Analyze mirror bubble engagement.

        Ratio of shown vs expanded tells how open the user is becoming.
        """
        shown = interview_stats.get("mirror_bubbles_shown", 0)
        expanded = interview_stats.get("mirror_bubbles_expanded", 0)

        ratio = expanded / shown if shown > 0 else 0
        engagement = "high" if ratio > 0.5 else "moderate" if ratio > 0.2 else "low"

        return {
            "interview_shown": shown,
            "interview_expanded": expanded,
            "engagement_ratio": round(ratio, 2),
            "engagement_level": engagement,
            "interpretation": self._interpret_mirror_engagement(ratio, shown),
        }

    def _interpret_mirror_engagement(self, ratio: float, shown: int) -> str:
        if shown == 0:
            return "No mirror moments triggered — answers were brief or surface-level."
        if ratio > 0.6:
            return "User is actively engaging with reflections — high openness to self-exploration."
        if ratio > 0.3:
            return "User selectively engages with reflections — building trust gradually."
        if ratio > 0:
            return "User occasionally explores reflections — comfortable but cautious."
        return "User dismisses all reflections — may prefer game-focused interaction. Consider implicit mode."

    # ── 3. Antagonist Analysis ──────────────────────────────────

    def get_antagonist_analysis(self, synthesis: Dict) -> Dict[str, Any]:
        """
        Surface the user's antagonist description — their externalized struggle.

        The therapist sees the exact user language.
        """
        story = synthesis.get("story", {})
        antagonist = story.get("antagonist", "")
        desire = story.get("desire", "")
        fear = synthesis.get("character", {}).get("fear", "")

        return {
            "antagonist_description": antagonist,
            "user_exact_words": antagonist,  # Highlighted in dashboard
            "desired_resolution": desire,
            "character_fear": fear,
            "interpretation_note": (
                "The antagonist is the user's externalized struggle. "
                "Do NOT interpret this to the user — use it to inform clinical approach. "
                "The user's exact words are the most valuable data."
            ),
        }

    # ── 4. Session Notes ────────────────────────────────────────

    def add_note(self, user_id: str, target_type: str,
                 target_id: str, note: str) -> str:
        """Add a therapist annotation."""
        import uuid
        note_id = f"note_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()

        self.conn.execute(
            "INSERT INTO session_notes (id, user_id, target_type, target_id, note, timestamp) "
            "VALUES (?,?,?,?,?,?)",
            (note_id, user_id, target_type, target_id, note, now)
        )
        self.conn.commit()
        return note_id

    def get_notes(self, user_id: str) -> List[Dict]:
        """Get all therapist notes for a user."""
        rows = self.conn.execute(
            "SELECT * FROM session_notes WHERE user_id = ? ORDER BY timestamp DESC",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── 5. Mood Check-In ────────────────────────────────────────

    def record_mood(self, user_id: str, session_id: str,
                    mood_start: int = None, mood_end: int = None) -> Dict:
        """Record mood check-in (1-5 scale)."""
        now = datetime.utcnow().isoformat()

        # Check if entry exists for this session
        existing = self.conn.execute(
            "SELECT id FROM mood_checkins WHERE user_id = ? AND session_id = ?",
            (user_id, session_id)
        ).fetchone()

        if existing:
            if mood_end is not None:
                self.conn.execute(
                    "UPDATE mood_checkins SET mood_end = ?, timestamp = ? WHERE id = ?",
                    (mood_end, now, existing["id"])
                )
        else:
            self.conn.execute(
                "INSERT INTO mood_checkins (user_id, session_id, mood_start, mood_end, timestamp) "
                "VALUES (?,?,?,?,?)",
                (user_id, session_id, mood_start, mood_end, now)
            )

        self.conn.commit()
        return {"recorded": True}

    def get_mood_history(self, user_id: str) -> List[Dict]:
        """Get mood check-in history."""
        rows = self.conn.execute(
            "SELECT * FROM mood_checkins WHERE user_id = ? ORDER BY timestamp ASC",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_mood_velocity(self, user_id: str) -> Dict[str, Any]:
        """Calculate mood trend from check-in history."""
        history = self.get_mood_history(user_id)
        if len(history) < 2:
            return {"trend": "insufficient_data", "sessions": len(history)}

        ends = [h["mood_end"] for h in history if h.get("mood_end") is not None]
        if len(ends) < 2:
            return {"trend": "insufficient_data", "sessions": len(ends)}

        recent = ends[-1]
        previous = ends[-2]
        delta = recent - previous

        trend = "improving" if delta > 0 else "declining" if delta < 0 else "stable"
        avg = sum(ends) / len(ends)

        return {
            "trend": trend,
            "delta": delta,
            "average": round(avg, 1),
            "latest": recent,
            "sessions": len(ends),
        }

    # ── 6. Flagged Moments ──────────────────────────────────────

    def add_flag(self, user_id: str, session_id: str, severity: str,
                 category: str, description: str,
                 user_content: str = "") -> str:
        """Flag a moment for therapist attention."""
        import uuid
        flag_id = f"flag_{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()

        self.conn.execute(
            "INSERT INTO flagged_moments "
            "(id, user_id, session_id, severity, category, description, user_content, timestamp) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (flag_id, user_id, session_id, severity, category, description, user_content, now)
        )
        self.conn.commit()
        return flag_id

    def get_flags(self, user_id: str) -> List[Dict]:
        """Get all flagged moments for a user."""
        rows = self.conn.execute(
            "SELECT * FROM flagged_moments WHERE user_id = ? ORDER BY timestamp DESC",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def annotate_flag(self, flag_id: str, note: str) -> bool:
        """Add therapist note to a flagged moment."""
        cursor = self.conn.execute(
            "UPDATE flagged_moments SET therapist_note = ? WHERE id = ?",
            (note, flag_id)
        )
        self.conn.commit()
        return cursor.rowcount > 0

    # ── 7. Achievements ─────────────────────────────────────────

    def earn_achievement(self, user_id: str, achievement_id: str,
                         session_id: str = "") -> Optional[Dict]:
        """Award an achievement. Returns the achievement if new, None if already earned."""
        now = datetime.utcnow().isoformat()

        # Check if already earned
        existing = self.conn.execute(
            "SELECT * FROM achievements WHERE user_id = ? AND achievement_id = ?",
            (user_id, achievement_id)
        ).fetchone()

        if existing:
            return None  # Already earned

        self.conn.execute(
            "INSERT INTO achievements (user_id, achievement_id, session_earned, timestamp) "
            "VALUES (?,?,?,?)",
            (user_id, achievement_id, session_id, now)
        )
        self.conn.commit()

        # Find the achievement definition
        defn = next((a for a in ACHIEVEMENT_DEFS if a.id == achievement_id), None)
        if defn:
            return {"id": defn.id, "title": defn.title, "description": defn.description}
        return {"id": achievement_id, "title": achievement_id, "description": ""}

    def get_achievements(self, user_id: str) -> List[Dict]:
        """Get all achievements for a user (earned and unearned)."""
        earned = self.conn.execute(
            "SELECT achievement_id, session_earned, timestamp FROM achievements WHERE user_id = ?",
            (user_id,)
        ).fetchall()
        earned_ids = {r["achievement_id"] for r in earned}
        earned_map = {r["achievement_id"]: dict(r) for r in earned}

        result = []
        for defn in ACHIEVEMENT_DEFS:
            entry = {
                "id": defn.id,
                "title": defn.title,
                "description": defn.description,
                "earned": defn.id in earned_ids,
            }
            if defn.id in earned_map:
                entry["session_earned"] = earned_map[defn.id]["session_earned"]
                entry["timestamp"] = earned_map[defn.id]["timestamp"]
            result.append(entry)

        return result

    # ── 8. Full Dashboard View ──────────────────────────────────

    def get_full_dashboard(self, user_id: str, kg: TherapyKG = None,
                            synthesis: Dict = None,
                            choices_log: List[Dict] = None,
                            interview_stats: Dict = None) -> Dict[str, Any]:
        """
        Compile the complete therapist dashboard for a user.

        Returns everything a therapist needs in one call.
        """
        dashboard = {
            "user_id": user_id,
            "generated_at": datetime.utcnow().isoformat(),
        }

        # KG summary
        if kg:
            dashboard["kg_stats"] = kg.stats()
            dashboard["active_concerns"] = kg.get_active_concerns()
            dashboard["all_nodes_by_type"] = {
                ntype: kg.get_nodes_by_type(ntype)
                for ntype in ["concern", "emotion", "trigger", "coping",
                              "media", "breakthrough", "goal"]
            }
            dashboard["session_history"] = kg.get_session_history()

        # Choice timeline
        if choices_log:
            dashboard["choice_timeline"] = self.get_choice_timeline(user_id, choices_log)

        # Mirror analytics
        if interview_stats:
            dashboard["mirror_analytics"] = self.get_mirror_analytics(interview_stats)

        # Antagonist analysis
        if synthesis:
            dashboard["antagonist_analysis"] = self.get_antagonist_analysis(synthesis)

        # Mood
        dashboard["mood_history"] = self.get_mood_history(user_id)
        dashboard["mood_velocity"] = self.get_mood_velocity(user_id)

        # Flags
        dashboard["flagged_moments"] = self.get_flags(user_id)

        # Notes
        dashboard["therapist_notes"] = self.get_notes(user_id)

        # Achievements
        dashboard["achievements"] = self.get_achievements(user_id)

        return dashboard

    # ── Story So Far ────────────────────────────────────────────

    def generate_story_recap(self, user_id: str, kg: TherapyKG = None,
                              game_state: Dict = None,
                              config: Dict = None) -> str:
        """
        Generate "Story So Far" narrative for session handoff.

        Combines KG data + game state into a brief recap that
        Aria can read aloud at the start of a returning session.
        """
        parts = []

        protagonist = config.get("protagonist_name", "Your character") if config else "Your character"

        # Game progress
        if game_state:
            location = game_state.get("location_id", "")
            turns = game_state.get("turn_count", 0)
            quests_done = len(game_state.get("completed_quests", []))
            items = len(game_state.get("inventory", []))

            if location:
                parts.append(f"Last time, {protagonist} was at {location}.")
            if quests_done > 0:
                parts.append(f"You've completed {quests_done} quest{'s' if quests_done > 1 else ''}.")
            if items > 1:
                parts.append(f"You're carrying {items} items.")

        # Companion
        if config and config.get("companion", {}).get("name"):
            parts.append(f"{config['companion']['name']} is right here with you.")

        # KG-based context
        if kg:
            concerns = kg.get_active_concerns(threshold=0.5)
            if concerns:
                top = concerns[0]
                parts.append(f"We've been exploring: {top['name']}.")

            breakthroughs = kg.get_nodes_by_type("breakthrough")
            if breakthroughs:
                latest = breakthroughs[0]
                parts.append(f"Last breakthrough: {latest['name']}.")

        # Mood trajectory
        velocity = self.get_mood_velocity(user_id)
        if velocity.get("trend") == "improving":
            parts.append("Things have been getting a little easier.")
        elif velocity.get("trend") == "declining":
            parts.append("It's been a tough stretch. Let's take it easy today.")

        if not parts:
            return f"Welcome back. {protagonist}'s adventure continues."

        parts.append("Ready to continue?")
        return " ".join(parts)

    def close(self):
        if self._conn:
            self._conn.close()
            self._conn = None
