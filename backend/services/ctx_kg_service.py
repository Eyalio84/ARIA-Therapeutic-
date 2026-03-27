"""
CtxKGService — Architectural Knowledge Graph search.

Searches the ctx-kg.db (built from .ctx files) using the same hybrid
scoring as ctx-to-kg.py: text matching + embedding similarity + graph
traversal. Returns architectural context for injection into Aria's
response pipeline.

Graceful degradation: if ctx-kg.db doesn't exist, all methods return
empty results. The backend operates product-only in that case.
"""

import sqlite3
import json
import math
import re
import os
from typing import Dict, Any, List, Optional
from collections import defaultdict


def _tokenize(text: str) -> List[str]:
    if not text:
        return []
    return [t for t in re.findall(r'[a-z][a-z0-9]+', text.lower()) if len(t) > 1]


def _cosine_sim(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class CtxKGService:
    """Architectural KG search over .ctx-derived knowledge graph."""

    def __init__(self, db_path: str, embeddings_path: str):
        self.db_path = db_path
        self.embeddings_path = embeddings_path
        self.available = False
        self.nodes: Dict[str, dict] = {}
        self.embeddings: Dict[str, List[float]] = {}
        self._load()

    def _load(self):
        """Load KG and embeddings. Silently no-op if files missing."""
        if not os.path.exists(self.db_path) or not os.path.exists(self.embeddings_path):
            return

        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            self.nodes = {row['name']: dict(row) for row in conn.execute("SELECT * FROM nodes")}
            conn.close()

            with open(self.embeddings_path, 'r') as f:
                emb_data = json.load(f)
            for node in emb_data.get('nodes', []):
                dims = node['dimensions']
                self.embeddings[node['node_id']] = [dims[f"d{i}"] for i in range(len(dims))]

            self.available = True
        except Exception:
            self.available = False

    def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Hybrid search: text + embedding + graph. Returns top-k results."""
        if not self.available:
            return {"results": [], "source": "ctx-kg"}

        query_tokens = set(_tokenize(query))

        # Text matching
        text_scores = {}
        for name, node in self.nodes.items():
            node_tokens = set(_tokenize(name) + _tokenize(node.get('description', '')))
            overlap = query_tokens & node_tokens
            if overlap:
                text_scores[name] = len(overlap) / max(len(query_tokens), 1)

        # Embedding similarity from text anchors
        embedding_scores = {}
        if text_scores:
            anchors = sorted(text_scores, key=text_scores.get, reverse=True)[:3]
            for anchor in anchors:
                if anchor not in self.embeddings:
                    continue
                anchor_vec = self.embeddings[anchor]
                for other, vec in self.embeddings.items():
                    if other == anchor:
                        continue
                    sim = _cosine_sim(anchor_vec, vec)
                    if sim > 0.4:
                        embedding_scores[other] = max(embedding_scores.get(other, 0), sim)

        # Graph expansion (1-hop only for speed)
        graph_scores = {}
        if text_scores:
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                anchors = sorted(text_scores, key=text_scores.get, reverse=True)[:3]
                for anchor in anchors:
                    for row in conn.execute("SELECT to_node FROM edges WHERE from_node = ?", (anchor,)):
                        graph_scores[row['to_node']] = max(graph_scores.get(row['to_node'], 0), 0.8)
                    for row in conn.execute("SELECT from_node FROM edges WHERE to_node = ?", (anchor,)):
                        graph_scores[row['from_node']] = max(graph_scores.get(row['from_node'], 0), 0.7)
                conn.close()
            except Exception:
                pass

        # Combine
        all_names = set(text_scores) | set(embedding_scores) | set(graph_scores)
        results = []
        for name in all_names:
            t = text_scores.get(name, 0)
            e = embedding_scores.get(name, 0)
            g = graph_scores.get(name, 0)
            score = t * 1.0 + e * 0.6 + g * 0.8
            node = self.nodes.get(name, {})
            results.append({
                "name": name,
                "type": node.get("type", "unknown"),
                "description": node.get("description", ""),
                "group": node.get("group", ""),
                "score": round(score, 4),
            })

        results.sort(key=lambda x: -x["score"])
        return {"results": results[:top_k], "source": "ctx-kg"}

    def get_neighbors(self, node_name: str) -> List[Dict[str, str]]:
        """Get directly connected nodes."""
        if not self.available:
            return []
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            neighbors = []
            for row in conn.execute("SELECT to_node, type FROM edges WHERE from_node = ?", (node_name,)):
                neighbors.append({"name": row["to_node"], "edge_type": row["type"], "direction": "outgoing"})
            for row in conn.execute("SELECT from_node, type FROM edges WHERE to_node = ?", (node_name,)):
                neighbors.append({"name": row["from_node"], "edge_type": row["type"], "direction": "incoming"})
            conn.close()
            return neighbors
        except Exception:
            return []

    def get_stats(self) -> Dict[str, Any]:
        """Return KG statistics."""
        if not self.available:
            return {"available": False}
        try:
            conn = sqlite3.connect(self.db_path)
            node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
            edge_count = conn.execute("SELECT COUNT(*) FROM edges").fetchone()[0]
            conn.close()
            return {"available": True, "nodes": node_count, "edges": edge_count}
        except Exception:
            return {"available": False}
