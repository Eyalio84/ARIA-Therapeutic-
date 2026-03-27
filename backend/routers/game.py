"""
Game API Router — /api/game/* endpoints.

Connects the frontend to the game engine services:
- Interview flow (start, answer, expand_mirror)
- Game generation (interview → game config)
- Gameplay (start, action, save)
- Static page serving
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dataclasses import asdict
import os

router = APIRouter(prefix="/api/game", tags=["game"])

# Services — injected by main
_interview_engine = None
_generator = None
_runtime = None
_therapy_service = None
_kg_bridge = None


def init_services(interview_engine, generator, runtime, therapy_service=None, kg_bridge=None):
    global _interview_engine, _generator, _runtime, _therapy_service, _kg_bridge
    _interview_engine = interview_engine
    _generator = generator
    _runtime = runtime
    _therapy_service = therapy_service
    _kg_bridge = kg_bridge


# ── Request Models ──────────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    user_id: str
    depth: str = "standard"
    vibe: str = "build_cool"

class AnswerRequest(BaseModel):
    user_id: str
    answer: str

class MirrorExpandRequest(BaseModel):
    user_id: str

class GenerateRequest(BaseModel):
    user_id: str
    synthesis: Dict[str, Any]

class PlayStartRequest(BaseModel):
    user_id: str

class ActionRequest(BaseModel):
    user_id: str
    action: str
    target: str = ""

class SaveRequest(BaseModel):
    user_id: str

class CartridgeLoadRequest(BaseModel):
    user_id: str
    cartridge_id: str

class SnapshotSaveRequest(BaseModel):
    user_id: str
    game_id: str
    cartridge_id: Optional[str] = None
    narratives: list = []
    transcript: list = []
    aria_context: Optional[str] = None
    key_events: list = []
    session_state: Optional[Dict[str, Any]] = None  # interview trail, theme, mode, devhub

class LoadSaveRequest(BaseModel):
    user_id: str
    save_id: str


# ── Persistence Endpoints (Unified Snapshot) ───────────────────

@router.get("/snapshot/{user_id}")
async def get_snapshot(user_id: str):
    """Get the complete game state from runtime — the single source of truth."""
    config = _runtime._configs.get(user_id)
    player = _runtime.get_state(user_id)
    if not config or not player:
        raise HTTPException(status_code=404, detail="No active game")

    return {
        "config": config.to_dict(),
        "player": _runtime.save_state(user_id),
        "map": _runtime._get_player_map(user_id),
        "available_actions": _runtime._get_available_actions(user_id),
    }


@router.post("/save-full")
async def save_full_game(req: SnapshotSaveRequest):
    """Save complete game snapshot — pulls player state from runtime."""
    import time as _time
    config = _runtime._configs.get(req.user_id)
    player = _runtime.get_state(req.user_id)
    if not config or not player:
        raise HTTPException(status_code=404, detail="No active game to save")

    from services.persistence import GamePersistence
    p = GamePersistence(req.user_id)

    # Get the full player state from runtime (the source of truth)
    player_snapshot = _runtime.save_state(req.user_id)
    current_loc = None
    for loc in config.locations:
        if loc.id == player.location_id:
            current_loc = loc.name
            break

    save_id = f"save_{req.game_id}_{int(_time.time())}"
    p.save_game(
        save_id=save_id,
        game_id=req.game_id,
        cartridge_id=req.cartridge_id,
        title=config.title,
        protagonist=config.protagonist_name,
        config_json=config.to_dict(),
        player_json=player_snapshot,
        narratives=req.narratives,
        location=current_loc,
        turn_count=player.turn_count,
        stats={
            "courage": player.variables.get("courage", 0),
            "trust": player.variables.get("trust", 0),
            "items": len(player.inventory),
        },
        session_state=req.session_state,
    )
    if req.transcript:
        p.save_transcript(req.game_id, req.transcript)
    if req.aria_context:
        p.save_aria_context(req.game_id, req.aria_context, req.key_events)
    return {"save_id": save_id, "saved": True}


@router.get("/saves/{user_id}")
async def list_saves(user_id: str):
    """List all saved games for a user."""
    from services.persistence import GamePersistence
    p = GamePersistence(user_id)
    return {"saves": p.list_saves()}


@router.post("/load-save")
async def load_save(req: LoadSaveRequest):
    """Load and restore a saved game completely."""
    from services.persistence import GamePersistence
    p = GamePersistence(req.user_id)
    save = p.load_save(req.save_id)
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    try:
        # Step 1: Rebuild config from cartridge OR use saved config
        cartridge_id = save.get("cartridge_id")
        config = None

        # Try cartridge first (generates fresh quests/NPCs)
        if cartridge_id:
            from data.prebuilt_games import get_cartridge
            from data.clinical_cartridges import get_clinical_cartridge
            cart = get_cartridge(cartridge_id) or get_clinical_cartridge(cartridge_id)
            if cart:
                try:
                    config = _generator.generate(cart["synthesis"], use_gemini=False)
                except Exception:
                    pass

        # Fall back to saved config (always works — the config was saved at save time)
        if not config:
            saved_config = save.get("config") or save.get("state", {})
            if saved_config and isinstance(saved_config, dict):
                from services.game_generator import GameConfig
                try:
                    config = GameConfig.from_dict(saved_config)
                except Exception:
                    # Last resort: re-generate from saved config dict via generator
                    config = _generator._build_config_from_dict(saved_config)

        if not config:
            raise HTTPException(status_code=500, detail="Cannot rebuild game config")

        # Step 2: Restore full player state via runtime.restore_state
        player_data = save.get("player_state") or save.get("state", {})
        if player_data and isinstance(player_data, dict):
            # Clean up any keys that aren't in PlayerState
            valid_keys = {
                "location_id", "inventory", "variables", "visited_locations",
                "active_quest", "active_stage", "completed_quests", "completed_stages",
                "npc_interactions", "choices_log", "turn_count", "session_start_time",
                "ending_reached",
            }
            clean_state = {k: v for k, v in player_data.items() if k in valid_keys}
            if "location_id" not in clean_state:
                clean_state["location_id"] = config.starting_location
            action = _runtime.restore_state(req.user_id, config, clean_state)
        else:
            # No saved player state — start fresh
            action = _runtime.load_game(req.user_id, config)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

    # Step 3: Get the restored state as a complete snapshot
    restored_player = _runtime.save_state(req.user_id)
    restored_map = _runtime._get_player_map(req.user_id)
    restored_actions = _runtime._get_available_actions(req.user_id)

    # Step 4: Load transcript and aria context
    transcript = p.load_transcript(save["game_id"])
    aria_ctx = p.load_aria_context(save["game_id"])

    # Step 5: Get current quest choices from runtime
    restored_choices = []
    try:
        player_obj = _runtime.get_state(req.user_id)
        if player_obj and player_obj.active_quest and player_obj.active_stage:
            for q in config.quests:
                if q.id == player_obj.active_quest:
                    for s in q.stages:
                        if s.id == player_obj.active_stage:
                            restored_choices = [{"id": c.id, "text": c.text} for c in s.choices]
    except Exception:
        pass

    return {
        "save_id": save["save_id"],
        "game_id": save["game_id"],
        "cartridge_id": save.get("cartridge_id"),
        "title": save["title"],
        "config": config.to_dict(),
        "player": restored_player,
        "map": restored_map,
        "available_actions": restored_actions,
        "choices": restored_choices,
        "narratives": save.get("narratives", []),
        "transcript": transcript,
        "aria_context": aria_ctx,
        "session_state": save.get("session_state", {}),
        "turn_count": restored_player.get("turn_count", 0),
        "location": save.get("location"),
    }


@router.delete("/saves/{user_id}/{save_id}")
async def delete_save(user_id: str, save_id: str):
    """Delete a saved game."""
    from services.persistence import GamePersistence
    p = GamePersistence(user_id)
    deleted = p.delete_save(save_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Save not found")
    return {"deleted": True}


# ── Cartridge Endpoints ────────────────────────────────────────

@router.get("/cartridges")
async def list_cartridges():
    """List available pre-built game cartridges (story + clinical)."""
    from data.prebuilt_games import list_cartridges as _list
    from data.clinical_cartridges import list_clinical_cartridges
    return {
        "cartridges": _list(),
        "clinical": list_clinical_cartridges(),
    }


@router.post("/cartridges/load")
async def load_cartridge(req: CartridgeLoadRequest):
    """Load a pre-built game, bypassing the interview."""
    from data.prebuilt_games import get_cartridge
    from data.clinical_cartridges import get_clinical_cartridge
    cart = get_cartridge(req.cartridge_id) or get_clinical_cartridge(req.cartridge_id)
    if not cart:
        raise HTTPException(status_code=404, detail=f"Cartridge '{req.cartridge_id}' not found")
    try:
        config = _generator.generate(cart["synthesis"], use_gemini=False)
        _runtime.load_game(req.user_id, config)
        result = config.to_dict()
        # Include narrator config for per-game voice/personality
        if "narrator" in cart:
            result["narrator"] = cart["narrator"]
        result["cartridge_id"] = req.cartridge_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voice-config")
async def voice_config():
    """Return Gemini API key for voice (local testing only)."""
    key_path = "/storage/emulated/0/Download/perplexity/gemini.txt"
    try:
        with open(key_path) as f:
            key = f.read().strip()
        return {"apiKey": key, "model": "models/gemini-2.5-flash-native-audio-preview-12-2025"}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Gemini API key not found")


# ── Interview Endpoints ─────────────────────────────────────────

@router.post("/interview/start")
async def interview_start(req: InterviewStartRequest):
    """Start a new interview."""
    try:
        # Get KG data for personalization if available
        kg_data = None
        if _therapy_service:
            try:
                user_state = _therapy_service.get_user_state(req.user_id)
                kg_data = {
                    "media": user_state.get("all_nodes", {}).get("media", []),
                    "preferences": [n.get("name", "") for n in user_state.get("all_nodes", {}).get("media", [])],
                }
            except Exception:
                pass

        result = _interview_engine.start_interview(
            req.user_id, req.depth, req.vibe, kg_data
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/answer")
async def interview_answer(req: AnswerRequest):
    """Submit an answer and get the next question."""
    try:
        result = _interview_engine.answer_question(req.user_id, req.answer)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interview/expand_mirror")
async def interview_expand_mirror(req: MirrorExpandRequest):
    """User tapped 'Tell me more' on a mirror bubble."""
    try:
        result = _interview_engine.expand_mirror(req.user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Generation Endpoint ─────────────────────────────────────────

@router.post("/generate")
async def generate_game(req: GenerateRequest):
    """Generate a game config from interview synthesis."""
    try:
        config = _generator.generate(req.synthesis, use_gemini=False)

        # Store config for gameplay
        _runtime.load_game(req.user_id, config)

        return config.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Gameplay Endpoints ───────────────────────────────────────────

@router.post("/play/start")
async def play_start(req: PlayStartRequest):
    """Start playing a generated game."""
    try:
        # Game should already be loaded via /generate
        player = _runtime.get_state(req.user_id)
        if not player:
            raise HTTPException(status_code=404, detail="No game loaded. Generate a game first.")

        config = _runtime._configs.get(req.user_id)
        location = _runtime._get_location(config, player.location_id)

        return {
            "action_type": "start",
            "narrative": config.starting_narrative,
            "location": _runtime._location_dict(location) if location else None,
            "available_actions": _runtime._get_available_actions(req.user_id),
            "map_update": _runtime._get_player_map(req.user_id),
            "turn_count": 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/play/action")
async def play_action(req: ActionRequest):
    """Process a player action."""
    try:
        import traceback as _tb
        result = _runtime.process_action(req.user_id, req.action, req.target)

        # Feed game events to therapy KG via bridge
        bridge_result = None
        if _kg_bridge:
            player = _runtime.get_state(req.user_id)
            player_dict = _runtime.save_state(req.user_id) if player else {}
            try:
                result_dict = {
                    "action_type": result.action_type,
                    "narrative": result.narrative,
                    "location": result.location,
                    "npc": getattr(result, 'npc', None),
                    "item": getattr(result, 'item', None),
                    "quest_update": result.quest_update,
                    "state_changes": result.state_changes,
                    "mirror_moment": result.mirror_moment,
                    "mirror_text": result.mirror_text,
                    "ending": result.ending if isinstance(result.ending, dict) else (asdict(result.ending) if result.ending and hasattr(result.ending, '__dataclass_fields__') else None),
                    "kg_events": result.kg_events,
                }
                bridge_result = _kg_bridge.process_action_result(
                    req.user_id, "current", result_dict, player_dict
                )
            except Exception as bridge_err:
                print(f"KG bridge error (non-fatal): {bridge_err}")

        response = {
            "action_type": result.action_type,
            "narrative": result.narrative,
            "location": result.location,
            "choices": result.choices,
            "state_changes": result.state_changes,
            "available_actions": result.available_actions,
            "map_update": result.map_update,
            "mirror_moment": result.mirror_moment,
            "mirror_text": result.mirror_text,
            "is_rest_point": result.is_rest_point,
            "quest_update": result.quest_update,
            "turn_count": _runtime.get_state(req.user_id).turn_count if _runtime.get_state(req.user_id) else 0,
        }

        if result.ending:
            response["ending"] = result.ending

        # Include any newly earned achievements from bridge
        if bridge_result and bridge_result.get("achievements"):
            response["new_achievements"] = bridge_result["achievements"]

        return response
    except Exception as e:
        _tb.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/play/save")
async def play_save(req: SaveRequest):
    """Save current game state."""
    try:
        state = _runtime.save_state(req.user_id)
        return {"saved": True, "state_summary": {
            "location": state.get("location_id", ""),
            "turn_count": state.get("turn_count", 0),
            "quests_completed": len(state.get("completed_quests", [])),
        }}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Scene Image ──────────────────────────────────────────────────

class SceneImageRequest(BaseModel):
    location_name: str
    location_description: str = ""
    atmosphere: str = ""
    mood_color: str = ""
    time_of_day: str = "day"
    location_id: str = ""

@router.post("/scene-image")
async def generate_scene_image(req: SceneImageRequest):
    """Generate or retrieve a cached scene image for a location."""
    try:
        from services.scene_image import SceneImageService
        svc = SceneImageService()
        result = svc.generate_scene(
            location_name=req.location_name,
            location_description=req.location_description,
            atmosphere=req.atmosphere,
            mood_color=req.mood_color,
            time_of_day=req.time_of_day,
            location_id=req.location_id,
        )
        if not result:
            raise HTTPException(status_code=503, detail="Image generation unavailable")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Device-Adaptive Gameplay ─────────────────────────────────────

@router.get("/device-context")
async def get_device_context():
    """Get device state for adaptive gameplay (battery, temp, time)."""
    try:
        from services.device_state import get_state
        state = get_state()
        if not state:
            return {"available": False}

        import datetime
        hour = datetime.datetime.now().hour
        if 5 <= hour < 7:
            time_of_day = "dawn"
        elif 7 <= hour < 18:
            time_of_day = "day"
        elif 18 <= hour < 21:
            time_of_day = "dusk"
        else:
            time_of_day = "night"

        return {
            "available": True,
            "battery_pct": state.battery_pct,
            "is_charging": state.battery_charging,
            "is_low_battery": state.is_low_battery,
            "is_hot": state.is_hot,
            "needs_conservation": state.needs_conservation,
            "cpu_temp": state.cpu_temp,
            "ram_free_mb": state.ram_available_mb,
            "time_of_day": time_of_day,
            "hour": hour,
            "adaptations": _compute_adaptations(state, hour),
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


def _compute_adaptations(state, hour: int) -> Dict[str, Any]:
    """Compute gameplay adaptations based on device state + time."""
    adaptations = {}

    # Battery-driven narrative
    if state.is_low_battery:
        adaptations["session_hint"] = "short"
        adaptations["narrative_mod"] = "The air grows still. Perhaps a good place to rest and save your progress."
        adaptations["suggest_save"] = True

    # Temperature-driven
    if state.is_hot:
        adaptations["suggest_rest"] = True
        adaptations["narrative_mod"] = adaptations.get("narrative_mod", "") + " A cooling breeze drifts through the area."

    # Time-of-day narrative flavor
    if hour >= 22 or hour < 5:
        adaptations["time_narrative"] = "The world grows quiet. Stars wheel overhead."
        adaptations["mood_shift"] = "dreamy"
        adaptations["suggest_dream_sequence"] = True
    elif 5 <= hour < 7:
        adaptations["time_narrative"] = "Dawn light filters through, painting everything gold."
        adaptations["mood_shift"] = "hopeful"
    elif 18 <= hour < 22:
        adaptations["time_narrative"] = "The light softens. Shadows grow longer."
        adaptations["mood_shift"] = "contemplative"

    # RAM conservation
    if state.ram_available_mb < 300:
        adaptations["reduce_effects"] = True

    return adaptations


# ── Page Serving ─────────────────────────────────────────────────

@router.get("/", response_class=HTMLResponse)
async def serve_game_page():
    """Serve the game frontend."""
    template_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "game.html")
    with open(template_path, "r") as f:
        return HTMLResponse(content=f.read())
