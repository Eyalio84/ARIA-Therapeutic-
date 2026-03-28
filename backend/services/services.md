<!-- last-verified: 2026-03-28 -->

# services/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `backend/services/` |
| **Purpose** | Backend service layer — orchestrates game engine, therapy pipeline, device integration, persona computation, KG search, safety, persistence, and clinical dashboard |
| **Framework / stack** | Python 3, asyncio, aiohttp, sqlite3, urllib, Gemini API |
| **Entry point** | `response_service.py` (jewelry pipeline), `therapy_service.py` (therapy pipeline), `game_runtime.py` (game engine) |
| **External dependencies** | `data/build_therapy_kg.TherapyKG`, `persona/*` (4D dimension computers), `config` module, `nai/` (IntentGraphEngine, KGManager), `persona_engine` (PersonaEngine), Gemini API, Termux API, ICD-11 WHO API, aiohttp |
| **Component/file count** | 22 files (21 modules + `__init__.py`) |
| **Architecture style** | Service-oriented — stateless orchestrators wrapping domain engines, per-user SQLite persistence, singleton device polling, LLM-as-a-service via Gemini |

---

## File Tree

```
services/
  __init__.py                  # Empty package marker
  computer_use_service.py      # Web fetch, Gemini search, image analysis, self-test
  ctx_kg_service.py            # Architectural KG query — search, stats, Aria context injection
  device_state.py              # Cached device sensor polling (battery, thermal, RAM)
  game_generator.py            # Transforms interview synthesis into playable game config
  game_interview.py            # SFBT/OARS therapeutic interview engine
  game_kg_bridge.py            # Maps game events to therapy knowledge graph
  game_runtime.py              # Executes game config as playable narrative
  gemini_narrative.py          # LLM narrative generation for game engine
  http_client.py               # Shared aiohttp session with connection pooling
  icd11_service.py             # WHO ICD-11 API client with bulk import
  introspection.py             # Output validation against 4D persona state
  nai_service.py               # IntentGraph search over jewelry knowledge graph
  persistence.py               # Per-user SQLite game save/load/transcript
  persona_service.py           # 4D PersonaEngine wrapper with brand computers
  response_service.py          # Full Aria pipeline: retrieve, compute, build, validate
  scene_image.py               # Gemini Imagen scene generation with caching
  termux_service.py            # Async wrapper for termux-api Android commands
  therapist_controls.py        # Remote game pause, disclosure limits, messaging
  therapist_dashboard.py       # Clinical oversight: timelines, flags, achievements
  therapy_safety.py            # Crisis detection, hard blocks, response guardrails
  therapy_service.py           # Therapy pipeline orchestrator: safety, KG, 4D, context
```

---

## Component/Module Index

---

<a id="computer_use_service"></a>

### services/computer_use_service.py

**Web interaction and content analysis service — fetches URLs, performs Gemini-powered web search with grounding, analyzes images via Gemini Vision, and runs self-test suites against game API endpoints.**

- `_TextExtractor` HTML parser strips scripts/styles and extracts text (capped at 5K chars)
- `fetch_url()` async URL fetch with text extraction and title parsing
- `web_search()` Gemini API call with Google Search grounding tool
- `analyze_image()` Gemini Vision API for screenshot/image analysis
- `self_test_game()` runs 4 automated tests against game API (health, cartridges, gameplay, snapshot)

**Connects to:** Gemini API (external), game API endpoints (localhost:8095)

---

<a id="ctx_kg_service"></a>

### services/ctx_kg_service.py

**Architectural knowledge graph query service — loads ctx-kg.db (SQLite) and ctx_embeddings.json, provides hybrid search (text + embedding + graph traversal) and stats. Injected into ResponseService for Aria architectural context awareness. Graceful degradation if DB missing.**

- `CtxKGService(db_path, embeddings_path)` loads KG and embeddings at init
- `available` property indicates whether the KG loaded successfully
- `get_stats()` returns node/edge counts
- `search(query)` performs hybrid scoring — text match + embedding similarity + graph traversal
- Used by `main.py` to optionally inject into `ResponseService` via `ctx_kg=` parameter

**Connects to:** `ctx-kg.db` (SQLite, built by `scripts/ctx-to-kg.py`), `data/ctx_embeddings.json`

---

<a id="device_state"></a>

### services/device_state.py

**Cached aggregated device status — polls battery, thermal, RAM, and WiFi every 30 seconds and exposes adaptive properties (`is_hot`, `is_low_battery`, `needs_conservation`) for Aria behavior.**

- `DeviceState` dataclass with computed properties and `to_prompt_context()` for system prompt injection
- Singleton module-level state with background polling loop via `asyncio.create_task`
- Reads CPU temp from `/sys/class/thermal/` and RAM from `/proc/meminfo` directly

