"""
Therapy Emotional Computer (X-axis)
====================================

Computes empathy level from the user's therapy KG:
- Active concern intensity → deeper empathy for distressed users
- Session mood trajectory → match where the user IS, not where we want them
- Crisis proximity → maximum gentleness near crisis signals
- Breakthrough proximity → celebrate without pushing

The emotional state is computed from ground truth (KG data),
not declared in a system prompt. You can't gaslight a computation.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, EmotionalState


class TherapyEmotionalComputer(DimensionComputer):
    """
    Emotional computer grounded in user's therapy KG.

    Instead of detecting purchase signals (brand), we read the user's
    concern intensities, mood trajectory, and session history to compute
    how empathetic / gentle / celebratory Aria should be.
    """

    # Mood mapping: mood_name → (value, intensity)
    # Lower value = more careful/gentle, higher = more warm/encouraging
    MOOD_MAP = {
        "crisis_gentle":    {"value": 0.1, "intensity": 0.9},  # Maximum care
        "deeply_empathetic": {"value": 0.2, "intensity": 0.8},
        "validating":       {"value": 0.3, "intensity": 0.7},
        "present":          {"value": 0.4, "intensity": 0.6},  # Just being there
        "warm":             {"value": 0.5, "intensity": 0.6},
        "encouraging":      {"value": 0.6, "intensity": 0.6},
        "gently_curious":   {"value": 0.5, "intensity": 0.5},
        "celebrating":      {"value": 0.8, "intensity": 0.7},  # Breakthrough!
        "neutral_open":     {"value": 0.4, "intensity": 0.4},  # First session, no data
    }

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> EmotionalState:
        """
        Compute empathy level from user's KG state.

        Context keys:
          - active_concerns: list of concern dicts from KG (with intensity)
          - last_session: dict from kg.get_last_session()
          - user_message: current user input
          - has_crisis_flag: bool from safety check
          - recent_breakthrough: bool
        """
        if not context:
            return EmotionalState(
                value=0.4, mood="neutral_open", intensity=0.4,
                reason="No user context yet — be open and welcoming",
                grounded_in=[]
            )

        # Priority 1: Crisis proximity
        if context.get("has_crisis_flag"):
            return EmotionalState(
                value=0.1, mood="crisis_gentle", intensity=0.9,
                reason="Crisis signal detected — maximum gentleness",
                grounded_in=[{"signal": "crisis_flag"}]
            )

        # Priority 2: Breakthrough celebration
        if context.get("recent_breakthrough"):
            return EmotionalState(
                value=0.8, mood="celebrating", intensity=0.7,
                reason="User had a breakthrough — acknowledge and celebrate",
                grounded_in=[{"signal": "breakthrough"}]
            )

        # Priority 3: Compute from concern intensities
        active_concerns = context.get("active_concerns", [])
        user_message = context.get("user_message", "").lower()
        last_session = context.get("last_session")

        mood, reason, grounded_in = self._compute_from_kg(
            active_concerns, user_message, last_session
        )

        mapping = self.MOOD_MAP.get(mood, self.MOOD_MAP["neutral_open"])

        return EmotionalState(
            value=mapping["value"],
            mood=mood,
            intensity=mapping["intensity"],
            reason=reason,
            grounded_in=grounded_in
        )

    def _compute_from_kg(
        self,
        concerns: List[Dict],
        message: str,
        last_session: Optional[Dict]
    ):
        """Compute mood from KG concern intensities and session trajectory."""

        if not concerns:
            # First session or no concerns yet
            if self._sounds_distressed(message):
                return "validating", "User sounds distressed — validate first", [{"signal": "distress_in_message"}]
            return "gently_curious", "No concerns in KG yet — explore gently", [{"signal": "new_user"}]

        # Average concern intensity
        avg_intensity = sum(c.get("intensity", 0.5) for c in concerns) / len(concerns)
        max_intensity = max(c.get("intensity", 0.5) for c in concerns)

        # Check mood trajectory from last session
        improving = False
        if last_session and last_session.get("mood_start") and last_session.get("mood_end"):
            improving = last_session["mood_end"] > last_session["mood_start"]

        # High distress
        if max_intensity >= 0.8:
            return (
                "deeply_empathetic",
                f"High concern intensity ({max_intensity:.1f}) — deep empathy needed",
                [{"signal": "high_intensity", "value": max_intensity}]
            )

        # Moderate distress
        if avg_intensity >= 0.5:
            if improving:
                return (
                    "encouraging",
                    f"Moderate concerns (avg {avg_intensity:.1f}) but improving trajectory",
                    [{"signal": "moderate_improving"}]
                )
            return (
                "validating",
                f"Moderate concerns (avg {avg_intensity:.1f}) — validate feelings",
                [{"signal": "moderate_stable"}]
            )

        # Low distress — things are going well
        if improving:
            return (
                "warm",
                f"Low concern intensity (avg {avg_intensity:.1f}), improving — warm presence",
                [{"signal": "low_improving"}]
            )

        return (
            "present",
            f"Low concern intensity (avg {avg_intensity:.1f}) — be present",
            [{"signal": "low_stable"}]
        )

    def _sounds_distressed(self, message: str) -> bool:
        """Quick check if the user message sounds distressed (no KG needed)."""
        distress_signals = {
            "anxious", "scared", "afraid", "panic", "overwhelm",
            "can't cope", "falling apart", "breaking down", "help me",
            "don't know what to do", "so tired", "exhausted",
            "hopeless", "worthless", "alone", "nobody cares",
        }
        return any(signal in message for signal in distress_signals)
