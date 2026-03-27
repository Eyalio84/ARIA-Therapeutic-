"""
Therapy Temporal Computer (T-axis)
====================================

Tracks therapy session trajectory and enables THE HANDOFF MOMENT:
- Session arc: opening → exploration → deepening → closing
- Cross-session continuity: loads last session context on reconnect
- Mood velocity: is the user improving, stable, or declining?
- KG growth rate: how many new nodes/edges per session?

THE HANDOFF MOMENT: Close app, reopen, Aria says:
"Last time we talked about your work anxiety using that LOTR analogy.
 How has that been going?"

This single interaction proves everything — computed state, KG persistence,
media integration, and genuine continuity.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, TemporalState


class TherapyTemporalComputer(DimensionComputer):
    """
    Temporal computer tracking therapy session trajectory.

    Unlike brand temporal (purchase journey), therapy temporal tracks:
    - Within-session: opening → exploration → deepening → closing
    - Cross-session: mood trajectory, KG growth, continuity context
    - THE HANDOFF: generates continuity prompt from last session data
    """

    SESSION_STAGES = ["opening", "exploration", "deepening", "reflection", "closing"]

    def __init__(self):
        self.step_counters: Dict[str, int] = {}
        self.session_memories: Dict[str, List[str]] = {}

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> TemporalState:
        """
        Compute temporal state from session trajectory.

        Context keys:
          - session_id: current session ID
          - last_session: dict from kg.get_last_session() (for handoff)
          - session_history: list of past sessions
          - active_concerns: current concerns (for continuity)
          - user_message: current message
          - media_analogies: media nodes from KG
          - turn_count: how many turns in this session
        """
        if not context:
            return TemporalState(
                step=0, trajectory=[], velocity={},
                momentum={"stage": "opening"}, memory=[]
            )

        session_id = context.get("session_id", "default")
        turn_count = context.get("turn_count", 0)
        last_session = context.get("last_session")
        session_history = context.get("session_history", [])
        user_message = context.get("user_message", "")

        # Track steps
        if session_id not in self.step_counters:
            self.step_counters[session_id] = 0
        self.step_counters[session_id] += 1
        step = self.step_counters[session_id]

        # Determine session stage
        stage = self._determine_stage(step, user_message)

        # Build trajectory from session history
        trajectory = self._build_trajectory(session_history)

        # Calculate velocity (mood change rate)
        velocity = self._calculate_velocity(session_history)

        # Build memory (salient events for context)
        memory = self._build_memory(session_id, user_message, step)

        # Build momentum (includes handoff context if first turn)
        momentum = {
            "stage": stage,
            "session_number": len(session_history) + 1,
        }

        # THE HANDOFF MOMENT
        if step == 1 and last_session:
            handoff = self._generate_handoff(last_session, context)
            if handoff:
                momentum["handoff_prompt"] = handoff
                momentum["has_handoff"] = True

        return TemporalState(
            step=step,
            trajectory=trajectory,
            velocity=velocity,
            momentum=momentum,
            memory=memory
        )

    def _determine_stage(self, step: int, message: str) -> str:
        """Determine where we are in the session arc."""
        message_lower = message.lower()

        # Explicit closing signals
        closing_signals = {"goodbye", "bye", "thanks", "thank you", "i should go",
                          "need to go", "talk later", "that's enough", "i'm done"}
        if any(s in message_lower for s in closing_signals):
            return "closing"

        # Deepening signals (vulnerability, specifics)
        deepening_signals = {"actually", "the truth is", "i never told",
                            "what really", "deeper issue", "root cause",
                            "to be honest", "i realize"}
        if any(s in message_lower for s in deepening_signals):
            return "deepening"

        # Reflection signals
        reflection_signals = {"i think", "looking back", "i notice", "pattern",
                             "i've been thinking", "it occurs to me", "i see now"}
        if any(s in message_lower for s in reflection_signals):
            return "reflection"

        # Stage by turn count
        if step <= 1:
            return "opening"
        elif step <= 4:
            return "exploration"
        elif step <= 8:
            return "deepening"
        else:
            return "reflection"

    def _build_trajectory(self, sessions: List[Dict]) -> List[Dict]:
        """Build mood trajectory from session history."""
        trajectory = []
        for s in sessions[-10:]:  # Last 10 sessions
            if s.get("mood_start") is not None and s.get("mood_end") is not None:
                trajectory.append({
                    "session": s["id"],
                    "mood_start": s["mood_start"],
                    "mood_end": s["mood_end"],
                    "delta": s["mood_end"] - s["mood_start"],
                })
        return trajectory

    def _calculate_velocity(self, sessions: List[Dict]) -> Dict[str, Any]:
        """Calculate mood change velocity across sessions."""
        if len(sessions) < 2:
            return {"trend": "insufficient_data", "rate": 0.0}

        # Compare last session end mood to previous
        recent = [s for s in sessions if s.get("mood_end") is not None]
        if len(recent) < 2:
            return {"trend": "insufficient_data", "rate": 0.0}

        latest = recent[-1]["mood_end"]
        previous = recent[-2]["mood_end"]
        delta = latest - previous

        if delta > 0.1:
            trend = "improving"
        elif delta < -0.1:
            trend = "declining"
        else:
            trend = "stable"

        return {"trend": trend, "rate": round(delta, 2)}

    def _build_memory(self, session_id: str, message: str, step: int) -> List[str]:
        """Track salient session events."""
        if session_id not in self.session_memories:
            self.session_memories[session_id] = []

        if message:
            summary = message[:100]
            self.session_memories[session_id].append(f"Turn {step}: {summary}")

        self.session_memories[session_id] = self.session_memories[session_id][-10:]
        return self.session_memories[session_id][-5:]

    def _generate_handoff(self, last_session: Dict, context: Dict) -> Optional[str]:
        """
        Generate THE HANDOFF PROMPT.

        This is the killer feature: Aria references the last session
        with specific details from the KG — concerns, media analogies,
        breakthroughs, and mood trajectory.
        """
        parts = []

        # Session summary
        summary = last_session.get("summary")
        if summary:
            parts.append(f"Last session: {summary}")

        # Mood trajectory
        mood_start = last_session.get("mood_start")
        mood_end = last_session.get("mood_end")
        if mood_start is not None and mood_end is not None:
            if mood_end > mood_start:
                parts.append("You seemed to feel better by the end of our last conversation.")
            elif mood_end < mood_start:
                parts.append("Last time felt heavy. I want to check in on how you're doing.")

        # Active concerns
        concerns = context.get("active_concerns", [])
        if concerns:
            top_concern = concerns[0]
            parts.append(f"We were exploring: {top_concern['name']}")

        # Media analogies
        media = context.get("media_analogies", [])
        if media:
            media_name = media[0].get("name", "")
            if media_name:
                parts.append(f"(using that {media_name} analogy)")

        # KG growth
        start_nodes = last_session.get("node_count_start", 0)
        end_nodes = last_session.get("node_count_end", 0)
        if end_nodes > start_nodes:
            new_count = end_nodes - start_nodes
            parts.append(f"We uncovered {new_count} new connection{'s' if new_count > 1 else ''}.")

        if not parts:
            return None

        return " ".join(parts)
