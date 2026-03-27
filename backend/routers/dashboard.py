"""
Therapist Dashboard API Router — /api/dashboard/* endpoints.

GET  /api/dashboard/user/{id}              — Full dashboard (all 8 features compiled)
GET  /api/dashboard/user/{id}/choices      — Choice evolution timeline
GET  /api/dashboard/user/{id}/mirror       — Mirror bubble analytics
GET  /api/dashboard/user/{id}/antagonist   — Antagonist analysis (user's externalized struggle)
GET  /api/dashboard/user/{id}/mood         — Mood check-in history + velocity
POST /api/dashboard/user/{id}/mood         — Record mood check-in (start or end)
GET  /api/dashboard/user/{id}/flags        — Flagged moments
POST /api/dashboard/user/{id}/flags        — Flag a moment for therapist attention
PUT  /api/dashboard/flag/{id}/annotate     — Add therapist note to a flagged moment
GET  /api/dashboard/user/{id}/notes        — Session notes
POST /api/dashboard/user/{id}/notes        — Add a therapist annotation
GET  /api/dashboard/user/{id}/achievements — Achievements (earned + unearned)
POST /api/dashboard/user/{id}/achievements — Award an achievement
GET  /api/dashboard/user/{id}/recap        — Story recap for session handoff
GET  /api/dashboard/health                 — Service health
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Injected by serve_game.py
_dashboard = None
_therapy_service = None


def init_services(dashboard_service, therapy_service=None):
    global _dashboard, _therapy_service
    _dashboard = dashboard_service
    _therapy_service = therapy_service


# ── Request Models ──────────────────────────────────────────────────

class MoodRequest(BaseModel):
    session_id: str
    mood_start: Optional[int] = None
    mood_end: Optional[int] = None

class FlagRequest(BaseModel):
    session_id: str
    severity: str = Field(..., pattern="^(info|attention|concern|urgent)$")
    category: str
    description: str
    user_content: str = ""

class AnnotateRequest(BaseModel):
    note: str

class NoteRequest(BaseModel):
    target_type: str = Field(..., pattern="^(node|flag|choice|session)$")
    target_id: str
    note: str

class AchievementRequest(BaseModel):
    achievement_id: str
    session_id: str = ""


# ── Helper: get user's therapy KG if therapy_service is available ───

def _get_user_kg(user_id: str):
    """Get a user's TherapyKG instance via therapy_service, or None."""
    if _therapy_service:
        return _therapy_service._get_kg(user_id)
    return None


# ── Endpoints ───────────────────────────────────────────────────────

