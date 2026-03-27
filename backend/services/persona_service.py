"""
Persona Service — Wraps 4D PersonaEngine with brand-specific dimension computers.

Provides:
- compute_state(): Get current 4D persona position
- get_system_prompt(): Generate system prompt with 4D injection
- get_trajectory(): Get conversation trajectory
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import PersonaEngine, Persona4D

sys.path.insert(0, str(Path(__file__).parent.parent))
from persona.brand_emotional import BrandEmotionalComputer
from persona.brand_relational import BrandRelationalComputer
from persona.brand_linguistic import BrandLinguisticComputer
from persona.brand_temporal import BrandTemporalComputer
from config import ARIA_BASE_PROMPT, JEWELRY_KG_PATH


class PersonaService:
    """
    4D Persona service for the Aria jewelry assistant.

    Manages the PersonaEngine with brand-specific dimension computers:
    - X: BrandEmotionalComputer (customer interaction signals)
    - Y: BrandRelationalComputer (product KG traversal via NAI)
    - Z: BrandLinguisticComputer (brand voice)
    - T: BrandTemporalComputer (customer journey)
    """

    def __init__(self, kg_path: str = None):
        self.emotional = BrandEmotionalComputer()
        self.relational = BrandRelationalComputer(str(kg_path or JEWELRY_KG_PATH))
        self.linguistic = BrandLinguisticComputer()
        self.temporal = BrandTemporalComputer()

        self.engine = PersonaEngine(
            emotional_computer=self.emotional,
            relational_computer=self.relational,
            linguistic_computer=self.linguistic,
            temporal_computer=self.temporal
        )

    def compute_state(self, user_message: str,
                      conversation_history: List[Dict[str, str]] = None,
                      session_id: str = "default") -> Persona4D:
        """
        Compute the current 4D persona state.

        Args:
            user_message: Current user message
            conversation_history: Previous turns
            session_id: Session identifier for trajectory tracking

        Returns:
            Persona4D with computed (x, y, z, t) state
        """
        return self.engine.compute_position(
            entity_id=session_id,
            context=user_message,
            conversation_history=conversation_history or []
        )

    def get_system_prompt(self, persona: Persona4D) -> str:
        """
        Generate complete system prompt with 4D state injection.

        The system prompt is NOT the persona — it's computed FROM the persona.
        """
        return self.engine.synthesize_prompt(persona, ARIA_BASE_PROMPT)

    def state_to_dict(self, persona: Persona4D) -> Dict[str, Any]:
        """Serialize 4D state to JSON-friendly dict."""
        return {
            "entity_id": persona.entity_id,
            "x": {
                "mood": persona.x.mood,
                "value": persona.x.value,
                "intensity": persona.x.intensity,
                "reason": persona.x.reason,
            },
            "y": {
                "activated": persona.y.activated,
                "relation_type": persona.y.relation_type,
                "target": persona.y.target,
                "intensity": persona.y.intensity,
                "context": {
                    k: v for k, v in (persona.y.context or {}).items()
                    if k in ("node_id", "node_type", "match_type")
                },
            },
            "z": {
                "dialect": persona.z.dialect,
                "distinctiveness": persona.z.distinctiveness,
            },
            "t": {
                "step": persona.t.step,
                "velocity": persona.t.velocity,
                "momentum": persona.t.momentum,
                "memory": persona.t.memory,
            },
            "derived": {
                "intensity": persona.intensity,
                "stability": persona.stability,
                "authenticity": persona.authenticity,
            },
        }

    def get_trajectory(self, session_id: str, window: int = 10) -> List[Dict[str, Any]]:
        """Get trajectory of persona states for a session."""
        trajectory = self.engine.get_trajectory(session_id, window)
        return [self.state_to_dict(p) for p in trajectory]

    def predict_next(self, session_id: str) -> Optional[Dict[str, float]]:
        """Predict next persona position."""
        return self.engine.predict_next(session_id)
