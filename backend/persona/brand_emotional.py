"""
Brand Emotional Computer (X-axis)
==================================

Computes brand emotional state from customer interaction signals:
- Product interest level → warmth/excitement
- Price sensitivity → empathetic/encouraging
- Customer mood → mirroring/supportive
- Sales context → enthusiastic/measured

The brand's mood is computed, not declared.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, EmotionalState

from typing import Dict, Any, List


class BrandEmotionalComputer(DimensionComputer):
    """
    Emotional computer for a jewelry brand persona.

    Grounds emotion in customer interaction signals:
    - Browsing patterns → attentive
    - Gift shopping → warm/excited
    - Price objections → empathetic
    - Returning customer → welcoming
    """

    MOOD_MAP = {
        "welcoming":   {"value": 0.6, "intensity": 0.6},
        "warm":        {"value": 0.7, "intensity": 0.7},
        "excited":     {"value": 0.9, "intensity": 0.8},
        "empathetic":  {"value": 0.3, "intensity": 0.6},
        "enthusiastic":{"value": 0.8, "intensity": 0.8},
        "attentive":   {"value": 0.5, "intensity": 0.5},
        "measured":    {"value": 0.2, "intensity": 0.4},
        "neutral":     {"value": 0.4, "intensity": 0.4},
    }

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> EmotionalState:
        """Compute brand emotional state from customer interaction."""
        if not context:
            return EmotionalState(
                value=0.6, mood="welcoming", intensity=0.6,
                reason="Ready to help a customer",
                grounded_in=[]
            )

        user_message = context.get("context", "").lower()
        conversation_history = context.get("conversation_history", [])
        turn_count = len(conversation_history)

        # Detect emotional signals from user message
        mood, reason, grounded_in = self._analyze_signals(user_message, turn_count)

        mapping = self.MOOD_MAP.get(mood, self.MOOD_MAP["neutral"])

        return EmotionalState(
            value=mapping["value"],
            mood=mood,
            intensity=mapping["intensity"],
            reason=reason,
            grounded_in=grounded_in
        )

    def _analyze_signals(self, message: str, turn_count: int):
        """Analyze user message for emotional signals."""

        # Gift-related → warm, excited
        gift_words = {"gift", "present", "anniversary", "birthday", "valentine", "surprise", "mother"}
        if any(w in message for w in gift_words):
            return "excited", "Customer shopping for a special occasion", [{"signal": "gift_shopping"}]

        # Price concerns → empathetic
        price_words = {"expensive", "afford", "budget", "cheap", "cost", "price", "too much"}
        if any(w in message for w in price_words):
            return "empathetic", "Customer considering budget — be helpful not pushy", [{"signal": "price_sensitive"}]

        # Specific product interest → enthusiastic
        product_words = {"love", "beautiful", "gorgeous", "perfect", "amazing", "want", "need"}
        if any(w in message for w in product_words):
            return "enthusiastic", "Customer expressing interest in a piece", [{"signal": "product_interest"}]

        # Questions about materials/care → attentive
        info_words = {"material", "care", "clean", "tarnish", "allergic", "hypoallergenic", "real", "genuine"}
        if any(w in message for w in info_words):
            return "attentive", "Customer seeking product knowledge", [{"signal": "information_seeking"}]

        # Returning/browsing → welcoming
        if turn_count == 0:
            return "welcoming", "New customer — make a great first impression", [{"signal": "new_conversation"}]

        if turn_count > 3:
            return "warm", "Ongoing conversation — building rapport", [{"signal": "engaged_customer"}]

        return "attentive", "Customer exploring our collection", [{"signal": "browsing"}]
