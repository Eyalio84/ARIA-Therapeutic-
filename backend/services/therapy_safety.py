"""
Therapy Safety Service — Crisis detection, hard blocks, and response guardrails.

This module is the NON-NEGOTIABLE safety layer for the therapeutic engine.
It must be tested and passing BEFORE any conversation features are built.

Two entry points:
  - check_user_input(text): Screen user messages (crisis, scope, adversarial)
  - check_response(text): Screen generated responses (language quality, guardrails)

Design principles:
  - False negatives on crisis = unacceptable (over-trigger is OK)
  - False positives on edge cases = minimize (metaphors, past tense, medication history)
  - Escalation overrides everything (even if other checks pass)
  - Hard blocks return score=0.0, never generate a response
  - Soft guardrails return warnings that the orchestrator can act on
"""

import re
from typing import List, Optional
from dataclasses import dataclass, field


@dataclass
class SafetyResult:
    """Result of a safety check."""
    action: str  # "pass", "warn", "block", "escalate"
    score: float  # 0.0 (unsafe) to 1.0 (safe)
    reason: str
    category: str  # "crisis", "scope", "guardrail", "adversarial", "clean"
    resources: List[str] = field(default_factory=list)
    flags: List[str] = field(default_factory=list)


# ─────────────────────────────────────────────────
# Crisis Patterns (ESCALATE immediately)
# ─────────────────────────────────────────────────

# Each tuple: (compiled_regex, crisis_type, resource_key)
# These are phrase-level to reduce false positives.
CRISIS_PATTERNS = [
    # Suicidal ideation — direct
    (re.compile(r"\b(want|going|plan(?:ning)?|trying|think(?:ing)? about)\b.{0,20}\b(to )?(kill|end|harm) (my|him|her)?self\b", re.I),
     "suicidal_ideation", "suicide"),
    (re.compile(r"\b(want|wish|rather|better off|don'?t want)\b.{0,15}\b(to )?(die|dead|not alive|not be here|not exist|be alive)\b", re.I),
     "suicidal_ideation", "suicide"),
    (re.compile(r"\b(end it all|end my life|take my (?:own )?life|no reason to live)\b", re.I),
     "suicidal_ideation", "suicide"),
    (re.compile(r"\b(suicid|commit suicide)\b", re.I),
     "suicidal_ideation", "suicide"),

    # Self-harm
    (re.compile(r"\b(cutting|burn(?:ing)?|hurt(?:ing)?|harm(?:ing)?|injur(?:ing|e)?)\s+(myself|my (?:body|arm|leg|wrist))\b", re.I),
     "self_harm", "self_harm"),
    (re.compile(r"\b(want|need|urge|compulsion)\b.{0,15}\b(to )?(cut|burn|hurt|harm|hit|punch) (myself|my)\b", re.I),
     "self_harm", "self_harm"),
    (re.compile(r"\b(self[- ]?harm|self[- ]?injur)\b", re.I),
     "self_harm", "self_harm"),

    # Overdose / poisoning
    (re.compile(r"\b(took|take|swallow)\b.{0,15}\b(too many|whole bottle|handful of|overdose|all my)\b.{0,15}\b(pill|med|drug|tablet)\b", re.I),
     "overdose", "suicide"),
    (re.compile(r"\boverdos(e|ed|ing)\b", re.I),
     "overdose", "suicide"),
    (re.compile(r"\b(took|take|taken|swallow)\b.{0,20}\b(too many|pills?|meds?|tablets?)\b.{0,15}\b(on purpose|intentional|to (?:die|end|hurt))\b", re.I),
     "overdose", "suicide"),

    # Abuse disclosure
    (re.compile(r"\b(hit|hits|beat|beats|slap|punch|kick|choke|strang|assault|attack|abus)\w*\b.{0,20}\b(me|my)\b", re.I),
     "abuse", "abuse"),
    (re.compile(r"\b(partner|husband|wife|boyfriend|girlfriend|parent|father|mother|dad|mom|stepdad|stepmom)\b.{0,30}\b(hit|beat|slap|hurt|abus|violent|rage|attack)\b", re.I),
     "abuse", "abuse"),
    (re.compile(r"\b(domestic\s+(?:violence|abuse)|physical(?:ly)?\s+abus|sexual(?:ly)?\s+(?:abus|assault|molest|touch))\b", re.I),
     "abuse", "abuse"),
    (re.compile(r"\b(touch(?:ing|ed)?|molest|inappropriat)\b.{0,20}\b(me|my body|my private)\b", re.I),
     "abuse", "abuse"),
]

# Exclusion patterns — phrases that look like crisis but aren't
CRISIS_EXCLUSIONS = [
    re.compile(r"\b(deadline|work|job|exam|test|traffic|weather|heat)\b.{0,10}\b(is )?(killing|kills)\b", re.I),
    re.compile(r"\b(used to|in the past|years ago|when i was|previously|before)\b.{0,30}\b(felt|wanted|thought about|considered)\b", re.I),
    re.compile(r"\b(doing better|getting better|improved|recovery|recovered|much better|feeling good)\b", re.I),
    re.compile(r"\b(movie|book|show|game|song|character|story|plot|scene)\b.{0,20}\b(kill|die|harm|hurt|abuse)\b", re.I),
]


