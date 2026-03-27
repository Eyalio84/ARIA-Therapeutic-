"""
Brand Relational Computer (Y-axis)
====================================

Uses NAI KGManager for product graph traversal.

When a user mentions a product, material, occasion, or category,
the relational state activates with the relevant KG context.
"""

import sys
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

sys.path.insert(0, str(Path("/storage/self/primary/Download/ari1/framework")))
from persona_engine import DimensionComputer, RelationalState


class BrandRelationalComputer(DimensionComputer):
    """
    Relational computer using the jewelry KG.

    Detects product/material/occasion mentions in user messages
    and activates the appropriate relational context from the KG.
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._node_names: Dict[str, str] = {}  # name_lower → id
        self._node_info: Dict[str, Dict] = {}  # id → {name, type, description}

    def _ensure_loaded(self):
        """Lazy-load KG data."""
        if self._conn is not None:
            return
        self._conn = sqlite3.connect(self.db_path)
        rows = self._conn.execute(
            "SELECT id, name, description, type FROM nodes"
        ).fetchall()
        for r in rows:
            self._node_info[r[0]] = {"name": r[1], "type": r[3], "description": r[2]}
            # Index by name parts for detection
            name_lower = r[1].lower()
            self._node_names[name_lower] = r[0]
            # Also index individual significant words
            for word in name_lower.split():
                if len(word) > 3 and word not in {"with", "from", "that", "this"}:
                    if word not in self._node_names:
                        self._node_names[word] = r[0]

    def compute(self, context: Dict[str, Any], entity_id: str = "") -> RelationalState:
        """Compute relational state by detecting KG entities in user message."""
        if not context:
            return RelationalState(activated=False)

        self._ensure_loaded()
        user_message = context.get("context", "").lower()

        # Detect entities mentioned
        detected = self._detect_entities(user_message)

        if not detected:
            return RelationalState(
                activated=False,
                relation_type=None,
                target=None,
                intensity=0.0,
                context={}
            )

        # Use the first (best) match
        node_id, match_type = detected[0]
        info = self._node_info.get(node_id, {})

        # Get neighbors for rich context
        neighbors = self._get_neighbors(node_id)

        return RelationalState(
            activated=True,
            relation_type=info.get("type", "unknown"),
            target=info.get("name", node_id),
            intensity=0.8 if info.get("type") == "product" else 0.6,
            context={
                "node_id": node_id,
                "node_type": info.get("type"),
                "description": info.get("description", ""),
                "match_type": match_type,
                "neighbors": neighbors,
                "all_detected": [(nid, mt) for nid, mt in detected[:5]],
            }
        )

    def _detect_entities(self, text: str) -> List[tuple]:
        """Detect KG entities in text. Returns [(node_id, match_type), ...]."""
        detected = []
        text_lower = text.lower()

        # Full name matches first (higher priority)
        for name_lower, node_id in self._node_names.items():
            if len(name_lower) > 3 and name_lower in text_lower:
                match_type = "full_name" if " " in name_lower else "keyword"
                detected.append((node_id, match_type))

        # Deduplicate keeping first occurrence
        seen = set()
        unique = []
        for nid, mt in detected:
            if nid not in seen:
                seen.add(nid)
                unique.append((nid, mt))

        # Sort: full_name matches first, then products, then others
        def sort_key(item):
            nid, mt = item
            info = self._node_info.get(nid, {})
            type_priority = {"product": 0, "category": 1, "material": 2}.get(info.get("type", ""), 3)
            match_priority = 0 if mt == "full_name" else 1
            return (match_priority, type_priority)

        unique.sort(key=sort_key)
        return unique

    def _get_neighbors(self, node_id: str, limit: int = 5) -> List[Dict]:
        """Get KG neighbors of a node."""
        if not self._conn:
            return []
        rows = self._conn.execute(
            "SELECT e.target, e.type, n.name, n.type as node_type "
            "FROM edges e JOIN nodes n ON e.target = n.id "
            "WHERE e.source = ? LIMIT ?",
            (node_id, limit)
        ).fetchall()
        return [{"id": r[0], "edge_type": r[1], "name": r[2], "node_type": r[3]} for r in rows]