**Connects to:** `services.termux_service` (battery, wifi polling)

---

<a id="game_generator"></a>

### services/game_generator.py

**Transforms interview synthesis into a complete playable game config — builds locations, NPCs, items, quests with branching choices, endings, state variables, and hidden therapeutic mappings visible only to the therapist dashboard.**

- Dataclasses: `GameNPC`, `GameLocation`, `GameItem`, `QuestChoice`, `QuestStage`, `Quest`, `GameEnding`, `GameConfig`
- `GameGenerator` class with template-based generation (offline) and Gemini-enhanced mode (stub)
- Builds 5-8 locations, 3-5 NPCs, 5-10 items, 3 quest arcs, 4 endings from interview answers
- `GameConfig.from_dict()` reconstructs saved configs with nested quest/choice deserialization

**Connects to:** Gemini API (optional, for narrative enrichment), `game_interview.py` (consumes synthesis output)

---

<a id="game_interview"></a>

### services/game_interview.py

**Story-driven therapeutic interview engine — guides users through building a personalized game using SFBT + OARS patterns across five phases (Character, World, Story, Challenges, Choices) with three depth levels and three vibe modes.**

- `InterviewDepth` (Quick/Standard/Deep), `VibeMode` (build_cool/your_way/explore_together), `InterviewPhase` enums
- 31 interview questions across 6 phases, each with mirror weight, exit ramps, and KG seed hints
- `GameInterviewEngine` manages per-user `InterviewState`, delivers questions, detects emotional weight in answers, triggers mirror bubbles, and synthesizes answers into a game creation brief
- Emotional weight detection uses word count, personal pronouns, emotional vocabulary, and hesitation markers

**Connects to:** None (standalone engine; output consumed by `game_generator.py`)

---

<a id="game_kg_bridge"></a>

### services/game_kg_bridge.py

**Bridges game events to the therapy knowledge graph — every meaningful game action (choices, NPC interactions, quest completions, mirror moments, endings) writes nodes and edges to the user's therapy KG and triggers achievements and auto-flags.**

- `THERAPEUTIC_NOTE_MAP` maps choice notes to KG node types with intensity scores
- `FLAGGABLE_NOTES` and `ACHIEVEMENT_TRIGGERS` drive auto-flagging and achievement awarding
- `GameKGBridge` processes action results, runs safety checks on free text, handles session lifecycle events

**Connects to:** `data.build_therapy_kg.TherapyKG`, `therapist_dashboard.py` (flagging, achievements)

---

<a id="game_runtime"></a>

### services/game_runtime.py

**Executes a GameConfig as a playable narrative game — handles location navigation, NPC dialogue, item pickup/use, quest progression with branching choices, ending detection, session save/restore, and timed session rest points.**

- `PlayerState` dataclass with full serializable state (location, inventory, variables, quest progress, choices log)
- `GameAction` dataclass as the return type for every player action, including KG events and mirror moments
- `GameRuntime` engine processes 10+ action types (move, look, talk, take, use, choose, status, map, inventory, quest)
- Fuzzy matching on NPC names, item names, and directions; condition checking for locked locations

**Connects to:** `services.game_generator` (GameConfig and data structures), `services.therapy_safety.TherapySafetyService` (narrative safety checks)

---

<a id="gemini_narrative"></a>

### services/gemini_narrative.py

**LLM-powered narrative generation for the game engine — enriches location descriptions, generates dynamic NPC dialogue, creates quest narratives, powers session recaps, and generates mirror bubble reflections using Gemini API.**

- `GeminiNarrative` class with sync (`_call`) and async (`_acall` via aiohttp) API methods
- Provides both sync and async versions of all generation methods
- `check_narrative_safety()` delegates to `TherapySafetyService` for output screening

**Connects to:** Gemini API (external), `services.http_client` (aiohttp session), `services.therapy_safety.TherapySafetyService`

---

<a id="http_client"></a>

### services/http_client.py

**Shared aiohttp ClientSession with persistent connection pooling — eliminates repeated TLS handshakes (saves 50-200ms per request).**

**Connects to:** `aiohttp` (external library)

---

<a id="icd11_service"></a>

### services/icd11_service.py

**WHO ICD-11 API client — OAuth2 token management with auto-refresh, disorder lookup by code or name, search, and bulk import of Chapter 06 (Mental disorders) taxonomy into a local JSON cache.**

- `ICD11Service` handles credentials, token lifecycle, authenticated API calls, recursive subtree fetching with rate limiting
- Cached taxonomy saved to `data/psychology/icd11_mental_disorders.json`
- `import_icd11_mental_disorders()` convenience function for one-shot CLI import

