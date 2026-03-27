<!-- last-verified: 2026-03-27 -->
> Parent: [../start-here.md](../start-here.md)

# lib/ — Start Here

> Read this first. Jump to [lib.md](lib.md) or [lib.ctx](lib.ctx) only for the module you need.

## App-Level Modules

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **aria.ts** | App singleton — wires AriaCore with personal persona, SQLite persistence, auto-resume, and memory injection | [aria](lib.md#aria) | aria node |
| **persona.ts** | Default hardcoded PersonaConfig (voice, personality, greetings, changelog) with cartridge override | [persona](lib.md#persona) | persona node |
| **commands.ts** | 3 personal commands: open_url, copy_to_clipboard, set_reminder | [commands](lib.md#commands) | commands node |
| **useAriaBackend.ts** | React hook for Python backend — 4D persona, system prompt injection, NAI search | [useAriaBackend](lib.md#useAriaBackend) | useBackend node |
| **cartridgeStorage.ts** | localStorage cache for drag-dropped .aria.json persona cartridges | [cartridgeStorage](lib.md#cartridgeStorage) | — |

## Persistence

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **db.ts** | SQLite WASM singleton (OPFS or in-memory). Schema: sessions, messages, kg_nodes, kg_edges, kg_fts | [db](lib.md#db) | db node |
| **kgAdapter.ts** | KGAdapter implementation — FTS5 pre-filtering, node/edge CRUD, neighbor queries | [kgAdapter](lib.md#kgAdapter) | kgAdapter node |
| **sessionAdapter.ts** | SessionAdapter implementation — session lifecycle, snapshots, auto-summary | [sessionAdapter](lib.md#sessionAdapter) | sessionAdapter node |
| **sessionResolver.ts** | Auto-resume logic — finds ended sessions within 24h, builds resume context | [sessionResolver](lib.md#sessionResolver) | sessionResolver node |
| **memoryInjector.ts** | NLKE retrieval → system prompt memory block (top-k bullet list) | [memoryInjector](lib.md#memoryInjector) | memoryInjector node |

## Game Layer

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **gameApi.ts** | Typed fetch wrapper for all /api/game/* endpoints | [gameApi](lib.md#gameApi) | gameApi node |
| **gameAriaAdapter.ts** | Game voice AI glue — 23 functions (move, look, talk, take, use_item, quests, etc.) | [gameAriaAdapter](lib.md#gameAriaAdapter) | gameAdapter node |
| **gameDevLogger.ts** | Singleton RingBufferLogger + CommandAuditTrail for DevHub | [gameDevLogger](lib.md#gameDevLogger) | gameDevLog node |
| **logicEngine.ts** | Logic execution — 7 block types with cycle prevention (MAX_DEPTH=20) | [logicEngine](lib.md#logicEngine) | logicEngine node |
| **behaviorSync.ts** | Bidirectional sync between behavior cards and LogicGraph | [behaviorSync](lib.md#behaviorSync) | behaviorSync node |
| **recipeRunner.ts** | Step-by-step tutorial recipe system with action execution | [recipeRunner](lib.md#recipeRunner) | recipeRunner node |

## Local AI

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **localAria.ts** | FunctionGemma on-device inference client (replaces cloud function calling) | [localAria](lib.md#localAria) | localAria node |
| **trainingLogger.ts** | JSONL training data capture for FunctionGemma (max 500 examples) | [trainingLogger](lib.md#trainingLogger) | trainingLogger node |

## aria-core/ — Provider-Agnostic Framework

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **AriaCore** | Main orchestrator — wires provider + persona + contexts + commands + router | [AriaCore](lib.md#AriaCore) | AriaCore node |
| **types/** | All type contracts: AudioConfig, CommandResult, ContextInjector, PersonaConfig, AriaProvider, AriaStatus | [types](lib.md#aria-core-types) | — |
| **audio/** | Mic capture (getUserMedia → PCM), encode/decode helpers, gapless playback scheduler | [audio](lib.md#aria-core-audio) | mic/pcm/playback nodes |
| **providers/** | Abstract BaseProvider with reconnect, GeminiLive WebSocket, SDK provider | [providers](lib.md#aria-core-providers) | baseProvider/geminiLive nodes |
| **state/** | State machine, KGStore (NLKE hybrid retrieval), SqliteSessionStore, session/suggestion/report stores | [state](lib.md#aria-core-state) | stateMachine/kgStore nodes |
| **knowledge/** | NLKE TypeScript port — BM25 + hash embeddings + graph scoring, 3-path fusion, intent routing | [knowledge](lib.md#aria-core-knowledge) | bm25/hashEmbed/graphScorer/fusion nodes |
| **commands/** | Command registry (context-aware), router (FunctionCall → result), 5 built-in commands | [commands](lib.md#aria-core-commands) | registry/router/builtins nodes |
| **context/** | Context engine (active context + injectors) and prompt builder (system prompt assembly) | [context](lib.md#aria-core-context) | contextEngine/promptBuilder nodes |
| **persona/** | Cartridge loader (.aria.json → PersonaConfig) with Zod validation, persona merge/override | [persona](lib.md#aria-core-persona) | — |
| **devhub/** | RingBufferLogger and CommandAuditTrail for development tools | [devhub](lib.md#aria-core-devhub) | — |

## aria/ — Game Voice Engine

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **engine.ts** | AriaEngine — domain-agnostic voice orchestrator with provider, mic, playback | [AriaEngine](lib.md#AriaEngine) | engine node |
| **persona.ts** | Persona registry — register, get, list, clear personas | [persona](lib.md#aria-persona) | ariaPersona node |
| **su/** | SU persona — ~95 voice functions for device, web, panel control | [su](lib.md#suPersona) | suPersona node |

## Subdirectories

| Module | What it is | lib.md | lib.ctx |
|---|---|---|---|
| **recipes/** | 5 built-in tutorials (calculator, quiz, traffic light, mood tracker, catch game) | [recipes](lib.md#recipes) | recipeIndex node |
| **storekit-commands/** | Jewelry store context with 12 voice functions and navigation/shopping handlers | [storekit-commands](lib.md#storekit-commands) | storekitCtx node |

## Cross-references

| Folder | What it provides | Start here |
|---|---|---|
| **components/** | UI components that consume lib modules and display their output | [components/start-here.md](../components/start-here.md) |
| **store/** | Zustand stores that lib modules read from and write to | [store/start-here.md](../store/start-here.md) |
| **types/** | Shared type definitions used by game and dashboard modules | [types/start-here.md](../types/start-here.md) |
| **app/** | Next.js routes that mount the top-level shells | [app/start-here.md](../app/start-here.md) |