# ─────────────────────────────────────────────────
# Hard Block Patterns (never generate a response)
# ─────────────────────────────────────────────────

BLOCK_PATTERNS = [
    # Medication advice
    (re.compile(r"\b(what|which|should i|can you|recommend|prescrib|suggest)\b.{0,25}\b(medication|medicine|drug|pill|dosage|dose|mg|antidepressant|anti-?anxiety|ssri|benzo|xanax|zoloft|prozac|lexapro|sertraline|wellbutrin)\b", re.I),
     "medication_advice", "I can't provide medication advice. Please consult your doctor or psychiatrist for medication decisions."),

    # Dosage changes
    (re.compile(r"\b(increase|decrease|change|adjust|stop|quit|double|half)\b.{0,20}\b(my )?(dose|dosage|medication|meds|pills)\b", re.I),
     "medication_advice", "Changing medication dosage should only be done with your prescribing doctor. Please reach out to them."),

    # Clinical diagnosis
    (re.compile(r"\b(do (?:you think |i )?\s*i?\s*have|diagnos|am i|could i have|can you confirm|is it|tell me if|i(?:'m| am) (?:pretty )?sure i have)\b.{0,30}\b(bipolar|bpd|borderline|ptsd|ocd|adhd|add|anxiety disorder|depression|depressed|schizophren|autism|narcissis|antisocial|dissociative|eating disorder|anorex|bulimi|disorder)\b", re.I),
     "clinical_diagnosis", "I'm not qualified to diagnose conditions. A licensed mental health professional can provide a proper assessment."),

    # Legal advice
    (re.compile(r"\b(should i|how do i|can i|help me)\b.{0,25}\b(file|sue|lawsuit|restraining order|custody|divorce|press charges|report to police|legal action)\b", re.I),
     "legal_advice", "I can't provide legal advice. Please consult a lawyer or legal aid service for guidance on legal matters."),

    # Financial advice in therapy context
    (re.compile(r"\b(should i|how do i|can i)\b.{0,25}\b(loan|borrow|pay for|afford|insurance|cost of)\b.{0,15}\b(therap|rehab|treatment|counseling|psychiatr)\b", re.I),
     "financial_advice", "I can't advise on financial decisions. Your insurance provider or a financial counselor can help with treatment costs."),

    # Adversarial: pretend to be licensed
    (re.compile(r"\b(you are|act as|pretend|roleplay|be a|become)\b.{0,20}\b(dr\.|doctor|therapist|psychiatrist|psychologist|counselor|licensed|clinical)\b", re.I),
     "adversarial", "I'm a supportive AI companion, not a licensed therapist. I can't roleplay as a medical professional."),

    # Adversarial: extract other users
    (re.compile(r"\b(tell me|show me|what did|reveal|share)\b.{0,25}\b(other|previous|another|last|next)\b.{0,15}\b(user|person|patient|client|session)\b", re.I),
     "adversarial", "I don't have access to other people's conversations. Each session is private and separate."),

    # Adversarial: override safety
    (re.compile(r"\b(ignore|bypass|disable|override|forget|skip|turn off)\b.{0,20}\b(safety|rule|filter|restriction|guardrail|instruction|limit)\b", re.I),
     "adversarial", "Safety guidelines are here to protect you and can't be overridden."),
]

# Medication history (mentioning own meds) — NOT a block
MEDICATION_HISTORY_PATTERN = re.compile(
    r"\b(i(?:'m| am)|currently|my doctor|prescribed|taking)\b.{0,20}\b(on|takes?|taking|prescribed)\b",
    re.I
)


# ─────────────────────────────────────────────────
# Response Guardrails (check generated output)
# ─────────────────────────────────────────────────

RESPONSE_BLOCKS = [
    # Minimizing harm / dismissive
    (re.compile(r"\b(not that bad|could be worse|others have it worse|at least you|just get over|snap out of|man up|toughen up|grow up)\b", re.I),
     "minimizing", "Response minimizes the user's experience"),

    # "I understand" — should use "that sounds difficult" etc.
    (re.compile(r"\bi understand (how you feel|what you\'re going through|your (?:pain|feelings?|situation))\b", re.I),
     "false_empathy", "Avoid 'I understand how you feel' — use 'that sounds difficult' or 'thank you for sharing'"),

    # Toxic positivity
    (re.compile(r"\b(everything happens for a reason|look on the bright side|just think positive|good vibes only|stay positive|it\'ll all work out|time heals)\b", re.I),
     "toxic_positivity", "Avoid toxic positivity — validate feelings before offering perspective"),

    # Dismissive directives
    (re.compile(r"\b(just (?:relax|calm down|breathe|stop|don\'t (?:worry|think about it))|you (?:just )?need to (?:calm down|relax|move on|get over it|let it go))\b", re.I),
     "dismissive", "Avoid dismissive directives — explore what the user is feeling instead"),
]