**Connects to:** WHO ICD-11 API (external), local filesystem cache

---

<a id="introspection"></a>

### services/introspection.py

**Output validation against the 4D persona state — catches forbidden topics, identity corruption, brand misalignment, and emotional inconsistency before sending responses to users.**

- Three-layer validation: forbidden topic detection (hard block), identity consistency (critical), brand alignment (soft)
- Regex-based pattern matching for forbidden topics (politics, religion, adult content, violence, competitors, finance, injection attempts)
- Anti-identity markers detect persona corruption (identity denial, replacement, meta leak, role break)
- Emotional consistency check compares response tone against computed 4D mood state

**Connects to:** None (standalone validator; called by `response_service.py`)

---

<a id="nai_service"></a>

### services/nai_service.py

**Wraps IntentGraphEngine for jewelry knowledge graph search — provides natural language search using the 4-weight IntentGraph formula, product lookup, neighbor traversal, and KG statistics.**

- Lazy initialization: loads KG and builds search engine on first call
- Post-filters results by node type, enriches product results with price/stock/category
- `get_neighbors()` traverses KG edges for materials, care instructions, and pairings

**Connects to:** `nai.kg_manager` and `nai.intentgraph_engine` (external, via sys.path), `config.JEWELRY_KG_PATH`, SQLite jewelry KG database

---

<a id="persistence"></a>

### services/persistence.py

**Per-user SQLite game persistence — each user gets `data/users/{user_id}/game.db` with three tables (saves, transcripts, aria_context) for game state, play transcripts, and Aria session context.**

- `GamePersistence` class with auto-migration for schema changes
- Full save/load/delete for game state including config, player state, session state, and narratives
- Transcript storage with versioned entries and Aria context with companion bond tracking

**Connects to:** SQLite (stdlib), local filesystem (`data/users/`)

---

<a id="persona_service"></a>

### services/persona_service.py

**Wraps the 4D PersonaEngine with brand-specific dimension computers — computes persona state, generates system prompts with 4D injection, tracks trajectory, and predicts next position.**

- Integrates `BrandEmotionalComputer`, `BrandRelationalComputer`, `BrandLinguisticComputer`, `BrandTemporalComputer`
- `state_to_dict()` serializes the full 4D state (X/Y/Z/T + derived metrics) to JSON

**Connects to:** `persona_engine.PersonaEngine` (external framework), `persona.brand_*` computers (4 modules), `config.ARIA_BASE_PROMPT`, `config.JEWELRY_KG_PATH`

---

<a id="response_service"></a>

### services/response_service.py

**Orchestrates the full Aria jewelry assistant pipeline — NAI retrieve, 4D compute, prompt build with KG context injection, and introspection validation.**

- `ResponseService` coordinates `NAIService`, `PersonaService`, and `IntrospectionService`
- `process_query()` prepares everything for LLM generation without calling an LLM itself
- `validate_response()` checks generated output against 4D state before delivery
- `_build_kg_context()` converts top KG results into natural language with material/care/pairing details

**Connects to:** `services.nai_service.NAIService`, `services.persona_service.PersonaService`, `services.introspection.IntrospectionService`, `services.ctx_kg_service.CtxKGService` (optional, via `ctx_kg=` parameter)

---

<a id="scene_image"></a>

### services/scene_image.py

**Per-location atmospheric image generation via Gemini Imagen — generates and caches scene images for game locations based on description, atmosphere, mood colors, and time of day.**

- `SceneImageService` with MD5-based cache keys, JSON file caching in `data/scene_cache/`
- Prompt style: "painterly digital art, Studio Ghibli inspired, warm and inviting"
- Time-of-day modifiers: dawn, day, dusk, night, dream

**Connects to:** Gemini API (gemini-2.0-flash-exp), local filesystem cache

---

<a id="termux_service"></a>

### services/termux_service.py

**Async wrapper for termux-api Android commands — provides typed Python access to battery, sensors, camera, GPS, SMS, notifications, torch, vibration, clipboard, contacts, volume, WiFi, NFC, media, and system dialogs.**

- All methods use `asyncio.create_subprocess_exec` (not shell) with timeout protection
- Arguments passed as list elements, never string-interpolated
- Covers device hardware, sensors, location, network, communication, clipboard, notifications, media, NFC, and system

**Connects to:** Termux API (Android, external), `asyncio` subprocess

---

<a id="therapist_controls"></a>

### services/therapist_controls.py

**Remote game management for clinical oversight — allows therapists to pause/resume games, inject session context, set disclosure layer limits, require review for deep content, and send messages to users through the game.**

- `TherapistControls` class with SQLite storage in `data/therapist/controls.db`
- Two tables: `game_controls` (per-user state) and `control_log` (audit trail)
- Game frontend polls controls before each turn; context and messages are consumed on read

