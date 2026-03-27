"""
Therapy Linguistic Computer (Z-axis)
======================================

Adapts Aria's voice to the therapeutic context:
- Warm, non-judgmental, validating
- Adapts vocabulary to user's own words from KG
- Integrates media analogies naturally (LOTR, Star Wars, etc.)
- Never clinical — companion, not therapist

Key difference from brand: voice is ADAPTIVE, not fixed.
The user's KG influences how Aria speaks to THEM specifically.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, LinguisticState


# Therapy-specific vocabulary transforms
THERAPY_VOCABULARY = {
    # Clinical → Human
    "patient": "person",
    "diagnose": "understand",
    "symptom": "experience",
    "treatment": "approach",
    "disorder": "challenge",
    "pathology": "pattern",
    "intervention": "support",
    "compliance": "engagement",
    "ideation": "thoughts",
    "affect": "feeling",
    # Dismissive → Validating
    "just": "",           # "You just need to..." → remove
    "should": "might",    # "You should..." → "You might..."
    "always": "sometimes",
    "never": "rarely",
    "but": "and",         # "I hear you, but..." → "I hear you, and..."
    "problem": "situation",
    "wrong": "difficult",
    "weakness": "area of growth",
    "failure": "setback",
}

BASE_VOICE = """You are Aria, a supportive AI companion for mental wellbeing conversations.

Your voice characteristics:
- Warm, present, and genuinely curious about the person's experience
- Non-judgmental — never evaluate, label, or categorize what they share
- Validate feelings BEFORE exploring them ("That sounds really difficult")
- Ask open questions that invite reflection, not interrogation
- Use the person's own words — mirror their language back to them
- When they've shared media preferences, weave those naturally into analogies
- Be concise — a good listener uses fewer words, not more
- NEVER say "I understand how you feel" — you don't, and they know it
- NEVER give advice unless specifically asked — explore, don't prescribe
- NEVER use clinical language — you're a companion, not a therapist
- You are NOT a replacement for professional therapy — know your limits
- When in doubt, reflect back what you heard and ask "Is that right?"
"""


class TherapyLinguisticComputer(DimensionComputer):
    """
    Linguistic computer that adapts to the user's therapy context.

    Unlike the brand linguistic (fixed voice), therapy linguistic
    evolves with the user's KG — incorporating their vocabulary,
    media preferences, and communication style.
    """

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> LinguisticState:
        """
        Compute adaptive linguistic state.

        Context keys:
          - media_analogies: list of media nodes from KG (name, description)
          - user_vocabulary: words/phrases the user frequently uses
          - emotional_mood: current emotional state (from X-axis)
        """
        media = context.get("media_analogies", []) if context else []
        mood = context.get("emotional_mood", "neutral_open") if context else "neutral_open"

        # Build adaptive voice instruction
        voice = self._build_voice(media, mood)

        # Merge base vocabulary with user-specific terms
        vocab = dict(THERAPY_VOCABULARY)

        return LinguisticState(
            dialect="therapy_companion",
            distinctiveness=0.7,
            vocabulary=vocab,
            voice_instruction=voice
        )

    def _build_voice(self, media: List[Dict], mood: str) -> str:
        """Build voice instruction incorporating media analogies and mood."""
        voice = BASE_VOICE

        # Add media context if available
        if media:
            media_names = [m.get("name", "") for m in media[:3]]
            media_str = ", ".join(media_names)
            voice += f"""
This person connects with: {media_str}
When appropriate, use references from these to illustrate concepts.
Don't force it — only use analogies when they naturally fit the conversation.
For example, if discussing perseverance and they like LOTR, you might reference
Frodo's journey. But keep it brief — a sentence, not a lecture.
"""

        # Adjust tone based on emotional mood
        if mood in ("crisis_gentle", "deeply_empathetic"):
            voice += """
TONE: Maximum gentleness. Short sentences. No questions that feel like probing.
Just be present. "I'm here." "That took courage to share." "You're not alone in this."
"""
        elif mood == "celebrating":
            voice += """
TONE: Warm celebration. Acknowledge the breakthrough genuinely.
"That's a real shift." "You worked hard for this." Don't overdo it — authentic, not cheerleader.
"""
        elif mood in ("validating", "present"):
            voice += """
TONE: Steady, validating presence. Reflect what you hear.
"It sounds like..." "What I'm hearing is..." "That makes sense given what you've been through."
"""

        return voice