@router.get("/user/{user_id}")
async def get_full_dashboard(user_id: str):
    """
    Compile the complete therapist dashboard for a user.

    Pulls KG data from TherapyService (if available) and combines
    with dashboard-owned data (moods, flags, notes, achievements).
    """
    try:
        kg = _get_user_kg(user_id)
        return _dashboard.get_full_dashboard(
            user_id=user_id,
            kg=kg,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/choices")
async def get_choice_timeline(user_id: str):
    """Choice evolution timeline from game choices log."""
    try:
        # Choices come from game state — if therapy_service has KG,
        # the KG tracks session events but choices_log is game-side.
        # For now return empty timeline; frontend will POST choices.
        return _dashboard.get_choice_timeline(user_id, [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/choices")
async def post_choice_timeline(user_id: str, choices: List[Dict[str, Any]]):
    """
    Analyze choice evolution from a provided choices log.

    The frontend sends the choices_log from game state for analysis.
    """
    try:
        return _dashboard.get_choice_timeline(user_id, choices)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/mirror")
async def get_mirror_analytics(user_id: str):
    """Mirror bubble engagement analytics."""
    try:
        # Interview stats would come from game state; return baseline
        return _dashboard.get_mirror_analytics({})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/mirror")
async def post_mirror_analytics(user_id: str, stats: Dict[str, Any]):
    """
    Analyze mirror bubble engagement from provided interview stats.

    Frontend sends interview_stats (mirror_bubbles_shown, mirror_bubbles_expanded).
    """
    try:
        return _dashboard.get_mirror_analytics(stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/antagonist")
async def get_antagonist_analysis(user_id: str):
    """
    Antagonist analysis — the user's externalized struggle.

    Requires synthesis data from game generation.
    Returns empty analysis if no synthesis available.
    """
    try:
        # TODO: retrieve synthesis from game runtime when available
        return _dashboard.get_antagonist_analysis({})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/antagonist")
async def post_antagonist_analysis(user_id: str, synthesis: Dict[str, Any]):
    """Analyze antagonist from provided game synthesis data."""
    try:
        return _dashboard.get_antagonist_analysis(synthesis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Mood Check-Ins ──────────────────────────────────────────────────

@router.get("/user/{user_id}/mood")
async def get_mood(user_id: str):
    """Mood history + velocity trend."""
    try:
        return {
            "history": _dashboard.get_mood_history(user_id),
            "velocity": _dashboard.get_mood_velocity(user_id),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/mood")
async def record_mood(user_id: str, req: MoodRequest):
    """Record a mood check-in (1-5 scale) at session start or end."""
    try:
        return _dashboard.record_mood(
            user_id, req.session_id, req.mood_start, req.mood_end
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Flagged Moments ─────────────────────────────────────────────────

@router.get("/user/{user_id}/flags")
async def get_flags(user_id: str):
    """Get all flagged moments for a user."""
    try:
        return _dashboard.get_flags(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/flags")
async def add_flag(user_id: str, req: FlagRequest):
    """Flag a moment for therapist attention."""
    try:
        flag_id = _dashboard.add_flag(
            user_id, req.session_id, req.severity,
            req.category, req.description, req.user_content
        )
        return {"flag_id": flag_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/flag/{flag_id}/annotate")
async def annotate_flag(flag_id: str, req: AnnotateRequest):
    """Add a therapist note to a flagged moment."""
    try:
        success = _dashboard.annotate_flag(flag_id, req.note)
        if not success:
            raise HTTPException(status_code=404, detail="Flag not found")
        return {"annotated": True, "flag_id": flag_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Session Notes ───────────────────────────────────────────────────

@router.get("/user/{user_id}/notes")
async def get_notes(user_id: str):
    """Get all therapist notes for a user."""
    try:
        return _dashboard.get_notes(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/notes")
async def add_note(user_id: str, req: NoteRequest):
    """Add a therapist annotation on a node, flag, choice, or session."""
    try:
        note_id = _dashboard.add_note(
            user_id, req.target_type, req.target_id, req.note
        )
        return {"note_id": note_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Achievements ────────────────────────────────────────────────────

@router.get("/user/{user_id}/achievements")
async def get_achievements(user_id: str):
    """Get all achievements (earned and unearned) for a user."""
    try:
        return _dashboard.get_achievements(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/achievements")
async def earn_achievement(user_id: str, req: AchievementRequest):
    """Award an achievement to a user."""
    try:
        result = _dashboard.earn_achievement(
            user_id, req.achievement_id, req.session_id
        )
        if result is None:
            return {"already_earned": True, "achievement_id": req.achievement_id}
        return {"earned": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Story Recap ─────────────────────────────────────────────────────

@router.get("/user/{user_id}/recap")
async def get_story_recap(user_id: str):
    """
    Generate 'Story So Far' narrative for session handoff.

    Combines KG data + game state into a brief recap Aria can read aloud.
    """
    try:
        kg = _get_user_kg(user_id)
        recap = _dashboard.generate_story_recap(user_id, kg=kg)
        return {"recap": recap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Therapist Controls ──────────────────────────────────────────────

_controls = None

def init_controls(controls_service):
    global _controls
    _controls = controls_service


class PauseRequest(BaseModel):
    message: str = "Your therapist has paused the session."

class DisclosureRequest(BaseModel):
    max_layer: int

class InjectContextRequest(BaseModel):
    context: str

class TherapistMessageRequest(BaseModel):
    message: str


@router.get("/user/{user_id}/controls")
async def get_controls(user_id: str):
    """Get current therapist control state (polled by game frontend)."""
    if not _controls:
        return {"paused": False, "max_disclosure_layer": 4}
    try:
        return _controls.get_controls(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/pause")
async def pause_game(user_id: str, req: PauseRequest):
    """Pause a user's game session."""
    if not _controls:
        raise HTTPException(status_code=503, detail="Controls not initialized")
    try:
        _controls.pause_game(user_id, req.message)
        return {"paused": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/resume")
async def resume_game(user_id: str):
    """Resume a paused game session."""
    if not _controls:
        raise HTTPException(status_code=503, detail="Controls not initialized")
    try:
        _controls.resume_game(user_id)
        return {"resumed": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/disclosure")
async def set_disclosure(user_id: str, req: DisclosureRequest):
    """Set max disclosure layer (1-4)."""
    if not _controls:
        raise HTTPException(status_code=503, detail="Controls not initialized")
    try:
        _controls.set_max_disclosure(user_id, req.max_layer)
        return {"max_layer": req.max_layer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/inject-context")
async def inject_context(user_id: str, req: InjectContextRequest):
    """Inject context for the user's next game session."""
    if not _controls:
        raise HTTPException(status_code=503, detail="Controls not initialized")
    try:
        _controls.inject_context(user_id, req.context)
        return {"injected": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/user/{user_id}/therapist-message")
async def send_therapist_message(user_id: str, req: TherapistMessageRequest):
    """Send a message to the user through the game."""
    if not _controls:
        raise HTTPException(status_code=503, detail="Controls not initialized")
    try:
        _controls.send_message(user_id, req.message)
        return {"sent": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/control-log")
async def get_control_log(user_id: str):
    """Get therapist control action audit log."""
    if not _controls:
        return []
    try:
        return _controls.get_log(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Health ──────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """Dashboard service health check."""
    return {
        "status": "healthy" if _dashboard else "not_initialized",
        "dashboard": _dashboard is not None,
        "therapy_service": _therapy_service is not None,
        "controls": _controls is not None,
    }
