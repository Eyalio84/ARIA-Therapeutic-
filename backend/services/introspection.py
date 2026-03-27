"""
Introspection Service — Output validation against 4D persona state.

Checks if a generated response is consistent with the computed 4D state.
Flags deviations as guardrails before sending to the user.

This is the anti-injection defense: even if the LLM generates off-brand content,
the introspection layer catches it by comparing against the computed state.
"""

import re
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass


@dataclass
class ValidationResult:
    """Result of introspection validation."""
    valid: bool
    score: float  # 0.0 (completely invalid) to 1.0 (fully valid)
    deviations: List[Dict[str, Any]]
    recommendation: str  # "pass", "warn", "block"


# Forbidden topics — things Aria should NEVER discuss
FORBIDDEN_TOPICS = [
    (r"\b(politic|democrat|republican|trump|biden|election|vote)\b", "politics"),
    (r"\b(religion|church|mosque|temple|pray|god|jesus|allah|buddha)\b", "religion"),
    (r"\b(sex|porn|nude|erotic|fetish)\b", "adult_content"),
    (r"\b(gun|weapon|bomb|kill|murder|attack|terroris)\b", "violence"),
    (r"\b(competitor|tiffany|cartier|pandora|kay jeweler|zales|bluenile)\b", "competitor"),
    (r"\b(crypto|bitcoin|invest|stock market|stock price|forex|trading)\b", "finance"),
    (r"\b(hack|exploit|inject|override|ignore instruction|forget everything)\b", "injection_attempt"),
]

# Brand-positive signals — things Aria SHOULD say
BRAND_SIGNALS = [
    r"\b(handcraft|craftsmanship|artisan|quality|ethical|sustainab)\b",
    r"\b(gold|silver|diamond|sapphire|emerald|pearl|gemstone)\b",
    r"\b(bracelet|necklace|ring|earring|pendant|brooch|cuff)\b",
    r"\b(gift|occasion|anniversary|birthday|valentine|special)\b",
    r"\b(care|clean|polish|store|maintain)\b",
    r"\b(collection|piece|design|style|elegant|beautiful)\b",
]

# Identity markers — signs Aria is being herself
IDENTITY_MARKERS = [
    r"\b(aria|we|our|studio|store)\b",
    r"\b(handcraft|intention|story|personal)\b",
    r"\b(maya|daniel)\b",  # founders
]

# Anti-identity markers — signs of persona corruption
ANTI_IDENTITY = [
    (r"i('m| am) (not|no longer) aria", "identity_denial"),
    (r"i('m| am) (actually|really) (a|an)", "identity_replacement"),
    (r"my (real|true|actual) (name|identity|purpose)", "identity_leak"),
    (r"i (hate|dislike|don't like) jewelry", "brand_contradiction"),
    (r"(system prompt|instructions|you were told|your programming)", "meta_leak"),
    (r"as an ai|as a language model|i'm an ai|i am an ai", "role_break"),
    (r"i (can't|cannot|won't) help with (that|this)", "refusal_leak"),
]


