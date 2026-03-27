<!-- last-verified: 2026-03-27 -->

# lib/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/lib/` |
| **Purpose** | Aria AI voice engine — provider-agnostic core, Gemini Live provider, knowledge graph, session persistence, game adapter, visual logic engine, and app-level wiring |
| **Framework / stack** | TypeScript, Zustand, Zod, SQLite WASM (OPFS), Web Audio API, Gemini Live WebSocket |
| **Entry point** | `aria.ts` (app-level), `aria-core/index.ts` (framework) |
| **External dependencies** | `zustand`, `zod`, `@sqlite.org/sqlite-wasm`, Gemini Live API, Web Audio API, `navigator.mediaDevices` |
| **Component/file count** | ~60+ files across 8 subdirectories |
| **Architecture style** | Provider-agnostic core with adapter pattern, composition over inheritance |

## File Tree

```
lib/
├── aria.ts                 # App singleton — wires AriaCore with personal persona
├── behaviorSync.ts         # Bidirectional behavior cards ↔ LogicGraph sync
├── cartridgeStorage.ts     # localStorage cache for .aria.json cartridges
├── commands.ts             # Personal commands (open_url, clipboard, reminder)
├── db.ts                   # SQLite WASM singleton (OPFS or in-memory)
├── gameApi.ts              # Typed wrapper for /api/game/* endpoints
├── gameAriaAdapter.ts      # Game-specific voice AI glue (23 game functions)
├── gameDevLogger.ts        # Singleton loggers for game DevHub
├── kgAdapter.ts            # SQLite WASM implementation of KGAdapter
├── localAria.ts            # FunctionGemma on-device inference client
├── logicEngine.ts          # Phase 3 logic execution (7 block types)
├── memoryInjector.ts       # NLKE retrieval → system prompt memory block
├── persona.ts              # Default persona + cartridge resolution
├── recipeRunner.ts         # Step-by-step tutorial recipe system
├── sessionAdapter.ts       # SQLite WASM implementation of SessionAdapter
├── sessionResolver.ts      # Auto-resume logic (24h window)
├── trainingLogger.ts       # Training data capture for FunctionGemma (JSONL)
├── useAriaBackend.ts       # React hook for Python backend integration
│
├── aria-core/              # Provider-agnostic AI framework
│   ├── index.ts            # Re-exports all public APIs
│   ├── AriaCore.ts         # Main orchestrator class
│   ├── types/
│   │   ├── index.ts        # Re-exports all type contracts
│   │   ├── audio.ts        # AudioConfig, AudioConstraints
│   │   ├── command.ts      # CommandResult, UICommand, CommandHandler
│   │   ├── context.ts      # ContextInjector, ContextDefinition
│   │   ├── knowledge.ts    # KnowledgeNode, KnowledgeEdge, RetrievalResult
│   │   ├── persona.ts      # VoiceConfig, PersonaConfig, GreetingMap
│   │   ├── provider.ts     # AriaProvider interface, ProviderEvent
│   │   └── state.ts        # AriaStatus, ARIA_TRANSITIONS
│   ├── audio/
│   │   ├── index.ts        # Re-exports
│   │   ├── micCapture.ts   # getUserMedia + ScriptProcessor → base64 PCM
│   │   ├── pcmHelpers.ts   # PCM encode/decode utilities
│   │   └── playbackScheduler.ts  # Gapless Web Audio chunk scheduling
│   ├── context/
│   │   ├── contextEngine.ts     # Active context + injector pipeline
│   │   └── promptBuilder.ts     # System prompt assembly
│   ├── state/
│   │   ├── ariaStateMachine.ts  # Pure state transitions (idle↔speaking)
│   │   ├── sessionStore.ts      # Provider-agnostic Zustand session store
│   │   ├── kgStore.ts           # KGStore — NLKE hybrid retrieval
│   │   ├── sqliteSessionStore.ts # Session persistence class
│   │   ├── suggestionStore.ts   # Suggestion state
│   │   └── reportPadStore.ts    # Report pad state
│   ├── providers/
│   │   ├── types.ts        # Gemini wire protocol types
│   │   ├── base.ts         # Abstract BaseProvider with reconnect
│   │   ├── geminiLive.ts   # Gemini Live WebSocket provider
│   │   └── geminiLiveSDK.ts # Newer SDK-based provider
│   ├── commands/
│   │   ├── commandRegistry.ts   # Context-aware handler registry
│   │   ├── commandRouter.ts     # FunctionCall → handler → result
│   │   └── builtinCommands.ts   # 5 built-ins (changelog, report, save_memory)
│   ├── knowledge/
│   │   ├── config.ts       # Default retrieval config
│   │   ├── bm25.ts         # BM25 index with intent keyword boosting
│   │   ├── hashEmbedder.ts # Hash-based n-gram embeddings
│   │   ├── graphScorer.ts  # Graph proximity scoring
│   │   ├── intentRouter.ts # Query intent detection
│   │   ├── weightProfiles.ts  # Intent-specific weight profiles
│   │   ├── hybridFusion.ts # 3-path fusion (vector + BM25 + graph)
│   │   ├── memoryParser.ts # Markdown → memory chunks
│   │   ├── queryCache.ts   # Retrieval result caching
│   │   └── tokenizer.ts    # Text tokenization with filtering
│   ├── persona/
│   │   ├── cartridgeLoader.ts   # .aria.json → PersonaConfig
│   │   ├── cartridgeSchema.ts   # Zod validation for cartridges
│   │   ├── cartridgeTypes.ts    # TypeScript types for cartridge format
│   │   ├── personaLoader.ts     # Persona merge + overrides
│   │   └── personaSchema.ts     # Zod validation for personas
│   └── devhub/
│       ├── logger.ts       # RingBufferLogger for dev output
│       └── auditTrail.ts   # CommandAuditTrail
│
├── aria/                   # Game-specific voice engine
│   ├── engine.ts           # AriaEngine — domain-agnostic orchestrator
│   ├── persona.ts          # Persona registry (register/get/list)
│   └── su/
│       ├── suFunctions.ts  # SU voice functions (~95)
│       └── suPersona.ts    # SU persona (device, web, panel control)
│
├── recipes/                # Tutorial recipe system
│   ├── index.ts            # Recipe registration
│   ├── calculator.ts       # Calculator recipe (10 steps)
│   ├── quiz.ts             # Quiz recipe
│   ├── trafficLight.ts     # Traffic light recipe
│   ├── moodTracker.ts      # Mood tracker recipe
│   └── catchGame.ts        # Catch game recipe
│
└── storekit-commands/      # StoreKit e-commerce integration
    ├── index.ts            # Re-exports
    ├── contexts.ts         # Jewelry store context (12 functions)
    └── handlers/
        ├── navigation.ts   # Navigate command handlers
        └── shopping.ts     # Shopping command handlers
```

