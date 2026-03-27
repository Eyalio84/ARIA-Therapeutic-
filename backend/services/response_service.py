"""
Response Service — Orchestrates the full Aria pipeline.

Pipeline:
1. NAI retrieve: Search jewelry KG for relevant products/knowledge
2. 4D compute: Compute persona state from user message + context
3. Generate: Build system prompt with 4D injection + KG context
4. Validate: Introspection check before sending to user

This is the integration point where NAI + 4D + Introspection come together.
"""

from typing import Dict, Any, List, Optional

from services.nai_service import NAIService
from services.persona_service import PersonaService
from services.introspection import IntrospectionService, ValidationResult
from services.ctx_kg_service import CtxKGService


class ResponseService:
    """
    Orchestrates the full Aria response pipeline.

    NAI retrieve → 4D compute → prompt build → validate
    """

    def __init__(self, nai: NAIService, persona: PersonaService,
                 introspection: IntrospectionService,
                 ctx_kg: Optional[CtxKGService] = None):
        self.nai = nai
        self.persona = persona
        self.introspection = introspection
        self.ctx_kg = ctx_kg

    def process_query(self, user_message: str,
                      conversation_history: List[Dict[str, str]] = None,
                      session_id: str = "default") -> Dict[str, Any]:
        """
        Full pipeline: retrieve → compute → build prompt → return context.

        This does NOT call an LLM — it prepares everything the frontend needs
        to inject into the Gemini Live session or any other LLM call.

        Args:
            user_message: Current user message
            conversation_history: Previous turns
            session_id: Session ID for state tracking

        Returns:
            Dict with system_prompt, kg_context, persona_state, etc.
        """
        conversation_history = conversation_history or []

        # Step 1: NAI retrieve — search KG for relevant context
        kg_results = self.nai.search(user_message, top_n=5)

        # Step 2: 4D compute — compute persona state
        persona_state = self.persona.compute_state(
            user_message=user_message,
            conversation_history=conversation_history,
            session_id=session_id
        )
        state_dict = self.persona.state_to_dict(persona_state)

        # Step 3: Build system prompt with 4D injection
        system_prompt = self.persona.get_system_prompt(persona_state)

        # Step 4: Build KG context injection
        kg_context = self._build_kg_context(kg_results)
        if kg_context:
            system_prompt += f"\n\nRELEVANT PRODUCT KNOWLEDGE:\n{kg_context}"

        # Step 5: Architectural context (from .ctx KG, if available)
        arch_context = ""
        if self.ctx_kg and self.ctx_kg.available:
            ctx_results = self.ctx_kg.search(user_message, top_k=5)
            arch_context = self._build_architectural_context(ctx_results)
            if arch_context:
                system_prompt += f"\n\nARCHITECTURAL CONTEXT:\n{arch_context}"

        return {
            "system_prompt": system_prompt,
            "persona_state": state_dict,
            "kg_results": kg_results,
            "kg_context": kg_context,
            "arch_context": arch_context,
            "session_id": session_id,
            "intent": kg_results.get("intent", "unknown"),
            "methods": kg_results.get("methods", []),
        }

    def validate_response(self, response: str,
                          persona_state: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Validate a generated response against 4D state.

        Called AFTER the LLM generates a response, BEFORE sending to user.

        Args:
            response: Generated response text
            persona_state: Current 4D state from process_query()

        Returns:
            Validation result dict
        """
        result = self.introspection.validate(response, persona_state)
        return {
            "valid": result.valid,
            "score": result.score,
            "recommendation": result.recommendation,
            "deviations": result.deviations,
        }

    def _build_kg_context(self, kg_results: Dict[str, Any]) -> str:
        """Build a natural language context string from KG results."""
        results = kg_results.get("results", [])
        if not results:
            return ""

        parts = []
        for r in results[:3]:  # Top 3 results
            name = r.get("name", "")
            desc = r.get("description", "")
            price = r.get("price")
            category = r.get("category", "")
            node_type = r.get("node_type", "")

            if node_type == "product" and price:
                parts.append(f"- {name} (${price}, {category}): {desc}")
            else:
                parts.append(f"- {name}: {desc}")

            # Add neighbors for product results
            if node_type == "product":
                neighbors = self.nai.get_neighbors(r["id"])
                material_names = [n["name"] for n in neighbors if n.get("node_type") == "material"]
                care_names = [n["name"] for n in neighbors if n.get("node_type") == "care_instruction"]
                pair_names = [n["name"] for n in neighbors if n.get("edge_type") == "pairs_with"]

                if material_names:
                    parts.append(f"  Materials: {', '.join(material_names)}")
                if care_names:
                    parts.append(f"  Care: {', '.join(care_names)}")
                if pair_names:
                    parts.append(f"  Pairs well with: {', '.join(pair_names)}")

        return "\n".join(parts)

    def _build_architectural_context(self, ctx_results: Dict[str, Any]) -> str:
        """Build context string from architectural KG results."""
        results = ctx_results.get("results", [])
        if not results:
            return ""

        parts = []
        for r in results[:5]:
            name = r.get("name", "")
            ntype = r.get("type", "")
            desc = r.get("description", "")
            neighbors = self.ctx_kg.get_neighbors(name) if self.ctx_kg else []

            line = f"- {name} [{ntype}]: {desc}"
            if neighbors:
                connected = [f"{n['name']} ({n['edge_type']})" for n in neighbors[:5]]
                line += f"\n  Connected to: {', '.join(connected)}"
            parts.append(line)

        return "\n".join(parts)

    def get_full_state(self, session_id: str = "default") -> Dict[str, Any]:
        """Get full system state for debugging/display."""
        state = {
            "kg_stats": self.nai.get_stats(),
            "persona_trajectory": self.persona.get_trajectory(session_id),
            "prediction": self.persona.predict_next(session_id),
        }
        if self.ctx_kg:
            state["ctx_kg_stats"] = self.ctx_kg.get_stats()
        return state
