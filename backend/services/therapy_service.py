"""
Therapy Service — Orchestrator for the therapeutic engine.

Pipeline per user message:
  1. Safety check (check_user_input) → may escalate/block before LLM call
  2. Load/create user KG
  3. Compute 4D persona state from KG
  4. Build prompt context (persona state + KG context + media analogies)
  5. [Caller generates response via LLM]
  6. Safety check (check_response) → validate output before delivery
  7. Extract new nodes/edges from response, grow user KG

This service does NOT call the LLM itself — it prepares context and validates output.
The router or frontend handles the actual generation call.
"""

import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict

from services.therapy_safety import TherapySafetyService, SafetyResult
from data.build_therapy_kg import TherapyKG, create_user_kg, THERAPY_DATA_DIR
from persona.therapy_emotional import TherapyEmotionalComputer
from persona.therapy_relational import TherapyRelationalComputer
from persona.therapy_linguistic import TherapyLinguisticComputer
from persona.therapy_temporal import TherapyTemporalComputer


@dataclass
class TherapyContext:
    """Full context for generating a therapy response."""
    user_id: str
    session_id: str
    user_message: str
    safety_result: Dict[str, Any]
    persona_state: Dict[str, Any]
    voice_instruction: str
    active_concerns: List[Dict]
    media_analogies: List[Dict]
    coping_strategies: List[Dict]
    handoff_prompt: Optional[str] = None
    kg_stats: Dict[str, Any] = field(default_factory=dict)


