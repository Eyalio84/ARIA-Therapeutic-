<!-- last-verified: 2026-03-26 -->

# src/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/` |
| **Purpose** | Aria Personal — AI voice companion with therapeutic game engine, therapist dashboard, visual logic canvas, e-commerce store, and SDK developer tools |
| **Framework / stack** | Next.js 14+ (App Router), React, TypeScript, Zustand, SQLite WASM (OPFS), Gemini Live WebSocket, Web Audio API, Tailwind CSS |
| **Entry point** | `app/layout.tsx` → `app/page.tsx` |
| **External dependencies** | `zustand`, `zod`, `@sqlite.org/sqlite-wasm`, `@xyflow/react`, Google Fonts, Gemini Live API, Python backend (`/api/game/*`, `/api/dashboard/*`, `/api/nai/*`) |
| **Component/file count** | ~187 files across 5 top-level directories |
| **Architecture style** | Next.js App Router with thin route wrappers → component shells → Zustand stores ← provider-agnostic lib core |

## File Tree

```
src/
├── app/                    # Next.js routes — 7 files, 5 dirs
│   ├── layout.tsx          # Root HTML layout, fonts, metadata
│   ├── page.tsx            # Home — TabBar + TabContainer
│   ├── globals.css         # Dark theme, glass-morphism, animations
│   ├── dashboard/page.tsx  # /dashboard route
│   ├── docs/page.tsx       # /docs route — markdown viewer/editor
│   ├── game/page.tsx       # /game route
│   └── su/page.tsx         # /su route
│
├── components/             # All UI — 84 files
│   ├── *.tsx (13)          # Root chat interface (ChatPanel, VoiceOrb, etc.)
│   ├── dashboard/ (9)      # Therapist dashboard — 6-tab clinical panel
│   ├── game/ (46)          # Therapeutic narrative game engine
│   ├── su/ (3)             # SU Lab — voice-controlled visual canvas
│   ├── sdk/ (5)            # SDK developer dashboard
│   ├── store/ (8)          # Jewelry e-commerce store
│   └── roadmap/ (1)        # Project roadmap viewer
│
├── lib/                    # Core engine — 79 files
│   ├── *.ts (18)           # App wiring, persistence, game adapter
│   ├── aria-core/ (~40)    # Provider-agnostic AI framework (NLKE, audio, state)
│   ├── aria/ (~10)         # Game voice engine + SU persona
│   ├── recipes/ (5)        # Built-in tutorial recipes
│   └── storekit-commands/  # Jewelry store voice functions
│
├── store/                  # Zustand stores — 14 files
│   └── *.ts (14)           # Independent stores with optional persistence
│
└── types/                  # Shared types — 3 files
    └── *.ts (3)            # Game, dashboard, SQLite WASM declarations
```

## Folder Index

<a id="app"></a>
### app/ — Routes

**Next.js App Router with thin route wrappers. Each route mounts a component shell and delegates all logic downward.**

- 5 routes: `/` (home/chat), `/dashboard`, `/docs`, `/game`, `/su`
- `layout.tsx` is the single entry point — loads fonts, sets metadata, applies dark mode
- All routes except `/docs` are one-line wrappers around component shells
- **Connects to:** `components/` (renders shells), Google Fonts (external)

> Drill down: [app/start-here.md](app/start-here.md) | [app/app.md](app/app.md) | [app/app.ctx](app/app.ctx)

---

<a id="components"></a>
### components/ — UI

**84 React components organized by domain. The root level (13 components) forms the main Aria chat interface; 6 subdirectories cover domain-specific UIs.**

