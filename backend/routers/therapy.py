"""
Therapy API Router — /api/therapy/* endpoints.

POST /api/therapy/session/start     — Start or resume a therapy session
POST /api/therapy/session/end       — End current session with summary
POST /api/therapy/respond           — Process message through therapy pipeline
POST /api/therapy/validate          — Standalone safety check on output
GET  /api/therapy/user/{id}/state   — Full user state (concerns, sessions, stats)
GET  /api/therapy/user/{id}/graph   — User's KG in React Flow format
POST /api/therapy/user/{id}/media   — Add media preference to user KG
POST /api/therapy/user/{id}/concern — Add or update a concern
POST /api/therapy/insight           — Persist a breakthrough/insight
PUT  /api/therapy/user/{id}/node/{nid} — Therapist edits a KG node
POST /api/therapy/user/{id}/edge    — Therapist adds a KG edge
GET  /api/therapy/health            — Service status
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from dataclasses import asdict

router = APIRouter(prefix="/api/therapy", tags=["therapy"])

# Injected by main.py
_therapy_service = None


def init_services(therapy_service):
    global _therapy_service
    _therapy_service = therapy_service


# ── Request Models ──────────────────────────────────────────────────

class SessionStartRequest(BaseModel):
    user_id: str

class SessionEndRequest(BaseModel):
    user_id: str
    summary: Optional[str] = None
    mood_start: Optional[float] = None
    mood_end: Optional[float] = None

class RespondRequest(BaseModel):
    user_id: str
    message: str
    turn_count: int = 0

class ValidateRequest(BaseModel):
    response: str

class MediaRequest(BaseModel):
    name: str
    description: str = ""
    keywords: str = ""

class ConcernRequest(BaseModel):
    name: str
    description: str = ""
    intensity: float = 0.5

class InsightRequest(BaseModel):
    user_id: str
    name: str
    description: str = ""
    concern_id: Optional[str] = None

class NodeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    intensity: Optional[float] = None

class EdgeRequest(BaseModel):
    source: str
    target: str
    edge_type: str
    weight: float = 1.0


# ── Endpoints ───────────────────────────────────────────────────────

@router.post("/session/start")
async def start_session(req: SessionStartRequest):
    """Start or resume a therapy session."""
    try:
        return _therapy_service.start_session(req.user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/end")
async def end_session(req: SessionEndRequest):
    """End the current session with optional summary and mood scores."""
    try:
        return _therapy_service.end_session(
            req.user_id, req.summary, req.mood_start, req.mood_end
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/respond")
async def respond(req: RespondRequest):
    """
    Process a user message through the therapy pipeline.

    Returns context for LLM generation:
    - safety_result: escalation/block/pass
    - persona_state: 4D computed state
    - voice_instruction: adaptive Aria voice
    - active_concerns, media_analogies, coping_strategies
    - handoff_prompt (if first turn of a returning user)

    If safety_result.action is "escalate" or "block", do NOT generate
    a response — return the safety message + resources directly.
    """
    try:
        ctx = _therapy_service.process_message(
            req.user_id, req.message, req.turn_count
        )
        return asdict(ctx)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate(req: ValidateRequest):
    """Validate a generated response before delivery."""
    try:
        result = _therapy_service.validate_response(req.response)
        return asdict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/state")
async def get_user_state(user_id: str):
    """Get the full user state — concerns, sessions, stats."""
    try:
        return _therapy_service.get_user_state(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/graph")
async def get_user_graph(user_id: str):
    """Get the user's KG in React Flow format for visualization."""
    try:
        return _therapy_service.get_user_graph(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/media")
async def add_media(user_id: str, req: MediaRequest):
    """Add a media preference (book, movie, music) to the user's KG."""
    try:
        return _therapy_service.add_media(
            user_id, req.name, req.description, req.keywords
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/concern")
async def add_concern(user_id: str, req: ConcernRequest):
    """Add or update a concern in the user's KG."""
    try:
        return _therapy_service.add_concern(
            user_id, req.name, req.description, req.intensity
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insight")
async def add_insight(req: InsightRequest):
    """Persist a breakthrough/insight, optionally linking to a concern."""
    try:
        return _therapy_service.add_insight(
            req.user_id, req.name, req.description, req.concern_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/user/{user_id}/node/{node_id}")
async def update_node(user_id: str, node_id: str, req: NodeUpdateRequest):
    """Therapist edits a node in the user's KG."""
    try:
        updates = {k: v for k, v in req.dict().items() if v is not None}
        success = _therapy_service.update_node(user_id, node_id, **updates)
        if not success:
            raise HTTPException(status_code=404, detail="Node not found")
        return {"updated": True, "node_id": node_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/edge")
async def add_edge(user_id: str, req: EdgeRequest):
    """Therapist adds an edge in the user's KG."""
    try:
        success = _therapy_service.add_edge(
            user_id, req.source, req.target, req.edge_type, req.weight
        )
        if not success:
            raise HTTPException(status_code=400, detail="Invalid source or target node")
        return {"added": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Service health check."""
    return {
        "status": "healthy" if _therapy_service else "not_initialized",
        "service": _therapy_service is not None,
    }