**Connects to:** SQLite (stdlib), local filesystem (`data/therapist/`)

---

<a id="therapist_dashboard"></a>

### services/therapist_dashboard.py

**Clinical oversight dashboard service — provides choice evolution timelines, mirror bubble analytics, antagonist analysis, session notes, mood check-ins with velocity tracking, flagged moments, KG summaries, and soft achievements.**

- `TherapistDashboardService` with SQLite storage in `data/therapist/dashboard.db`
- Four tables: `session_notes`, `mood_checkins`, `flagged_moments`, `achievements`
- 10 predefined achievement definitions (non-competitive, therapeutic)
- `get_full_dashboard()` compiles everything a therapist needs in one call
- `generate_story_recap()` creates session handoff narratives from KG + game state + mood trajectory

**Connects to:** `data.build_therapy_kg.TherapyKG`, SQLite (stdlib), local filesystem (`data/therapist/`)

---

<a id="therapy_safety"></a>

### services/therapy_safety.py

**Crisis detection, hard blocks, and response guardrails — the non-negotiable safety layer for the therapeutic engine with two entry points: `check_user_input()` and `check_response()`.**

- Crisis patterns detect suicidal ideation, self-harm, overdose, and abuse disclosures with phrase-level regex
- Exclusion patterns prevent false positives on metaphors, past tense, media references, and recovery statements
- Hard blocks cover medication advice, clinical diagnosis, legal advice, financial advice, and adversarial attacks
- Response guardrails catch minimizing language, false empathy, toxic positivity, and dismissive directives
- `CRISIS_RESOURCES` provides hotline numbers for suicide, self-harm, and abuse

**Connects to:** None (standalone safety layer; used by `therapy_service.py`, `game_runtime.py`, `gemini_narrative.py`)

---

<a id="therapy_service"></a>

### services/therapy_service.py

**Orchestrator for the therapy pipeline — processes user messages through safety check, KG load, 4D persona computation (emotional/relational/linguistic/temporal), and context building for LLM generation, then validates output and grows the user's KG.**

- `TherapyService` coordinates `TherapySafetyService`, `TherapyKG`, and four therapy dimension computers
- `TherapyContext` dataclass bundles everything needed for LLM generation
- Session lifecycle: `start_session()` with handoff context, `end_session()` with mood tracking
- KG growth methods: `add_concern()`, `add_media()`, `add_insight()`, `update_node()`, `add_edge()`
- Read operations: `get_user_state()`, `get_user_graph()` (React Flow format), `search_kg()`

**Connects to:** `services.therapy_safety.TherapySafetyService`, `data.build_therapy_kg.TherapyKG`, `persona.therapy_*` computers (4 modules)

---

## External Dependencies Summary

### Stores / State

| Store | Purpose |
|---|---|
| `data/users/{user_id}/game.db` | Per-user game saves, transcripts, Aria context (SQLite) |
| `data/therapist/dashboard.db` | Therapist notes, mood check-ins, flags, achievements (SQLite) |
| `data/therapist/controls.db` | Therapist remote controls and audit log (SQLite) |
| `data/psychology/icd11_mental_disorders.json` | Cached ICD-11 Chapter 06 taxonomy |
| `data/scene_cache/` | Cached Gemini-generated scene images |
| `TherapyKG` (per-user SQLite) | User therapy knowledge graphs via `data.build_therapy_kg` |
| Jewelry KG (SQLite) | Product knowledge graph at `config.JEWELRY_KG_PATH` |

### Libraries

| Library | Purpose |
|---|---|
| `aiohttp` | Persistent HTTP connection pooling for Gemini API calls |
| `asyncio` | Async subprocess execution (termux), background polling, timeouts |
| `sqlite3` | Per-user game persistence, therapist dashboard, controls storage |
| `urllib` | Sync HTTP requests to Gemini API, ICD-11 API, web fetching |
| `persona_engine.PersonaEngine` | 4D persona state computation framework (external) |
| `nai.intentgraph_engine` | 4-weight IntentGraph search over knowledge graphs (external) |
| `nai.kg_manager` | KG schema detection, node/edge loading (external) |
| `persona.brand_*` | Brand-specific 4D dimension computers (4 modules) |
| `persona.therapy_*` | Therapy-specific 4D dimension computers (4 modules) |
| `data.build_therapy_kg` | Therapy KG construction and management |
| `config` | Application config (`ARIA_BASE_PROMPT`, `JEWELRY_KG_PATH`) |
| Gemini API | LLM generation, web search grounding, Vision, Imagen |
| Termux API | Android device access (battery, sensors, camera, SMS, etc.) |
| WHO ICD-11 API | Mental disorder taxonomy lookup and bulk import |
