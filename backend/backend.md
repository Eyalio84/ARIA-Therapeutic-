<!-- last-verified: 2026-03-25 -->

# backend/ — Full Reference

| Field | Value |
|---|---|
| **Library** | `backend/` |
| **Purpose** | FastAPI backend for Aria V2.0 — dual-server architecture serving a jewelry brand assistant (port 8000) and a therapeutic narrative game engine (port 8080) |
| **Framework / stack** | Python 3, FastAPI, Uvicorn, Pydantic, aiohttp, Google Gemini API, SQLite |
| **Entry points** | `main.py` (brand server), `serve_game.py` (game server) |
| **External dependencies** | Gemini API, WHO ICD-11 API, termux-api (Android), NAI IntentGraph engine, FunctionGemma model |
| **File count** | 4 root-level Python files + 6 subfolders |
| **Architecture style** | Service-oriented — routers delegate to services, services own business logic and data access |

---

## File Tree

```
backend/
├── config.py                  # Paths, API keys, brand identity, base prompt
├── main.py                    # FastAPI app — brand assistant server (port 8000)
├── serve_game.py              # FastAPI app — game engine server (port 8080)
├── requirements.txt           # Core deps: fastapi, uvicorn, pydantic
├── SESSION-2026-03-21-PLAN.md # Dev session plan (not source)
├── data/          (40 files)  # KG builders, JSON datasets, runtime SQLite DBs
├── persona/        (9 files)  # 4D persona dimension computers (brand + therapy)
├── routers/       (10 files)  # FastAPI route handlers for all API endpoints
├── services/      (21 files)  # Business logic — game, therapy, search, device
├── templates/      (1 file)   # game.html — self-contained game client SPA
└── tests/         (14 files)  # Comprehensive test suite — unit, integration, adversarial
```

---

## Module Index

<a id="config"></a>

### config.py

**Central configuration — paths, API keys, server settings, brand identity, and Aria's base system prompt.**

- Defines `BACKEND_DIR`, `DATA_DIR`, `JEWELRY_KG_PATH` path constants
- References external `NAI_DIR` and `PERSONA_DIR` for IntentGraph and 4D framework
- Loads `GEMINI_API_KEY` from environment
- Contains `ARIA_BASE_PROMPT` with brand voice, values, and guardrails

**Connects to:** imported by `main.py`, `services/nai_service`, `services/persona_service`, `services/response_service`

---

<a id="main"></a>

### main.py

**FastAPI application for the jewelry brand assistant — initializes NAI, Persona, Introspection, and Response services, wires them into aria/products/kg routers, serves on port 8000.**

- Creates `FastAPI` app with CORS middleware
- Instantiates and initializes `NAIService`, `PersonaService`, `IntrospectionService`, `ResponseService`
- Calls `init_services()` on `aria`, `products`, `kg` routers to inject dependencies
- Exposes root endpoint listing all available API paths

**Connects to:** `config` (settings), `services/nai_service`, `services/persona_service`, `services/introspection`, `services/response_service`, `routers/aria`, `routers/products`, `routers/kg`

---

<a id="serve_game"></a>

### serve_game.py

**FastAPI application for the therapeutic narrative game engine — initializes game, therapy, and dashboard services, wires 6 routers, serves game.html at root, includes FunctionGemma local inference endpoints, serves on port 8080.**

- Creates `FastAPI` app with CORS middleware and aiohttp session lifecycle
- Instantiates `GameInterviewEngine`, `GameGenerator`, `GameRuntime`, `TherapyService`, `TherapistDashboardService`, `GameKGBridge`, `TherapistControls`
- Wires `game`, `therapy`, `dashboard`, `termux`, `computer_use`, `docs` routers
- Serves `templates/game.html` at root
- Starts device state polling on startup
- Lazy-loads FunctionGemma for local inference at `/api/functiongemma/*`

**Connects to:** `services/game_interview`, `services/game_generator`, `services/game_runtime`, `services/therapy_service`, `services/therapist_dashboard`, `services/game_kg_bridge`, `services/therapist_controls`, `services/http_client`, `services/device_state`, `routers/game`, `routers/therapy`, `routers/dashboard`, `routers/termux`, `routers/computer_use`, `routers/docs`, `templates/game.html`

---

<a id="requirements"></a>

### requirements.txt

**Core Python dependencies — fastapi, uvicorn, pydantic.**

**Connects to:** used by pip for environment setup

---

## External Dependencies Summary

### APIs / External Services

| Service | Purpose |
|---|---|
| Google Gemini API | LLM for narrative generation, search, vision, Gemini Live voice |
| WHO ICD-11 API | Clinical disorder taxonomy lookups |
| termux-api | Android device capabilities (battery, camera, SMS, GPS) |
| FunctionGemma | Local function-calling inference model |

### Libraries

| Library | Purpose |
|---|---|
| FastAPI | Web framework for both servers |
| Uvicorn | ASGI server |
| Pydantic | Request/response validation |
| aiohttp | Async HTTP client for external API calls |
| SQLite | Knowledge graphs, game state, therapy data |