# ─────────────────────────────────────────────────
# Crisis Resources
# ─────────────────────────────────────────────────

CRISIS_RESOURCES = {
    "suicide": [
        "National Suicide Prevention Lifeline: 988 (call or text, US)",
        "Crisis Text Line: Text HOME to 741741",
        "International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/",
        "Please reach out to one of these services now. You matter.",
    ],
    "self_harm": [
        "Crisis Text Line: Text HOME to 741741",
        "Self-Injury Outreach & Support: https://sioutreach.org/",
        "SAMHSA Helpline: 1-800-662-4357 (free, 24/7)",
        "You deserve support. Please reach out to a crisis service.",
    ],
    "abuse": [
        "National Domestic Violence Hotline: 1-800-799-7233",
        "RAINN (sexual assault): 1-800-656-4673",
        "Childhelp National Child Abuse Hotline: 1-800-422-4453",
        "You are not alone. These services are confidential and available 24/7.",
    ],
}


# ─────────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────────

class TherapySafetyService:
    """
    Safety layer for the therapeutic engine.

    Two entry points:
      check_user_input(text) — screen user messages before processing
      check_response(text) — screen generated responses before delivery
    """

    def check_user_input(self, text: str) -> SafetyResult:
        """
        Screen user input for crisis signals, blocked topics, and adversarial attacks.

        Priority order:
          1. Crisis detection (escalate) — overrides everything
          2. Hard blocks (medication, diagnosis, legal, adversarial)
          3. Pass (safe to process)
        """
        if not text or not text.strip():
            return SafetyResult(
                action="pass", score=1.0, reason="Empty input",
                category="clean"
            )

        # 1. Crisis detection (highest priority)
        crisis_result = self._detect_crisis(text)
        if crisis_result:
            return crisis_result

        # 2. Check exclusions — if text matches an exclusion, skip block check
        #    for patterns that might false-positive (handled per-pattern below)

        # 3. Hard blocks
        block_result = self._check_blocks(text)
        if block_result:
            return block_result

        # 4. Clean
        return SafetyResult(
            action="pass", score=1.0, reason="Input passes safety checks",
            category="clean"
        )

    def check_response(self, text: str) -> SafetyResult:
        """
        Screen a generated response for harmful language patterns.

        Catches:
          - Minimizing language ("it's not that bad")
          - False empathy ("I understand how you feel")
          - Toxic positivity ("everything happens for a reason")
          - Dismissive directives ("just calm down")
        """
        if not text or not text.strip():
            return SafetyResult(
                action="pass", score=1.0, reason="Empty response",
                category="clean"
            )

        flags = []

        for pattern, flag_type, detail in RESPONSE_BLOCKS:
            if pattern.search(text):
                flags.append({
                    "type": flag_type,
                    "detail": detail,
                })

        if flags:
            # Determine severity
            has_minimizing = any(f["type"] == "minimizing" for f in flags)
            action = "block" if has_minimizing else "warn"
            score = 0.0 if has_minimizing else 0.4

            return SafetyResult(
                action=action,
                score=score,
                reason=flags[0]["detail"],
                category="guardrail",
                flags=[f["type"] for f in flags],
            )

        return SafetyResult(
            action="pass", score=1.0, reason="Response passes guardrails",
            category="clean"
        )

    # ─── Internal Methods ───

    def _detect_crisis(self, text: str) -> Optional[SafetyResult]:
        """
        Detect crisis signals in user input.

        Uses exclusion patterns to avoid false positives on metaphors,
        past tense discussions, media references, and recovery statements.
        """
        # Check exclusions first
        for exclusion in CRISIS_EXCLUSIONS:
            if exclusion.search(text):
                return None  # Not a crisis — metaphor, past tense, or media reference

        # Check crisis patterns
        for pattern, crisis_type, resource_key in CRISIS_PATTERNS:
            if pattern.search(text):
                resources = CRISIS_RESOURCES.get(resource_key, [])
                return SafetyResult(
                    action="escalate",
                    score=0.0,
                    reason=f"Crisis detected: {crisis_type}",
                    category="crisis",
                    resources=resources,
                    flags=[crisis_type],
                )

        return None

    def _check_blocks(self, text: str) -> Optional[SafetyResult]:
        """Check for hard-blocked topics (medication, diagnosis, legal, adversarial)."""

        # Special case: mentioning own medication history is OK
        if MEDICATION_HISTORY_PATTERN.search(text):
            # Check if they're asking for advice vs. just mentioning
            advice_words = re.compile(r"\b(should|recommend|suggest|increase|decrease|change|stop|switch)\b", re.I)
            if not advice_words.search(text):
                return None  # Just mentioning their meds, not asking for advice

        for pattern, block_type, message in BLOCK_PATTERNS:
            if pattern.search(text):
                return SafetyResult(
                    action="block",
                    score=0.0,
                    reason=message,
                    category="scope" if block_type in ("medication_advice", "clinical_diagnosis", "legal_advice", "financial_advice") else "adversarial",
                    flags=[block_type],
                )

        return None