## Component/Module Index

### Top-Level Modules

<a id="aria"></a>
### aria.ts

**App-level Aria singleton. Wires AriaCore with the personal persona, SQLite persistence (session + KG stores), auto-resume logic, and memory injection. The main integration point for aria-personal.**

- Manages session lifecycle, context switching, voice switching
- Auto-resumes sessions within 24h window
- **Connects to:** `aria-core/AriaCore`, `db.ts`, `kgAdapter.ts`, `sessionAdapter.ts`, `sessionResolver.ts`, `memoryInjector.ts`, `persona.ts`, `commands.ts`, `store/chat`

---

<a id="behaviorSync"></a>
### behaviorSync.ts

**Bidirectional sync between simplified behavior cards (WHEN/THEN) and the visual LogicGraph. Converts between UI-friendly behavior objects and graph wires/listeners/blocks.**

- Includes preset behaviors (e.g., "click to toggle")
- **Connects to:** `store/lab` (LogicGraph types)

---

<a id="cartridgeStorage"></a>
### cartridgeStorage.ts

**localStorage cache for drag-dropped .aria.json cartridges. Saves, loads, clears cartridges and converts to PersonaConfig format.**

- **Connects to:** `persona.ts`, `aria-core/persona/*`

---

<a id="commands"></a>
### commands.ts

**Personal command handlers: `open_url`, `copy_to_clipboard`, `set_reminder`. Also exports function declarations for Gemini Live.**

- **Connects to:** `aria.ts`, `aria-core/commands/commandRegistry`

---

<a id="db"></a>
### db.ts

**SQLite WASM singleton. Lazy-initializes on first call using OPFS (falls back to in-memory). Typed `AriaDb` wrapper with `run()`, `all()`, `get()`. Creates schema: sessions, messages, kg_nodes, kg_edges, kg_fts (FTS5).**

- **Connects to:** `kgAdapter.ts`, `sessionAdapter.ts`, `@sqlite.org/sqlite-wasm`

---

<a id="gameApi"></a>
### gameApi.ts

**Typed fetch wrapper for all `/api/game/*` endpoints — cartridges, interview, gameplay, persistence, voice config.**

- **Connects to:** `/api/game/*` (backend), `store/game`, `components/game/*`

---

<a id="gameAriaAdapter"></a>
### gameAriaAdapter.ts

**Game-specific glue layer connecting voice AI to game state. Defines 23 game functions (move, look, talk, take, use_item, choose, quests, inventory, save, journal, map, hints, companion). Routes voice commands to GameStore, TranscriptStore, and AriaModeStore.**

- **Connects to:** `aria-core/AriaCore`, `store/game`, `store/transcript`, `store/ariaMode`, `store/gameVoice`, `@/types/game`

