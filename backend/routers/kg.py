"""
KG CRUD Router — /api/kg/* endpoints for KG Studio.

GET  /api/kg/graph   — Full graph formatted for React Flow
POST /api/kg/nodes   — Create node
PUT  /api/kg/nodes/{id} — Edit node
DELETE /api/kg/nodes/{id} — Delete node + cascade edges
POST /api/kg/edges   — Create edge
DELETE /api/kg/edges  — Delete edge
POST /api/kg/import  — Bulk import JSON
GET  /api/kg/export  — Export full graph as JSON
"""

import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

router = APIRouter(prefix="/api/kg", tags=["kg"])

_nai = None


def init_services(nai):
    global _nai
    _nai = nai


class NodeCreate(BaseModel):
    name: str
    description: str = ""
    type: str = "product"
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    intent_keywords: Optional[str] = None

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    intent_keywords: Optional[str] = None

class EdgeCreate(BaseModel):
    source: str
    target: str
    type: str = "relates_to"
    weight: float = 1.0

class EdgeDelete(BaseModel):
    source: str
    target: str
    type: str

class ImportData(BaseModel):
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)


def _compute_positions(nodes_data):
    """Compute grid positions for React Flow nodes, grouped by type."""
    type_groups = {}
    for n in nodes_data:
        t = n.get("type", "unknown")
        if t not in type_groups:
            type_groups[t] = []
        type_groups[t].append(n)

    positions = {}
    y_offset = 0
    for node_type, group in type_groups.items():
        cols = min(len(group), 5)
        for i, node in enumerate(group):
            col = i % cols
            row = i // cols
            positions[node["id"]] = {"x": col * 220 + 50, "y": y_offset + row * 120 + 50}
        y_offset += (math.ceil(len(group) / cols)) * 120 + 60

    return positions


@router.get("/graph")
async def get_graph():
    """Get full graph formatted for React Flow."""
    _nai.initialize()
    conn = _nai.conn

    # Get nodes
    rows = conn.execute(
        "SELECT id, name, description, type, price, stock, category FROM nodes"
    ).fetchall()

    nodes_data = []
    for r in rows:
        nodes_data.append({
            "id": r[0], "name": r[1], "description": r[2] or "",
            "type": r[3] or "unknown", "price": r[4], "stock": r[5], "category": r[6]
        })

    positions = _compute_positions(nodes_data)

    rf_nodes = []
    for n in nodes_data:
        pos = positions.get(n["id"], {"x": 0, "y": 0})
        rf_nodes.append({
            "id": n["id"],
            "type": "kgNode",
            "position": pos,
            "data": {
                "label": n["name"],
                "type": n["type"],
                "description": n["description"],
                "price": n["price"],
                "stock": n["stock"],
                "category": n["category"],
            },
        })

    # Get edges
    edge_rows = conn.execute("SELECT source, target, type FROM edges").fetchall()
    rf_edges = [
        {"id": f"{r[0]}-{r[2]}-{r[1]}", "source": r[0], "target": r[1],
         "label": r[2], "animated": False,
         "style": {"stroke": "rgba(201,169,110,0.3)"}}
        for r in edge_rows
    ]

    # Stats
    node_count = len(rf_nodes)
    edge_count = len(rf_edges)
    type_counts = {}
    for n in nodes_data:
        t = n["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "nodes": rf_nodes,
        "edges": rf_edges,
        "stats": {"nodes": node_count, "edges": edge_count, "node_types": type_counts},
    }


