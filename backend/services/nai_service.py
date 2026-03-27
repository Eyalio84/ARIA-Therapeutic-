"""
NAI Service — Wraps IntentGraphEngine for jewelry KG search.

Imports directly from py-query/nai/ (sys.path injection).
Provides search(), get_product(), get_products(), get_neighbors().
"""

import sys
import sqlite3
from typing import Optional, Dict, List, Any
from pathlib import Path

# Add NAI to path
sys.path.insert(0, str(Path("/storage/self/primary/Download/gemini-3-pro/AI-LAB/docs/py-query")))

from nai.kg_manager import KGManager, detect_schema, get_all_nodes, get_all_edges
from nai.intentgraph_engine import IntentGraphEngine, classify_intent

from config import JEWELRY_KG_PATH


class NAIService:
    """
    NAI-powered search over the jewelry knowledge graph.

    Uses the 4-weight IntentGraph formula:
    score = α×embedding + β×text + γ×graph + δ×intent
    """

    def __init__(self, db_path: str = None):
        self.db_path = str(db_path or JEWELRY_KG_PATH)
        self.conn: Optional[sqlite3.Connection] = None
        self.engine: Optional[IntentGraphEngine] = None
        self._initialized = False

    def initialize(self):
        """Load KG and build search engine."""
        if self._initialized:
            return

        self.conn = sqlite3.connect(self.db_path)
        schema = detect_schema(self.conn)
        if not schema:
            raise ValueError(f"Cannot detect schema for {self.db_path}")

        nodes = get_all_nodes(self.conn, schema)
        edges = get_all_edges(self.conn, schema)

        self.engine = IntentGraphEngine(self.conn, nodes, edges)
        self._schema = schema
        self._initialized = True

    def search(self, query: str, top_n: int = 5, intent: str = None,
               node_type: str = None) -> Dict[str, Any]:
        """
        Search the jewelry KG using IntentGraph.

        Args:
            query: Natural language query
            top_n: Number of results
            intent: Override intent classification
            node_type: Filter by type (product, material, etc.)

        Returns:
            Dict with results, intent, weights, methods
        """
        self.initialize()
        result = self.engine.search(query, intent=intent, top_n=top_n)

        # Post-filter by node_type if requested
        if node_type:
            filtered = []
            for r in result["results"]:
                node_row = self.conn.execute(
                    f"SELECT type FROM {self._schema['node_table']} WHERE {self._schema['node_id']} = ?",
                    (r["id"],)
                ).fetchone()
                if node_row and node_row[0] == node_type:
                    filtered.append(r)
            result["results"] = filtered

        # Enrich product results with price/stock/category
        for r in result["results"]:
            row = self.conn.execute(
                "SELECT price, stock, category, type FROM nodes WHERE id = ?",
                (r["id"],)
            ).fetchone()
            if row:
                r["price"] = row[0]
                r["stock"] = row[1]
                r["category"] = row[2]
                r["node_type"] = row[3]

        return result

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get a single product by ID."""
        self.initialize()
        row = self.conn.execute(
            "SELECT id, name, description, price, stock, category, intent_keywords FROM nodes WHERE id = ? AND type = 'product'",
            (product_id,)
        ).fetchone()
        if not row:
            return None
        return {
            "id": row[0], "name": row[1], "description": row[2],
            "price": row[3], "stock": row[4], "category": row[5],
            "intent_keywords": row[6]
        }

    def get_products(self, category: str = None) -> List[Dict[str, Any]]:
        """Get all products, optionally filtered by category."""
        self.initialize()
        if category:
            rows = self.conn.execute(
                "SELECT id, name, description, price, stock, category FROM nodes WHERE type = 'product' AND category = ?",
                (category,)
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT id, name, description, price, stock, category FROM nodes WHERE type = 'product'"
            ).fetchall()

        return [
            {"id": r[0], "name": r[1], "description": r[2],
             "price": r[3], "stock": r[4], "category": r[5]}
            for r in rows
        ]

    def get_neighbors(self, node_id: str, edge_type: str = None) -> List[Dict[str, Any]]:
        """Get neighbors of a node in the KG."""
        self.initialize()
        if edge_type:
            rows = self.conn.execute(
                "SELECT e.target, e.type, n.name, n.description, n.type as node_type "
                "FROM edges e JOIN nodes n ON e.target = n.id "
                "WHERE e.source = ? AND e.type = ?",
                (node_id, edge_type)
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT e.target, e.type, n.name, n.description, n.type as node_type "
                "FROM edges e JOIN nodes n ON e.target = n.id "
                "WHERE e.source = ?",
                (node_id,)
            ).fetchall()

        return [
            {"id": r[0], "edge_type": r[1], "name": r[2],
             "description": r[3], "node_type": r[4]}
            for r in rows
        ]

    def get_intent_info(self, query: str) -> Dict[str, Any]:
        """Get intent classification details."""
        self.initialize()
        return self.engine.get_intent_info(query)

    def get_stats(self) -> Dict[str, Any]:
        """Get KG statistics."""
        self.initialize()
        node_count = self.conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
        edge_count = self.conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
        types = dict(self.conn.execute(
            "SELECT type, COUNT(*) FROM nodes GROUP BY type"
        ).fetchall())
        return {"nodes": node_count, "edges": edge_count, "node_types": types}

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self._initialized = False