---

<a id="gameDevLogger"></a>
### gameDevLogger.ts

**Singleton instances of RingBufferLogger and CommandAuditTrail for game DevHub. Defines source colors for rendering.**

- **Connects to:** `aria-core/devhub/*`, `store/game`, `components/game/DevHub`

---

<a id="kgAdapter"></a>
### kgAdapter.ts

**SQLite WASM implementation of the KGAdapter interface. FTS5 pre-filtering, node/edge CRUD, neighbor queries. Pure SQL, no business logic.**

- **Connects to:** `db.ts`, `aria-core/state/kgStore` (implements KGAdapter interface)

---

<a id="localAria"></a>
### localAria.ts

**FunctionGemma on-device inference client. Replaces Gemini Live's function calling with local model inference. Provides `localInfer()`, `localStatus()`, `localUnload()`.**

- **Connects to:** FunctionGemma local server (external)

---

<a id="logicEngine"></a>
### logicEngine.ts

**Phase 3 logic execution engine. Processes 7 block types (if_else, compare, math, delay, set_variable, get_variable, loop, collision) with cycle prevention (MAX_DEPTH=20). Pure functions.**

- **Connects to:** `store/lab` (LogicGraph, LabObject types)

---

<a id="memoryInjector"></a>
### memoryInjector.ts

**NLKE retrieval → system prompt injection. Top-k retrieval from KGStore, formatted as bullet list for context.**

- **Connects to:** `aria-core/state/kgStore`, `aria.ts`

---

<a id="persona"></a>
### persona.ts

**Default hardcoded PersonaConfig for Aria (voice, personality, response style, greetings, changelog). Resolves cartridge overrides from localStorage.**

- **Connects to:** `cartridgeStorage.ts`, `aria.ts`

---

<a id="recipeRunner"></a>
### recipeRunner.ts

**Aria-guided tutorial system. Executes step-by-step recipes with actions (add_object, set_property, add_wire, etc.). Includes built-in recipe registration.**

- **Connects to:** `recipes/*`, `store/lab`

---

<a id="sessionAdapter"></a>
### sessionAdapter.ts

**SQLite WASM implementation of SessionAdapter. Session lifecycle (create, append, close with auto-summary), snapshot management.**

- **Connects to:** `db.ts`, `aria-core/state/sqliteSessionStore` (implements SessionAdapter interface)

---

<a id="sessionResolver"></a>
### sessionResolver.ts

**Auto-resume logic. Finds recent ended sessions within 24h, builds resume context from messages, interpolates greetings with `{{last_topic}}`.**

- **Connects to:** `aria.ts`, `sessionAdapter.ts`

---

<a id="trainingLogger"></a>
### trainingLogger.ts

**Captures voice→function pairs as JSONL training data for FunctionGemma. localStorage persistence (max 500 examples). Exports in FunctionGemma and simple JSONL formats.**

- **Connects to:** `aria.ts`, localStorage

---

<a id="useAriaBackend"></a>
### useAriaBackend.ts

**React hook for Python backend integration. Computes 4D persona state, injects system prompts, runs NAI product search.**

- **Connects to:** `/api/aria/*` (backend), `store/sdk`, `store/chat`

---

### aria-core/ — Provider-Agnostic Framework

<a id="AriaCore"></a>
### aria-core/AriaCore.ts

**Main orchestrator. Wires provider + persona + contexts + command registry + router. Manages lifecycle (connect/disconnect), audio/text I/O, page context injection, and host state. The heart of the framework.**

- **Connects to:** All aria-core submodules, providers, commands, contexts, state

---

<a id="aria-core-types"></a>
### aria-core/types/

**Type contracts for the entire framework: AudioConfig, CommandResult, ContextInjector, KnowledgeNode, PersonaConfig, AriaProvider, AriaStatus, and state transitions.**

- **Connects to:** All aria-core modules (consumed everywhere)

---

<a id="aria-core-audio"></a>
### aria-core/audio/

**Audio pipeline: mic capture (getUserMedia → base64 PCM), PCM encode/decode helpers, and gapless Web Audio playback scheduler.**

- **Connects to:** `AriaCore`, `providers/geminiLive`

---

<a id="aria-core-context"></a>
### aria-core/context/

**Context engine (manages active context, available commands, injector pipeline) and prompt builder (assembles system prompts from persona + context + injectors).**

- **Connects to:** `AriaCore`, `commands/commandRegistry`

---

<a id="aria-core-state"></a>
### aria-core/state/

**State management: pure state machine (idle↔speaking transitions), session store (Zustand), KGStore (NLKE hybrid retrieval: BM25 + hash embeddings + graph scoring), SQLite session store, suggestion store, report pad store.**

- **Connects to:** `AriaCore`, `kgAdapter.ts`, `sessionAdapter.ts`

---

