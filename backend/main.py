#!/usr/bin/env python3
"""
Aria V2.0 Backend — FastAPI server.

Combines:
- NAI IntentGraph engine (4-weight hybrid KG search)
- 4D Persona Engine (computed, not declared)
- Introspection Engine (output validation)

Usage:
    python3 main.py
    # or: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import sys
from pathlib import Path

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT, CORS_ORIGINS, CTX_KG_PATH, CTX_EMBEDDINGS_PATH
from services.nai_service import NAIService
from services.persona_service import PersonaService
from services.introspection import IntrospectionService
from services.response_service import ResponseService
from services.ctx_kg_service import CtxKGService
from routers import aria, products, kg, game
from services.game_interview import GameInterviewEngine
from services.game_generator import GameGenerator
from services.game_runtime import GameRuntime

# ── App Setup ────────────────────────────────────────────────────────

app = FastAPI(
    title="Aria V2.0",
    description="4D Persona + NAI Backend for Jewelry Store",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Service Initialization ───────────────────────────────────────────

nai_service = NAIService()
persona_service = PersonaService()
introspection_service = IntrospectionService()

# Architectural KG (optional — graceful degradation if ctx-kg.db missing)
ctx_kg_service = CtxKGService(str(CTX_KG_PATH), str(CTX_EMBEDDINGS_PATH))
if ctx_kg_service.available:
    print(f"  Ctx KG: {ctx_kg_service.get_stats()}")
else:
    print("  Ctx KG: not available (run ctx-to-kg.py to build)")
    ctx_kg_service = None

response_service = ResponseService(nai_service, persona_service, introspection_service, ctx_kg=ctx_kg_service)

# Initialize NAI (loads KG)
nai_service.initialize()

# Wire services into routers
aria.init_services(nai_service, persona_service, response_service, introspection_service)
products.init_services(nai_service)
kg.init_services(nai_service)

# Game services
_gemini_key_path = "/storage/emulated/0/Download/perplexity/gemini.txt"
_gemini_key = ""
try:
    with open(_gemini_key_path) as f:
        _gemini_key = f.read().strip()
except FileNotFoundError:
    print("  Game: Gemini key not found — generator will use templates")

interview_engine = GameInterviewEngine()
game_generator = GameGenerator(gemini_api_key=_gemini_key)
game_runtime = GameRuntime()
game.init_services(interview_engine, game_generator, game_runtime)

# ── Register Routers ─────────────────────────────────────────────────

app.include_router(aria.router)
app.include_router(products.router)
app.include_router(kg.router)
app.include_router(game.router)


@app.get("/")
async def root():
    return {
        "name": "Aria V2.0",
        "description": "4D Persona + NAI Backend for Jewelry Store",
        "endpoints": {
            "query": "POST /api/aria/query",
            "state": "POST /api/aria/state",
            "respond": "POST /api/aria/respond",
            "validate": "POST /api/aria/validate",
            "memory": "POST /api/aria/memory",
            "health": "GET /api/aria/health",
            "products": "GET /api/products",
            "product": "GET /api/products/{id}",
            "related": "GET /api/products/{id}/related",
        }
    }


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("Starting Aria V2.0 Backend...")
    print(f"  NAI KG: {nai_service.get_stats()}")
    print(f"  Server: http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)