- **Root chat interface** — ChatPanel orchestrator, VoiceOrb (5-state animated), ChatInput (slash commands), ConfigDrawer, SessionHistory, TabBar/TabContainer
- **dashboard/** (9) — 6-tab therapist panel: KG visualization, mood tracking, flags/notes, session analytics, clinical assessments, therapist controls
- **game/** (46) — Onboarding → interview → gameplay loop with transcript, journal, dev tools, and voice integration
- **su/** (3) — SUShell + SUCanvas + ColorPicker for the visual logic canvas with ~95 voice functions
- **sdk/** (5) — NAI search, KG explorer, persona visualizer, introspection tester
- **store/** (8) — Product grid, detail views, cart, category filters, Jarvis/Aria chat assistant
- **roadmap/** (1) — 9-section status viewer with progress bars
- **Connects to:** `store/` (reads/writes all 14 stores), `lib/` (AriaCore, game adapter, voice engine), `types/` (game and dashboard types), `app/` (mounted by routes)

> Drill down: [components/start-here.md](components/start-here.md) | [components/components.md](components/components.md) | [components/components.ctx](components/components.ctx)

---

<a id="lib"></a>
### lib/ — Core Engine

**Provider-agnostic AI framework, persistence layer, game adapter, and app-level wiring. The brain of the application.**

- **aria-core/** — The framework: AriaCore orchestrator, BaseProvider/GeminiLive provider, NLKE knowledge engine (BM25 + hash embeddings + graph scoring), command registry/router, context engine, prompt builder, state machine, audio capture/playback
- **App-level** — `aria.ts` singleton wires AriaCore with persona, SQLite persistence, auto-resume, and memory injection
- **Persistence** — SQLite WASM (OPFS) with sessions, messages, KG nodes/edges, FTS5; session adapter, KG adapter, session resolver (24h auto-resume), memory injector
- **Game layer** — `gameAriaAdapter.ts` (23 voice functions), `gameApi.ts` (typed fetch), logic engine (7 block types), behavior sync, recipe runner
- **Local AI** — FunctionGemma on-device inference + JSONL training data capture
- **Voice engines** — `aria/engine.ts` (domain-agnostic), `aria/su/` (~95 SU voice functions)
- **Connects to:** `store/` (reads/writes game, chat, lab, devLog stores), `types/` (game and dashboard types), Python backend (HTTP API)

> Drill down: [lib/start-here.md](lib/start-here.md) | [lib/lib.md](lib/lib.md) | [lib/lib.ctx](lib/lib.ctx)

---

<a id="store"></a>
### store/ — State

**14 independent Zustand stores. Each store is imported directly by the components and lib modules that need it. No central store provider.**

- **Chat domain** — `chat` (messages, voice status, context), `ariaMode` (game/su toggle), `tab` (navigation)
- **Game domain** — `game` (screens, interview, config, stats, narratives, moods), `gameVoice` (orb state), `gameTheme` (4 color presets), `transcript` (typed entries + export)
- **Dashboard domain** — `dashboard` (mood, flags, notes, achievements, choice analysis)
- **Lab domain** — `lab` (12 object types, 7 logic blocks, wires, undo/redo, presets), `devLog` (500-entry buffer)
- **Commerce domain** — `products` (inventory), `cart` (add/remove, quantity, gift note)
- **SDK domain** — `sdk` (NAI search, 4D persona, introspection), `kg` (KG CRUD + xyflow viz)
- 6 stores persist to localStorage: `ariaMode`, `game`, `gameTheme`, `transcript`, `lab`, `cart`
- **Connects to:** `types/` (game and dashboard types), `lib/gameDevLogger` (devLog source), `@xyflow/react` (kg store)

> Drill down: [store/start-here.md](store/start-here.md) | [store/store.md](store/store.md) | [store/store.ctx](store/store.ctx)

---

<a id="types"></a>
### types/ — Type Definitions

**3 standalone type files with no cross-imports. Pure TypeScript declarations consumed by store, lib, and components.**

- `dashboard.ts` — Mood (1-5), flagged moments (4 severity levels), session notes, achievements, choice analysis, mirror analytics, antagonist analysis, `FullDashboard` aggregate
- `game.ts` — Mirrors Python backend dataclasses: cartridges, NPCs, locations, items, quests, map, interview, transcript entries, `GameConfig` aggregate
- `sqlite-wasm.d.ts` — Ambient module declaration for `@sqlite.org/sqlite-wasm`
- **Connects to:** `store/` (game, dashboard, transcript stores import these), `lib/` (game adapter, dashboard fetcher use these), `components/` (game and dashboard UIs render these shapes)

> Drill down: [types/start-here.md](types/start-here.md) | [types/types.md](types/types.md) | [types/types.ctx](types/types.ctx)

---

## Dependency Flow

```
            types/
           ╱  │  ╲
          ╱   │   ╲
    store/ ←──┤    lib/
      ↑       │    ↗ ↑
      │       │   ╱  │
      │       │  ╱   │
    components/      │
      ↑              │
      │              │
    app/ ────────────┘
```

- **app/** renders **components/** — thin route wrappers mount domain shells
- **components/** read/write **store/** — UI state flows through Zustand
- **components/** call **lib/** — voice control, game actions, persistence
- **lib/** reads/writes **store/** — engine updates game, chat, lab state
- **types/** is consumed by **store/**, **lib/**, and **components/** — shared contracts
- **lib/** talks to **Python backend** — game API, dashboard analytics, NAI search

## External Dependencies Summary

### Stores/State

| Store | Domain | Persisted |
|---|---|---|
| chat | Main chat interface | No |
| ariaMode | Game/SU mode toggle | Yes |
| tab | Tab navigation | No |
| game | Game engine state | Yes |
| gameVoice | Game voice orb | No |
| gameTheme | Game color themes | Yes |
| transcript | Game transcript | Yes |
| dashboard | Therapist analytics | No (fetched) |
| devLog | Dev console | No |
| lab | Visual logic editor | Yes |
| products | Product inventory | No (fetched) |
| cart | Shopping cart | Yes |
| kg | Knowledge graph | No (fetched) |
| sdk | SDK testing | No (fetched) |

### Libraries

| Library | Purpose |
|---|---|
| Next.js 14+ | App Router, SSR, file-based routing |
| React | Component framework |
| TypeScript | Type safety |
| Zustand | Lightweight state management |
| Zod | Schema validation (persona cartridges) |
| @sqlite.org/sqlite-wasm | Client-side SQLite (OPFS persistence) |
| @xyflow/react | KG graph visualization |
| Tailwind CSS | Utility-first styling |
| Web Audio API | Mic capture, PCM encoding, gapless playback |
| Gemini Live API | WebSocket streaming voice AI |
| Google Fonts | Instrument Serif, DM Sans, JetBrains Mono |

### External Services

| Service | Purpose |
|---|---|
| Python backend `/api/game/*` | Game state, NPC dialogue, quest progression |
| Python backend `/api/dashboard/*` | Therapist analytics, mood tracking |
| Python backend `/api/nai/*` | NAI semantic search |
| FunctionGemma (on-device) | Local function calling inference |