<a id="aria-core-providers"></a>
### aria-core/providers/

**Provider implementations: abstract BaseProvider (event pub/sub, exponential backoff reconnect), GeminiLive WebSocket provider (BidiGenerateContent protocol), and newer SDK-based provider.**

- **Connects to:** `AriaCore`, Gemini Live API (external)

---

<a id="aria-core-commands"></a>
### aria-core/commands/

**Command system: registry (context-aware handler lookup), router (FunctionCall → handler → result with silent/speak/dispatch types), and 5 built-in commands (changelog, report, save_memory, summarize_session, clear_report).**

- **Connects to:** `AriaCore`, `context/contextEngine`

---

<a id="aria-core-knowledge"></a>
### aria-core/knowledge/

**NLKE TypeScript port. Hybrid retrieval: BM25 (with 5× intent keyword boosting) + hash embeddings (n-gram fingerprinting) + graph proximity scoring. 3-path fusion (α×vector + β×BM25 + γ×graph). Includes intent routing, weight profiles, memory parsing, query caching, and tokenization.**

- **Connects to:** `state/kgStore`

---

<a id="aria-core-persona"></a>
### aria-core/persona/

**Persona system: .aria.json cartridge loader with Zod validation, persona merger with override support, and cartridge type definitions.**

- **Connects to:** `AriaCore`, `persona.ts`, `cartridgeStorage.ts`

---

<a id="aria-core-devhub"></a>
### aria-core/devhub/

**Development tools: RingBufferLogger for capped log output and CommandAuditTrail for command execution tracking.**

- **Connects to:** `gameDevLogger.ts`, `components/game/DevHub`

---

### aria/ — Game Voice Engine

<a id="AriaEngine"></a>
### aria/engine.ts

**AriaEngine class. Domain-agnostic voice AI orchestrator connecting PersonaConfig to AriaCore pipeline. Manages provider, mic, playback scheduler. Callbacks for status, transcripts, function calls, narratives, and errors.**

- **Connects to:** `aria-core/AriaCore`, `aria-core/audio/*`, `aria-core/providers/*`

---

<a id="aria-persona"></a>
### aria/persona.ts

**Persona registry. `registerPersona()`, `getPersona()`, `listPersonas()`, `clearPersonas()`. Pure data store for PersonaConfig objects.**

- **Connects to:** `AriaEngine`, `aria-core/types/persona`

---

<a id="suPersona"></a>
### aria/su/

**SU (Super User) persona and functions. ~95 voice functions for device control (flashlight, volume, vibration, clipboard), web capabilities (search, read URL, photo + analyze), panel control (DevHub, Transcript, Settings, Journal, Burger Menu), and system state awareness.**

- **Connects to:** `AriaEngine`, `store/lab`, `store/devLog`, `components/su/*`

---

### recipes/ — Tutorial System

<a id="recipes"></a>
### recipes/

**5 built-in tutorial recipes (calculator, quiz, traffic light, mood tracker, catch game). Each recipe defines step-by-step instructions with actions that manipulate lab objects. Registration via `initRecipes()`.**

- **Connects to:** `recipeRunner.ts`, `store/lab`

---

### storekit-commands/ — E-Commerce Integration

<a id="storekit-commands"></a>
### storekit-commands/

**StoreKit jewelry store integration. Defines jewelry context with 12 voice functions (navigate, scroll, add_to_cart, filter, search, describe). NAI-powered product search via Python backend. Handler modules for navigation and shopping commands.**

- **Connects to:** `aria-core/commands/*`, `store/products`, `store/cart`, `/api/aria/query` (backend)

---

## External Dependencies Summary

### Stores / State

| Store | Purpose |
|---|---|
| `zustand` | State management (session store, various UI stores) |
| `store/chat` | Chat messages and voice status |
| `store/game` | Game state |
| `store/transcript` | Transcript entries |
| `store/ariaMode` | Game/SU mode |
| `store/gameVoice` | Voice orb state |
| `store/lab` | Lab canvas and logic graph |
| `store/products` | Product inventory |
| `store/cart` | Shopping cart |
| `store/sdk` | SDK testing state |
| `store/devLog` | Dev log entries |

### Libraries

| Library | Purpose |
|---|---|
| `zod` | Schema validation (cartridge and persona) |
| `@sqlite.org/sqlite-wasm` | Client-side SQLite (OPFS or in-memory) |
| Gemini Live API | WebSocket voice AI provider |
| Web Audio API | Mic capture and audio playback |
| `@xyflow/react` | (indirect — via stores for KG visualization) |

### Backend APIs

| Endpoint | Module |
|---|---|
| `/api/game/*` | `gameApi.ts` |
| `/api/aria/*` | `useAriaBackend.ts`, `storekit-commands/contexts.ts` |
| FunctionGemma server | `localAria.ts` |
