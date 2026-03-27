<!-- last-verified: 2026-03-25 -->

# routers/ — Full Reference

| Field | Value |
|---|---|
| **Library (path)** | `backend/routers/` |
| **Purpose** | FastAPI router modules — each file defines API endpoints for a domain (game, therapy, dashboard, KG, products, docs, device, computer use, Aria core) |
| **Framework / stack** | Python · FastAPI · Pydantic |
| **Entry point** | `__init__.py` (empty); routers are registered by `main.py` / `serve_game.py` |
| **External dependencies** | `services.*` (game engine, therapy, persistence, computer use, device state, termux, scene image), `data.*` (prebuilt/clinical cartridges), NAI (IntentGraph/KG) |
| **File count** | 10 |
| **Architecture style** | Service-injected routers — each module exposes an `APIRouter` and an `init_services()` function; business logic lives in `services/` |

## File Tree

```
routers/
├── __init__.py           # Empty package marker
├── aria.py               # Aria core: NAI search, 4D persona, respond, validate, memory
├── computer_use.py       # Web fetch, search, image analysis, self-test
├── dashboard.py          # Therapist dashboard: moods, flags, notes, achievements, controls
├── docs.py               # Documentation viewer: list, read, write, API index
├── game.py               # Game engine: interview, generation, gameplay, saves, cartridges
├── kg.py                 # KG Studio CRUD: nodes, edges, import/export, React Flow
├── products.py           # Product catalog: list, detail, related products
├── termux.py             # Termux device APIs: battery, torch, SMS, camera, sensors
└── therapy.py            # Therapy pipeline: sessions, respond, validate, user KG
```

## Module Index

---

<a id="__init__"></a>

### routers/__init__.py

**Empty package init file. Marks `routers/` as a Python package.**

- **Connects to:** nothing

---

<a id="aria"></a>

### routers/aria.py

**Aria core API router (`/api/aria/*`). Exposes NAI knowledge-graph search, 4D persona state computation, response generation with persona + NAI retrieval, introspection validation, and session memory.**

- `init_services()` receives `nai`, `persona`, `response_svc`, `introspection` from main
- Endpoints: `/query`, `/state`, `/respond`, `/validate`, `/memory`, `/health`
- Request models: `QueryRequest`, `StateRequest`, `RespondRequest`, `ValidateRequest`, `MemoryRequest`
- **Connects to:** NAI service (IntentGraph), PersonaEngine (4D), ResponseService, IntrospectionService — all injected at startup

---

<a id="computer_use"></a>

### routers/computer_use.py

**Computer-use router (`/api/computer/*`). Provides URL fetching, web search via Gemini with Google Search grounding, image analysis via Gemini Vision, and a game-engine self-test.**

- Endpoints: `/fetch`, `/search`, `/analyze-image`, `/self-test`
- Uses lazy imports from `services.computer_use_service`
- **Connects to:** `services.computer_use_service` (fetch_url, web_search, analyze_image, self_test_game)

---

<a id="dashboard"></a>

### routers/dashboard.py

**Therapist dashboard router (`/api/dashboard/*`). Compiles per-user clinical dashboards with choice timelines, mirror-bubble analytics, antagonist analysis, mood tracking, flagged moments, session notes, achievements, story recaps, and real-time therapist controls (pause, resume, disclosure limits, context injection, messaging).**

- `init_services()` receives `dashboard_service` and optional `therapy_service`
- `init_controls()` receives `controls_service` for therapist live controls
- Request models: `MoodRequest`, `FlagRequest`, `AnnotateRequest`, `NoteRequest`, `AchievementRequest`, `PauseRequest`, `DisclosureRequest`, `InjectContextRequest`, `TherapistMessageRequest`
- 20+ endpoints covering all 8 dashboard features plus therapist controls and health
- **Connects to:** `DashboardService`, `TherapyService` (for KG access), `ControlsService` — all injected at startup

---

<a id="docs"></a>

### routers/docs.py

**Documentation API router (`/api/docs/*`). Serves a categorized registry of project markdown files with list, read, and write operations, plus an auto-generated API endpoint index via router introspection.**

- `DOC_REGISTRY` holds 4 categories (Architecture, Therapeutic, Planning, Training) with 17 doc entries
- Resolves relative paths against `PROJECT_ROOT`; path-traversal guard prevents reads outside project
- Endpoints: `/list`, `/read/{doc_id}`, `/write/{doc_id}`, `/api-index`
- **Connects to:** filesystem (project markdown files), `importlib` for dynamic router introspection in `/api-index`

---

<a id="game"></a>

### routers/game.py

**Game engine router (`/api/game/*`). Orchestrates the full game lifecycle — interview flow, game generation from synthesis, gameplay actions, save/load persistence, pre-built cartridge loading, scene image generation, device-adaptive gameplay, and voice config.**