class TherapyService:
    """
    Orchestrates the therapy pipeline:
    safety → KG → 4D persona → context → [LLM] → validate → KG growth
    """

    def __init__(self, data_dir: str = THERAPY_DATA_DIR):
        self.data_dir = data_dir
        self.safety = TherapySafetyService()
        self.emotional = TherapyEmotionalComputer()
        self.relational = TherapyRelationalComputer()
        self.linguistic = TherapyLinguisticComputer()
        self.temporal = TherapyTemporalComputer()

        # Per-user KG instances (cached)
        self._user_kgs: Dict[str, TherapyKG] = {}
        # Per-user active session
        self._user_sessions: Dict[str, str] = {}

    def _get_kg(self, user_id: str) -> TherapyKG:
        """Get or create a user's therapy KG."""
        if user_id not in self._user_kgs:
            self._user_kgs[user_id] = create_user_kg(user_id, self.data_dir)
        return self._user_kgs[user_id]

    # ── Session Management ──────────────────────────────────────────

    def start_session(self, user_id: str) -> Dict[str, Any]:
        """Start or resume a therapy session for a user."""
        kg = self._get_kg(user_id)
        session_id = kg.start_session()
        self._user_sessions[user_id] = session_id

        # Set up relational computer with this user's KG
        self.relational.set_kg(kg)

        # Check for handoff context
        last_session = kg.get_last_session()
        history = kg.get_session_history(limit=10)
        active_concerns = kg.get_active_concerns()

        # If there's a previous session, the first response should include handoff
        handoff_context = None
        if last_session and last_session["id"] != session_id:
            # Get media analogies for handoff
            media = []
            for c in active_concerns[:3]:
                media.extend(self.relational._get_media_analogies(c["id"]))

            temporal_state = self.temporal.compute({
                "session_id": session_id,
                "user_message": "",
                "turn_count": 0,
                "last_session": last_session,
                "session_history": history,
                "active_concerns": active_concerns,
                "media_analogies": media,
            })
            handoff_context = temporal_state.momentum.get("handoff_prompt")

        return {
            "session_id": session_id,
            "user_id": user_id,
            "handoff_prompt": handoff_context,
            "active_concerns": [_safe_dict(c) for c in active_concerns],
            "session_count": len(history),
            "kg_stats": kg.stats(),
        }

    def end_session(self, user_id: str, summary: str = None,
                    mood_start: float = None, mood_end: float = None) -> Dict[str, Any]:
        """End the current session for a user."""
        session_id = self._user_sessions.get(user_id)
        if not session_id:
            return {"error": "No active session"}

        kg = self._get_kg(user_id)
        kg.end_session(session_id, summary=summary,
                       mood_start=mood_start, mood_end=mood_end)
        del self._user_sessions[user_id]

        return {
            "session_id": session_id,
            "ended": True,
            "kg_stats": kg.stats(),
        }

    # ── Core Pipeline ───────────────────────────────────────────────

    def process_message(self, user_id: str, message: str,
                        turn_count: int = 0) -> TherapyContext:
        """
        Process a user message through the full therapy pipeline.

        Returns TherapyContext with everything needed for LLM generation.
        The caller uses this context to build a prompt and call the LLM.
        """
        kg = self._get_kg(user_id)
        session_id = self._user_sessions.get(user_id, "default")

        # 1. SAFETY CHECK (input)
        safety_result = self.safety.check_user_input(message)

        if safety_result.action in ("escalate", "block"):
            # Don't compute persona — return safety result immediately
            return TherapyContext(
                user_id=user_id,
                session_id=session_id,
                user_message=message,
                safety_result=asdict(safety_result),
                persona_state={},
                voice_instruction="",
                active_concerns=[],
                media_analogies=[],
                coping_strategies=[],
                kg_stats=kg.stats(),
            )

        # 2. LOAD KG CONTEXT
        active_concerns = kg.get_active_concerns()
        last_session = kg.get_last_session()
        session_history = kg.get_session_history()

        # 3. COMPUTE 4D PERSONA STATE

        # X: Emotional
        emotional_state = self.emotional.compute({
            "active_concerns": active_concerns,
            "last_session": last_session,
            "user_message": message,
            "has_crisis_flag": False,
            "recent_breakthrough": False,
        })

        # Y: Relational (traverses user's KG)
        self.relational.set_kg(kg)
        relational_state = self.relational.compute({
            "user_message": message,
            "active_concerns": active_concerns,
        })

        # Extract media and coping from relational context
        media_analogies = []
        coping_strategies = []
        if relational_state.activated and relational_state.context:
            media_analogies = relational_state.context.get("media_analogies", [])
            coping_strategies = relational_state.context.get("coping_strategies", [])

        # Z: Linguistic (adapts voice to user's media + mood)
        linguistic_state = self.linguistic.compute({
            "media_analogies": media_analogies,
            "emotional_mood": emotional_state.mood,
        })

        # T: Temporal (session arc + handoff)
        temporal_state = self.temporal.compute({
            "session_id": session_id,
            "user_message": message,
            "turn_count": turn_count,
            "last_session": last_session,
            "session_history": session_history,
            "active_concerns": active_concerns,
            "media_analogies": media_analogies,
        })

        # 4. BUILD CONTEXT
        persona_state = {
            "x": {
                "mood": emotional_state.mood,
                "value": emotional_state.value,
                "intensity": emotional_state.intensity,
                "reason": emotional_state.reason,
            },
            "y": {
                "activated": relational_state.activated,
                "target": relational_state.target,
                "relation_type": relational_state.relation_type,
                "neighbors": relational_state.context.get("neighbors", []) if relational_state.context else [],
            },
            "z": {
                "dialect": linguistic_state.dialect,
                "distinctiveness": linguistic_state.distinctiveness,
            },
            "t": {
                "step": temporal_state.step,
                "stage": temporal_state.momentum.get("stage", "opening"),
                "velocity": temporal_state.velocity,
                "session_number": temporal_state.momentum.get("session_number", 1),
            },
        }

        handoff = temporal_state.momentum.get("handoff_prompt") if turn_count == 0 else None

        return TherapyContext(
            user_id=user_id,
            session_id=session_id,
            user_message=message,
            safety_result=asdict(safety_result),
            persona_state=persona_state,
            voice_instruction=linguistic_state.voice_instruction,
            active_concerns=[_safe_dict(c) for c in active_concerns],
            media_analogies=media_analogies,
            coping_strategies=coping_strategies,
            handoff_prompt=handoff,
            kg_stats=kg.stats(),
        )

    def validate_response(self, response_text: str) -> SafetyResult:
        """Validate a generated response before delivery."""
        return self.safety.check_response(response_text)

    # ── KG Growth ───────────────────────────────────────────────────

    def add_concern(self, user_id: str, name: str, description: str = "",
                    intensity: float = 0.5) -> Dict[str, Any]:
        """Add or update a concern in the user's KG."""
        kg = self._get_kg(user_id)
        session_id = self._user_sessions.get(user_id)
        node_id = kg.add_node(name, "concern", description, intensity, session_id)
        return {"node_id": node_id, "name": name, "type": "concern"}

    def add_media(self, user_id: str, name: str, description: str = "",
                  keywords: str = "") -> Dict[str, Any]:
        """Add a media preference to the user's KG."""
        kg = self._get_kg(user_id)
        session_id = self._user_sessions.get(user_id)
        node_id = kg.add_node(name, "media", description,
                              session_id=session_id, intent_keywords=keywords)
        return {"node_id": node_id, "name": name, "type": "media"}

    def add_insight(self, user_id: str, name: str, description: str = "",
                    concern_id: str = None) -> Dict[str, Any]:
        """Persist a breakthrough/insight to the user's KG."""
        kg = self._get_kg(user_id)
        session_id = self._user_sessions.get(user_id)
        node_id = kg.add_node(name, "breakthrough", description, session_id=session_id)
        if concern_id:
            kg.add_edge(node_id, concern_id, "resolved_by", session_id=session_id)
        return {"node_id": node_id, "name": name, "type": "breakthrough"}

    def update_node(self, user_id: str, node_id: str, **kwargs) -> bool:
        """Update a node in the user's KG (therapist editing)."""
        kg = self._get_kg(user_id)
        return kg.update_node(node_id, **kwargs)

    def add_edge(self, user_id: str, source: str, target: str,
                 edge_type: str, weight: float = 1.0) -> bool:
        """Add an edge in the user's KG (therapist editing)."""
        kg = self._get_kg(user_id)
        session_id = self._user_sessions.get(user_id)
        return kg.add_edge(source, target, edge_type, weight, session_id)

    # ── Read Operations ─────────────────────────────────────────────

    def get_user_state(self, user_id: str) -> Dict[str, Any]:
        """Get the full user state (concerns, sessions, stats)."""
        kg = self._get_kg(user_id)
        return {
            "user_id": user_id,
            "active_concerns": [_safe_dict(c) for c in kg.get_active_concerns()],
            "all_nodes": {
                ntype: [_safe_dict(n) for n in kg.get_nodes_by_type(ntype)]
                for ntype in ["concern", "emotion", "trigger", "coping",
                              "media", "breakthrough", "goal"]
            },
            "session_history": kg.get_session_history(),
            "stats": kg.stats(),
        }

    def get_user_graph(self, user_id: str) -> Dict[str, Any]:
        """Get the user's KG in React Flow format."""
        kg = self._get_kg(user_id)
        return kg.to_react_flow()

    def search_kg(self, user_id: str, query: str, limit: int = 10) -> List[Dict]:
        """Search the user's KG."""
        kg = self._get_kg(user_id)
        return kg.search_nodes(query, limit)

    def close_all(self):
        """Close all KG connections (shutdown)."""
        for kg in self._user_kgs.values():
            kg.close()
        self._user_kgs.clear()


def _safe_dict(obj):
    """Convert sqlite3.Row or dict to plain dict."""
    if isinstance(obj, dict):
        return obj
    return dict(obj)
