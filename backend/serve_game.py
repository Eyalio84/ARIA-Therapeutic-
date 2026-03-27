#!/usr/bin/env python3
"""
Quick launcher for the Therapeutic Narrative Game Engine.
Serves the game frontend + all API endpoints on port 8080.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from services.game_interview import GameInterviewEngine
from services.game_generator import GameGenerator
from services.game_runtime import GameRuntime
from services.therapy_service import TherapyService
from services.therapist_dashboard import TherapistDashboardService
from services.game_kg_bridge import GameKGBridge
from services.therapist_controls import TherapistControls
from routers.game import router as game_router, init_services as init_game
from routers.therapy import router as therapy_router, init_services as init_therapy
from routers.termux import router as termux_router
from routers.computer_use import router as computer_router
from routers.dashboard import router as dashboard_router, init_services as init_dashboard
from routers.docs import router as docs_router

# ── Init Services ───────────────────────────────────────────────
interview_engine = GameInterviewEngine()
generator = GameGenerator()
runtime = GameRuntime()
therapy_service = TherapyService()
dashboard = TherapistDashboardService()
kg_bridge = GameKGBridge(therapy_service, dashboard)
therapist_controls = TherapistControls()

# ── FastAPI App ─────────────────────────────────────────────────
app = FastAPI(title="Aria — Therapeutic Narrative Game Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Shared aiohttp session lifecycle
@app.on_event("startup")
async def startup_http():
    from services.http_client import get_session
    await get_session()
    print("aiohttp session pool ready")

@app.on_event("shutdown")
async def shutdown_http():
    from services.http_client import close_session
    await close_session()

# Wire routers
init_game(interview_engine, generator, runtime, therapy_service, kg_bridge)
init_therapy(therapy_service)
init_dashboard(dashboard, therapy_service)
from routers.dashboard import init_controls
init_controls(therapist_controls)
app.include_router(game_router)
app.include_router(therapy_router)
app.include_router(dashboard_router)
app.include_router(termux_router)
app.include_router(computer_router)
app.include_router(docs_router)

# Serve game page at root
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def root():
    template_path = os.path.join(os.path.dirname(__file__), "templates", "game.html")
    with open(template_path) as f:
        return HTMLResponse(content=f.read())

@app.on_event("startup")
async def startup():
    from services.device_state import start_polling
    await start_polling(30.0)

@app.get("/health")
async def health():
    return {"status": "running", "services": {
        "interview": True, "generator": True, "runtime": True,
        "therapy": True, "dashboard": True,
    }}


# ── Local FunctionGemma Inference ────────────────────────────────

_fg_engine = None

@app.post("/api/functiongemma/infer")
async def functiongemma_infer(request: dict):
    """Local FunctionGemma inference — replaces Gemini Live function calling."""
    global _fg_engine
    import asyncio

    text = request.get("text", "")
    if not text:
        return {"error": "Missing 'text' field"}

    # Lazy load
    if _fg_engine is None:
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts"))
            from functiongemma_inference import FunctionGemmaEngine
            _fg_engine = FunctionGemmaEngine()
            _fg_engine.load()
        except FileNotFoundError as e:
            return {"error": str(e), "hint": "Run scripts/download_functiongemma.py first"}

    # Run inference in thread pool (model is CPU-bound)
    result = await asyncio.get_event_loop().run_in_executor(None, _fg_engine.infer, text)
    return result

@app.post("/api/functiongemma/unload")
async def functiongemma_unload():
    """Unload FunctionGemma to free RAM."""
    global _fg_engine
    if _fg_engine:
        _fg_engine.unload()
        _fg_engine = None
        return {"status": "unloaded"}
    return {"status": "not loaded"}

@app.get("/api/functiongemma/status")
async def functiongemma_status():
    """Check if FunctionGemma is loaded."""
    return {
        "loaded": _fg_engine is not None and _fg_engine.model is not None,
        "model_path": _fg_engine.model_path if _fg_engine else None,
    }


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8092
    print(f"Aria Game Engine starting on http://0.0.0.0:{port}")
    print(f"Open in browser: http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
