"""
Brand Temporal Computer (T-axis)
==================================

Tracks conversation trajectory and customer journey stage:
- New visitor → greeting, discovery
- Browsing → exploration, suggestions
- Interested → detailed info, comparisons
- Deciding → reassurance, social proof
- Returning → loyalty, personalization
"""

import sys
from pathlib import Path
from typing import Dict, Any, List

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, TemporalState


class BrandTemporalComputer(DimensionComputer):
    """
    Temporal computer tracking customer journey stage.

    The conversation evolves through stages:
    greeting → discovery → exploration → consideration → decision
    """

    JOURNEY_STAGES = ["greeting", "discovery", "exploration", "consideration", "decision"]

    def __init__(self):
        self.step_counters: Dict[str, int] = {}
        self.memory_stores: Dict[str, List[str]] = {}
        self.journey_stages: Dict[str, str] = {}

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> TemporalState:
        """Compute temporal state tracking customer journey."""
        if not context:
            context = {}
        if not entity_id:
            entity_id = "default"

        # Increment step
        if entity_id not in self.step_counters:
            self.step_counters[entity_id] = 0
        self.step_counters[entity_id] += 1
        step = self.step_counters[entity_id]

        # Determine journey stage
        stage = self._determine_stage(entity_id, context, step)
        self.journey_stages[entity_id] = stage

        # Update memory
        memory = self._update_memory(entity_id, context)

        return TemporalState(
            step=step,
            trajectory=[],
            velocity={"stage": self.JOURNEY_STAGES.index(stage) / 4.0},
            momentum={"direction": "forward", "stage": stage},
            memory=memory
        )

    def _determine_stage(self, entity_id: str, context: Dict[str, Any], step: int) -> str:
        """Determine customer journey stage from conversation."""
        user_message = context.get("context", "").lower()

        # Decision signals
        decision_words = {"buy", "purchase", "cart", "checkout", "order", "take", "get this"}
        if any(w in user_message for w in decision_words):
            return "decision"

        # Consideration signals
        consider_words = {"compare", "which", "better", "difference", "vs", "choose", "thinking"}
        if any(w in user_message for w in consider_words):
            return "consideration"

        # Exploration signals (specific product/material questions)
        explore_words = {"tell me about", "show me", "what about", "how about", "describe"}
        if any(w in user_message for w in explore_words):
            return "exploration"

        # Stage by turn count
        if step <= 1:
            return "greeting"
        elif step <= 3:
            return "discovery"
        else:
            return "exploration"

    def _update_memory(self, entity_id: str, context: Dict[str, Any]) -> List[str]:
        """Track salient conversation events."""
        if entity_id not in self.memory_stores:
            self.memory_stores[entity_id] = []

        user_message = context.get("context", "")
        if user_message:
            # Track product mentions, preferences, etc.
            summary = user_message[:80]
            self.memory_stores[entity_id].append(f"Turn {self.step_counters[entity_id]}: {summary}")

        # Keep last 10
        self.memory_stores[entity_id] = self.memory_stores[entity_id][-10:]
        return self.memory_stores[entity_id][-5:]
