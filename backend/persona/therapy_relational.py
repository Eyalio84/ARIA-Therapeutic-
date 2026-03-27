"""
Therapy Relational Computer (Y-axis)
======================================

Traverses the user's therapy KG to find active context:
- Detect concern/trigger/coping mentions in user message
- Pull relevant KG subgraph (neighbors, edges)
- Surface media analogies connected to active concerns
- Feed KG context into the response pipeline

Instead of detecting product mentions (brand), we detect
emotional concepts and traverse the user's personal graph.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, RelationalState


class TherapyRelationalComputer(DimensionComputer):
    """
    Relational computer using the user's therapy KG.

    Detects concern/trigger/emotion mentions in user messages
    and activates the appropriate subgraph from their personal KG.
    """

    def __init__(self, therapy_kg=None):
        """
        Args:
            therapy_kg: A TherapyKG instance (from build_therapy_kg.py)
        """
        self.kg = therapy_kg
        self._node_index: Dict[str, str] = {}  # word/phrase → node_id
        self._indexed = False

    def set_kg(self, therapy_kg):
        """Swap in a different user's KG at runtime."""
        self.kg = therapy_kg
        self._indexed = False
        self._node_index = {}

    def _ensure_indexed(self):
        """Build a name index from the KG for fast entity detection."""
        if self._indexed or not self.kg:
            return
        rows = self.kg.conn.execute(
            "SELECT id, name, type, intent_keywords FROM nodes"
        ).fetchall()
        for r in rows:
            name_lower = r["name"].lower()
            self._node_index[name_lower] = r["id"]
            # Index individual significant words
            for word in name_lower.split():
                if len(word) > 3:
                    self._node_index.setdefault(word, r["id"])
            # Index intent keywords
            if r["intent_keywords"]:
                for kw in r["intent_keywords"].split(","):
                    kw = kw.strip().lower()
                    if kw:
                        self._node_index.setdefault(kw, r["id"])
        self._indexed = True

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> RelationalState:
        """
        Compute relational state by detecting KG entities in user message.

        Context keys:
          - user_message: current user input
          - active_concerns: pre-loaded from KG (optional optimization)
        """
        if not context or not self.kg:
            return RelationalState(activated=False)

        self._ensure_indexed()
        user_message = context.get("user_message", "").lower()

        if not user_message:
            return RelationalState(activated=False)

        # Detect entities mentioned in the message
        detected = self._detect_entities(user_message)

        if not detected:
            # No direct match — check if any active concerns are implicitly referenced
            active = context.get("active_concerns", [])
            if active:
                # Activate with the highest-intensity concern as context
                top = active[0]  # Already sorted by intensity desc
                neighbors = self.kg.get_neighbors(top["id"])
                return RelationalState(
                    activated=True,
                    relation_type="implicit_concern",
                    target=top["name"],
                    intensity=top.get("intensity", 0.5) * 0.5,  # Lower weight for implicit
                    context={
                        "node_id": top["id"],
                        "node_type": top["type"],
                        "description": top.get("description", ""),
                        "match_type": "implicit_active",
                        "neighbors": [dict(n) for n in neighbors[:5]],
                        "media_analogies": self._get_media_analogies(top["id"]),
                    }
                )
            return RelationalState(activated=False)

        # Use the best match
        node_id = detected[0]
        node = self.kg.get_node(node_id)
        if not node:
            return RelationalState(activated=False)

        neighbors = self.kg.get_neighbors(node_id)

        return RelationalState(
            activated=True,
            relation_type=node.get("type", "unknown"),
            target=node.get("name", node_id),
            intensity=node.get("intensity", 0.5),
            context={
                "node_id": node_id,
                "node_type": node["type"],
                "description": node.get("description", ""),
                "match_type": "explicit",
                "neighbors": [dict(n) for n in neighbors[:5]],
                "media_analogies": self._get_media_analogies(node_id),
                "coping_strategies": self._get_coping(node_id),
            }
        )

    def _detect_entities(self, text: str) -> List[str]:
        """Detect KG node references in text. Returns node IDs, best match first."""
        detected = []
        seen = set()

        # Multi-word matches first (higher specificity)
        for phrase, node_id in sorted(self._node_index.items(), key=lambda x: -len(x[0])):
            if len(phrase) > 3 and phrase in text and node_id not in seen:
                detected.append(node_id)
                seen.add(node_id)

        return detected

    def _get_media_analogies(self, node_id: str) -> List[Dict]:
        """Get media nodes connected via analogy_for edge."""
        if not self.kg:
            return []
        # Media that is an analogy FOR this concern
        rows = self.kg.conn.execute(
            "SELECT n.id, n.name, n.description FROM edges e "
            "JOIN nodes n ON e.source = n.id "
            "WHERE e.target = ? AND e.type = 'analogy_for' AND n.type = 'media'",
            (node_id,)
        ).fetchall()
        return [dict(r) for r in rows]

    def _get_coping(self, node_id: str) -> List[Dict]:
        """Get coping strategies connected via helps_with edge."""
        if not self.kg:
            return []
        rows = self.kg.conn.execute(
            "SELECT n.id, n.name, n.description FROM edges e "
            "JOIN nodes n ON e.source = n.id "
            "WHERE e.target = ? AND e.type = 'helps_with' AND n.type = 'coping'",
            (node_id,)
        ).fetchall()
        return [dict(r) for r in rows]