- `init_services()` receives `interview_engine`, `generator`, `runtime`, optional `therapy_service` and `kg_bridge`
- Request models: `InterviewStartRequest`, `AnswerRequest`, `MirrorExpandRequest`, `GenerateRequest`, `PlayStartRequest`, `ActionRequest`, `SaveRequest`, `CartridgeLoadRequest`, `SnapshotSaveRequest`, `LoadSaveRequest`, `SceneImageRequest`
- Persistence: `/snapshot/{user_id}`, `/save-full`, `/saves/{user_id}`, `/load-save`, `/saves/{user_id}/{save_id}` (DELETE)
- Cartridges: `/cartridges`, `/cartridges/load`
- Interview: `/interview/start`, `/interview/answer`, `/interview/expand_mirror`
- Gameplay: `/generate`, `/play/start`, `/play/action`, `/play/save`
- Extras: `/scene-image`, `/device-context`, `/voice-config`, `/` (HTML page)
- `_compute_adaptations()` adjusts narrative based on battery, temperature, time-of-day, and RAM
- **Connects to:** `InterviewEngine`, `GameGenerator`, `GameRuntime`, `TherapyService`, `KGBridge`, `services.persistence.GamePersistence`, `services.scene_image.SceneImageService`, `services.device_state`, `data.prebuilt_games`, `data.clinical_cartridges`

---

<a id="kg"></a>

### routers/kg.py

**KG Studio CRUD router (`/api/kg/*`). Full create/read/update/delete for knowledge-graph nodes and edges, bulk import/export, and React Flow-formatted graph retrieval with auto-computed grid positions.**

- `init_services()` receives `nai` (the NAI/IntentGraph instance with SQLite connection)
- Request models: `NodeCreate`, `NodeUpdate`, `EdgeCreate`, `EdgeDelete`, `ImportData`
- Endpoints: `/graph`, `/nodes` (POST), `/nodes/{id}` (PUT/DELETE), `/edges` (POST/DELETE), `/import`, `/export`
- `_compute_positions()` arranges nodes in a type-grouped grid for React Flow
- Rebuilds BM25 index after every mutation
- **Connects to:** NAI service (SQLite `conn` for direct SQL), BM25 index rebuild

---

<a id="products"></a>

### routers/products.py

**Product catalog router (`/api/products/*`). Lists products with optional category filter, returns single-product detail enriched with KG neighbors (materials, care, pairings), and related-product lookups.**

- `init_services()` receives `nai`
- Endpoints: `/` (list), `/{product_id}` (detail), `/{product_id}/related`
- **Connects to:** NAI service (`get_products`, `get_product`, `get_neighbors`)

---

<a id="termux"></a>

### routers/termux.py

**Termux device API router (`/api/termux/*`). Exposes Android device capabilities — battery, flashlight, vibration, volume, notifications, clipboard, WiFi, GPS location, SMS, contacts, call log, sensors, and camera — to the frontend for Aria's Jarvis features.**

- No `init_services()`; uses lazy imports from `services.termux_service` and `services.device_state`
- 17 endpoints across device state, hardware controls, notifications, clipboard, network, communication, sensors, and camera
- **Connects to:** `services.termux_service`, `services.device_state`

---

<a id="therapy"></a>

### routers/therapy.py

**Therapy pipeline router (`/api/therapy/*`). Manages therapy sessions (start/end), processes user messages through the safety + persona + voice pipeline, validates responses, and provides full user-state and KG access with therapist editing capabilities.**

- `init_services()` receives `therapy_service`
- Request models: `SessionStartRequest`, `SessionEndRequest`, `RespondRequest`, `ValidateRequest`, `MediaRequest`, `ConcernRequest`, `InsightRequest`, `NodeUpdateRequest`, `EdgeRequest`
- Endpoints: `/session/start`, `/session/end`, `/respond`, `/validate`, `/user/{id}/state`, `/user/{id}/graph`, `/user/{id}/media`, `/user/{id}/concern`, `/insight`, `/user/{id}/node/{nid}` (PUT), `/user/{id}/edge`, `/health`
- `/respond` returns safety check result, 4D persona state, voice instruction, concerns, media analogies, coping strategies, and session handoff prompt
- **Connects to:** `TherapyService` (injected)

---

## External Dependencies Summary

### Services (injected at startup)

| Service | Purpose |
|---|---|
| NAI / IntentGraph | Knowledge-graph search, BM25 indexing, product/node queries |
| PersonaEngine (4D) | Computes 4D persona state from conversation context |
| ResponseService | Generates response context combining persona + NAI retrieval |
| IntrospectionService | Validates output against persona state |
| TherapyService | Therapy pipeline — sessions, safety, KG, concerns, insights |
| DashboardService | Compiles therapist dashboard analytics and per-user data |
| ControlsService | Live therapist controls — pause, disclosure limits, messaging |
| InterviewEngine | Drives the interview flow before game generation |
| GameGenerator | Converts interview synthesis into a playable game config |
| GameRuntime | Manages active game state, actions, saves |
| KGBridge | Feeds game events into the therapy knowledge graph |
| GamePersistence | Save/load full game snapshots to disk |
| SceneImageService | Generates or caches scene images for game locations |
| computer_use_service | URL fetching, web search (Gemini), image analysis |
| termux_service | Android device API wrappers (Termux) |
| device_state | Aggregated device status (battery, temp, RAM) |

### Libraries

| Library | Purpose |
|---|---|
| FastAPI | Web framework — `APIRouter`, `HTTPException` |
| Pydantic | Request/response model validation (`BaseModel`, `Field`) |
| dataclasses | `asdict` for converting dataclass results to dicts |
| os | Filesystem path resolution (docs router) |
| math | Grid position computation (KG router) |
| importlib / inspect | Dynamic router introspection for API index (docs router) |
| base64 | Encoding camera photo output (termux router) |
| time / datetime | Timestamps for saves, time-of-day adaptations (game router) |