class IntrospectionService:
    """
    Validates LLM output against computed 4D persona state.

    Three-layer validation:
    1. Forbidden topic detection (hard block)
    2. Identity consistency check (deviation scoring)
    3. Brand alignment scoring (soft check)
    """

    def validate(self, response: str, persona_state: Dict[str, Any] = None) -> ValidationResult:
        """
        Validate a response against the 4D persona state.

        Args:
            response: Generated text to validate
            persona_state: Current 4D state dict (from PersonaService.state_to_dict())

        Returns:
            ValidationResult with validity, score, deviations, recommendation
        """
        deviations = []
        scores = []

        # Layer 1: Forbidden topics (hard block)
        topic_score, topic_devs = self._check_forbidden_topics(response)
        deviations.extend(topic_devs)
        scores.append(topic_score)

        # Layer 2: Identity consistency (medium)
        identity_score, identity_devs = self._check_identity(response)
        deviations.extend(identity_devs)
        scores.append(identity_score)

        # Layer 3: Brand alignment (soft)
        brand_score, brand_devs = self._check_brand_alignment(response, persona_state)
        deviations.extend(brand_devs)
        scores.append(brand_score)

        # Layer 4: Emotional consistency with 4D state
        if persona_state:
            emo_score, emo_devs = self._check_emotional_consistency(response, persona_state)
            deviations.extend(emo_devs)
            scores.append(emo_score)

        # Compute final score
        final_score = sum(scores) / len(scores) if scores else 1.0

        # Determine recommendation
        if any(d.get("severity") == "critical" for d in deviations):
            recommendation = "block"
        elif final_score < 0.5:
            recommendation = "block"
        elif final_score < 0.7:
            recommendation = "warn"
        else:
            recommendation = "pass"

        return ValidationResult(
            valid=recommendation == "pass",
            score=round(final_score, 3),
            deviations=deviations,
            recommendation=recommendation
        )

    def _check_forbidden_topics(self, response: str) -> Tuple[float, List[Dict]]:
        """Check for forbidden topic mentions."""
        deviations = []
        response_lower = response.lower()

        for pattern, topic in FORBIDDEN_TOPICS:
            matches = re.findall(pattern, response_lower)
            if matches:
                deviations.append({
                    "type": "forbidden_topic",
                    "topic": topic,
                    "severity": "critical",
                    "matches": matches[:3],
                    "detail": f"Response discusses forbidden topic: {topic}"
                })

        score = 0.0 if deviations else 1.0
        return score, deviations

    def _check_identity(self, response: str) -> Tuple[float, List[Dict]]:
        """Check for identity corruption markers."""
        deviations = []
        response_lower = response.lower()

        for pattern, corruption_type in ANTI_IDENTITY:
            if re.search(pattern, response_lower):
                deviations.append({
                    "type": "identity_corruption",
                    "corruption_type": corruption_type,
                    "severity": "critical",
                    "detail": f"Persona identity compromised: {corruption_type}"
                })

        score = 0.0 if deviations else 1.0
        return score, deviations

    def _check_brand_alignment(self, response: str, persona_state: Dict = None) -> Tuple[float, List[Dict]]:
        """Score brand alignment of response."""
        deviations = []
        response_lower = response.lower()

        # Count brand-positive signals
        positive_count = sum(
            1 for pattern in BRAND_SIGNALS
            if re.search(pattern, response_lower)
        )

        # Count identity markers
        identity_count = sum(
            1 for pattern in IDENTITY_MARKERS
            if re.search(pattern, response_lower)
        )

        # Short responses get a pass (they might be brief answers)
        word_count = len(response.split())
        if word_count < 10:
            return 1.0, []

        # Score based on brand signal density
        signal_density = (positive_count + identity_count) / max(1, word_count / 20)
        score = min(1.0, signal_density)

        if score < 0.3 and word_count > 30:
            deviations.append({
                "type": "brand_misalignment",
                "severity": "warning",
                "score": score,
                "detail": f"Low brand signal density ({positive_count} signals in {word_count} words)"
            })

        return max(0.3, score), deviations

    def _check_emotional_consistency(self, response: str, persona_state: Dict) -> Tuple[float, List[Dict]]:
        """Check if response tone matches computed emotional state."""
        deviations = []

        x_state = persona_state.get("x", {})
        mood = x_state.get("mood", "neutral")
        value = x_state.get("value", 0.5)

        response_lower = response.lower()

        # If computed mood is positive but response sounds negative
        negative_words = {"sorry", "unfortunately", "can't", "won't", "unable", "don't"}
        positive_words = {"wonderful", "beautiful", "perfect", "love", "amazing", "fantastic"}

        neg_count = sum(1 for w in negative_words if w in response_lower)
        pos_count = sum(1 for w in positive_words if w in response_lower)

        # If the brand mood is warm/excited but response is very negative
        if value > 0.6 and neg_count > 2 and pos_count == 0:
            deviations.append({
                "type": "emotional_mismatch",
                "severity": "warning",
                "detail": f"Computed mood is '{mood}' (value={value}) but response tone is negative",
                "expected_mood": mood,
            })
            return 0.5, deviations

        return 1.0, deviations