@router.post("/nodes")
async def create_node(req: NodeCreate):
    """Create a new node."""
    _nai.initialize()
    conn = _nai.conn
    node_id = req.name.lower().replace(" ", "-").replace("'", "")

    # Check if exists
    existing = conn.execute("SELECT id FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail=f"Node {node_id} already exists")

    conn.execute(
        "INSERT INTO nodes (id, name, description, type, price, stock, category, intent_keywords) VALUES (?,?,?,?,?,?,?,?)",
        (node_id, req.name, req.description, req.type, req.price, req.stock, req.category, req.intent_keywords)
    )
    conn.commit()
    # Rebuild BM25 index
    _nai._initialized = False
    _nai.initialize()
    return {"id": node_id, "name": req.name, "type": req.type}


@router.put("/nodes/{node_id}")
async def update_node(node_id: str, req: NodeUpdate):
    """Update a node."""
    _nai.initialize()
    conn = _nai.conn

    existing = conn.execute("SELECT id FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    updates = []
    params = []
    for field in ["name", "description", "type", "price", "stock", "category", "intent_keywords"]:
        val = getattr(req, field, None)
        if val is not None:
            updates.append(f"{field} = ?")
            params.append(val)

    if updates:
        params.append(node_id)
        conn.execute(f"UPDATE nodes SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        _nai._initialized = False
        _nai.initialize()

    return {"id": node_id, "updated": len(updates)}


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete a node and its edges."""
    _nai.initialize()
    conn = _nai.conn

    existing = conn.execute("SELECT id FROM nodes WHERE id = ?", (node_id,)).fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    conn.execute("DELETE FROM edges WHERE source = ? OR target = ?", (node_id, node_id))
    conn.execute("DELETE FROM nodes WHERE id = ?", (node_id,))
    conn.commit()
    _nai._initialized = False
    _nai.initialize()
    return {"deleted": node_id}


@router.post("/edges")
async def create_edge(req: EdgeCreate):
    """Create an edge."""
    _nai.initialize()
    conn = _nai.conn
    conn.execute(
        "INSERT INTO edges (source, target, type, weight) VALUES (?,?,?,?)",
        (req.source, req.target, req.type, req.weight)
    )
    conn.commit()
    _nai._initialized = False
    _nai.initialize()
    return {"source": req.source, "target": req.target, "type": req.type}


@router.delete("/edges")
async def delete_edge(req: EdgeDelete):
    """Delete an edge."""
    _nai.initialize()
    conn = _nai.conn
    conn.execute(
        "DELETE FROM edges WHERE source = ? AND target = ? AND type = ?",
        (req.source, req.target, req.type)
    )
    conn.commit()
    _nai._initialized = False
    _nai.initialize()
    return {"deleted": True}


@router.post("/import")
async def import_graph(req: ImportData):
    """Bulk import nodes and edges."""
    _nai.initialize()
    conn = _nai.conn
    imported_nodes = 0
    imported_edges = 0

    for n in req.nodes:
        try:
            conn.execute(
                "INSERT OR REPLACE INTO nodes (id, name, description, type, price, stock, category, intent_keywords) VALUES (?,?,?,?,?,?,?,?)",
                (n.get("id", ""), n.get("name", ""), n.get("description", ""),
                 n.get("type", ""), n.get("price"), n.get("stock"),
                 n.get("category"), n.get("intent_keywords", ""))
            )
            imported_nodes += 1
        except Exception:
            pass

    for e in req.edges:
        try:
            conn.execute(
                "INSERT INTO edges (source, target, type, weight) VALUES (?,?,?,?)",
                (e.get("source", ""), e.get("target", ""), e.get("type", "relates_to"), e.get("weight", 1.0))
            )
            imported_edges += 1
        except Exception:
            pass

    conn.commit()
    _nai._initialized = False
    _nai.initialize()
    return {"imported_nodes": imported_nodes, "imported_edges": imported_edges}


@router.get("/export")
async def export_graph():
    """Export full graph as JSON."""
    _nai.initialize()
    conn = _nai.conn

    nodes = []
    for r in conn.execute("SELECT id, name, description, type, price, stock, category, intent_keywords FROM nodes").fetchall():
        nodes.append({
            "id": r[0], "name": r[1], "description": r[2], "type": r[3],
            "price": r[4], "stock": r[5], "category": r[6], "intent_keywords": r[7]
        })

    edges = []
    for r in conn.execute("SELECT source, target, type, weight FROM edges").fetchall():
        edges.append({"source": r[0], "target": r[1], "type": r[2], "weight": r[3]})

    return {"nodes": nodes, "edges": edges}
