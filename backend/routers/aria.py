"""
Aria API Router — /api/aria/* endpoints.

POST /api/aria/query     — NAI search over product KG
POST /api/aria/state     — Compute current 4D persona state
POST /api/aria/respond   — Generate response context with 4D + NAI
POST /api/aria/validate  — Introspection check on output
POST /api/aria/memory    — Save/retrieve user memory
GET  /api/aria/health    — System status
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/aria", tags=["aria"])

# These get injected by main.py
_nai = None
_persona = None
_response = None
_introspection = None


def init_services(nai, persona, response_svc, introspection):
    global _nai, _persona, _response, _introspection
    _nai = nai
    _persona = persona
    _response = response_svc
    _introspection = introspection


# ── Request Models ───────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    top_n: int = Field(default=5, ge=1, le=20)
    intent: Optional[str] = None
    node_type: Optional[str] = None

class StateRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    session_id: str = "default"

class RespondRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)
    session_id: str = "default"

class ValidateRequest(BaseModel):
    response: str
    persona_state: Optional[Dict[str, Any]] = None

class MemoryRequest(BaseModel):
    session_id: str = "default"
    action: str = "get"  # "get" or "save"
    data: Optional[Dict[str, Any]] = None


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/query")
async def query(req: QueryRequest):
    """Search the jewelry KG using IntentGraph."""
    try:
        results = _nai.search(
            query=req.query,
            top_n=req.top_n,
            intent=req.intent,
            node_type=req.node_type
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/state")
async def compute_state(req: StateRequest):
    """Compute current 4D persona state."""
    try:
        persona = _persona.compute_state(
            user_message=req.message,
            conversation_history=req.conversation_history,
            session_id=req.session_id
        )
        return _persona.state_to_dict(persona)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/respond")
async def respond(req: RespondRequest):
    """Generate response context with 4D persona + NAI retrieval."""
    try:
        result = _response.process_query(
            user_message=req.message,
            conversation_history=req.conversation_history,
            session_id=req.session_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate(req: ValidateRequest):
    """Validate a response against 4D persona state."""
    try:
        result = _response.validate_response(
            response=req.response,
            persona_state=req.persona_state
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/memory")
async def memory(req: MemoryRequest):
    """Save or retrieve user memory for a session."""
    if req.action == "get":
        trajectory = _persona.get_trajectory(req.session_id)
        prediction = _persona.predict_next(req.session_id)
        return {
            "session_id": req.session_id,
            "trajectory": trajectory,
            "prediction": prediction,
        }
    elif req.action == "save":
        # For now, memory is implicit via trajectory tracking
        return {"status": "ok", "detail": "Memory tracked via 4D trajectory"}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {req.action}")


@router.get("/health")
async def health():
    """System health check."""
    try:
        stats = _nai.get_stats()
        return {
            "status": "healthy",
            "kg": stats,
            "services": {
                "nai": _nai is not None,
                "persona": _persona is not None,
                "response": _response is not None,
                "introspection": _introspection is not None,
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
        }
