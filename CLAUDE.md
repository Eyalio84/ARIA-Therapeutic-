# CLAUDE.md — Aria Personal

> This is the first file you read in every session. It contains everything you need to understand this project, navigate the codebase efficiently, and write code that fits.

## Project Overview

**Aria Personal** is a full-stack therapeutic AI companion built by Eyal Nof. It combines a narrative RPG therapy game, a voice-controlled visual programming canvas (SU Lab), a jewelry e-commerce store with knowledge graph, and a therapist dashboard — all powered by a 4D AI persona engine.

| Layer | Stack | Entry |
|-------|-------|-------|
| **Frontend** | Next.js 15, React 19, TypeScript (strict), Zustand 5, Tailwind CSS | `src/` |
| **Backend** | FastAPI (Python), SQLite, Gemini API | `backend/` |
| **Voice** | Gemini Live API (WebSocket), Web Audio API | `src/lib/aria-core/` |
| **Dev server** | Frontend: `npm run dev` (port 3001) | Backend: `python3 backend/main.py` (port 8000) |
| **API proxy** | Next.js proxies `/api/*` to backend at port 8095 via `next.config.ts` |

### Key areas

| Area | What it is | Frontend | Backend |
|------|-----------|----------|---------|
| **Therapy Game** | AI-driven narrative RPG with interview, world generation, gameplay, voice | `src/components/game/` | `backend/routers/game.py`, `backend/services/game_*.py` |
| **SU Lab** | Voice-controlled visual canvas with ~97 voice commands, logic editor, 12 object types | `src/components/su/` | `backend/routers/termux.py` (device), `backend/routers/game.py` (voice config) |
| **Store** | Jewelry e-commerce with KG-enriched products, Aria chat assistant | `src/components/store/` | `backend/routers/products.py`, `backend/routers/aria.py` |
| **Dashboard** | Therapist dashboard — mood, flags, notes, clinical tools | `src/components/dashboard/` | `backend/routers/dashboard.py` |
| **SDK** | Dev tools — KG explorer, persona visualizer, NAI search, introspection | `src/components/sdk/` | `backend/routers/kg.py`, `backend/routers/aria.py` |
| **Persona Engine** | 4D persona (emotional, linguistic, relational, temporal) for brand + therapy contexts | — | `backend/persona/` |

---

## Context Management System

This project uses a **lazy-loading context management system** with `.ctx` files. This is the most important section — it determines how you navigate the codebase efficiently.

### The 3-File Pattern

Every documented folder has 3 files:

| File | Purpose | When to read |
|------|---------|-------------|
| `start-here.md` | Routing index — what's here, where to look | **Always read first** when entering a folder |
| `{folder}.ctx` | Architecture graph — how components connect | When you need to understand dependencies and data flow |
| `{folder}.md` | Full reference — detailed component docs with anchors | When you need specific implementation details |

### How to Navigate

1. **Start with `start-here.md`** at the root or target folder — never read source files directly first
2. **Drill down only when needed** — read a subfolder's `start-here.md` only when you need that domain
3. **Use `.ctx` for architecture** — read `{folder}.ctx` to understand how components connect before reading source
4. **Use `.md` for details** — read `{folder}.md#ComponentName` anchors for specific component docs
5. **Follow Backend Counterpart links** — if `start-here.md` has a Backend Counterpart section, those backend files are relevant to your work

### Quick start for a new session

Run `/ctx` (or `/ctx -menu`) to get an interactive picker of all documented areas. Select what you want to work on and the relevant context loads automatically.

Or manually: tell me which area you want to work on and I'll read the corresponding `start-here.md`.

### .ctx File Format

`.ctx` files are **AI context injection files** — NOT diagrams. Never suggest rendering them.

```
# folder/ — Title
# format: ctx/1.0
# last-verified: YYYY-MM-DD
# edges: -> call/render | ~> subscribe/read | => HTTP API call

## Group Name
  ComponentName : What it does [type]
    -> DirectDep1, DirectDep2     # renders/calls
    ~> StoreName                   # subscribes/reads
    => backendRouter               # HTTP API call

## Backend
  backendRouter : Description [backend]
```

**Edge types:**
- `->` = direct call, render, or import
- `~>` = subscribe, read, or observe (reactive)
- `=>` = HTTP API call (frontend to backend router)

**Type tags:** `[root]` `[screen]` `[component]` `[lib]` `[store]` `[service]` `[router]` `[config]` `[ext]` `[dir]` `[type]` `[data]` `[test]` `[doc]` `[backend]`

**Special markers:** `@entry` = primary entry point, `@hot` = frequently modified

### Backend Counterpart Pattern

When a frontend folder makes HTTP API calls, its docs include:
- `start-here.md` — a `## Backend Counterpart` table linking to the relevant backend routers
- `{folder}.ctx` — `=>` edges from calling components to `## Backend` nodes
- `{folder}.md` — a `### Backend API` table listing every endpoint, method, router, and purpose

**Backend router mapping:**
```
/api/game/*      -> backend/routers/game.py
/api/aria/*      -> backend/routers/aria.py
/api/termux/*    -> backend/routers/termux.py
/api/dashboard/* -> backend/routers/dashboard.py
/api/therapy/*   -> backend/routers/therapy.py
/api/kg/*        -> backend/routers/kg.py
/api/products/*  -> backend/routers/products.py
/api/docs/*      -> backend/routers/docs.py
```

### Keeping Docs Updated

| Trigger | Action |
|---------|--------|
| You modified source files in a documented folder | Update the 3 context files and bump `last-verified` to today |
| You added a new file to a documented folder | Add it to `start-here.md`, `.ctx`, and `.md` |
| You added a new API call (`fetch('/api/...')`) | Add it to the Backend Counterpart sections in all 3 files |
| You created a new folder with 3+ files | Generate the 3-file set for it |
| The staleness hook fires a warning | Verify the docs match the code before trusting them |
| Bulk update needed | Run `/ctx -update` (optionally with a path) |

### /ctx Skill Reference

| Command | What it does |
|---------|-------------|
| `/ctx` or `/ctx -menu` | Interactive context loader — pick an area, or type to search |
| `/ctx -search "query"` | Semantic + graph architectural search (runs ctx-to-kg.py) |
| `/ctx -search --impact X` | Impact analysis — what depends on component X, grouped by risk |
| `/ctx -new` | Scaffold the context system on a new project |
| `/ctx -doc [--dry-run]` | Generate docs for an existing codebase (full scan) |
| `/ctx -update [path] [--dry-run]` | Incrementally patch stale or incomplete docs |

### Structural Contextual Embeddings (enhancement layer)

The context system has an optional **semantic + graph search** layer built on structural contextual embeddings — vector representations conditioned on KG neighborhood, not just text.

**Files:**
- `ctx-kg.db` — SQLite KG built from all .ctx files (445 nodes, 528 edges)
- `data/ctx_embeddings.json` — 50-dimensional embeddings for each node
- `scripts/ctx-to-kg.py` — parser, KG builder, embedding generator, search + impact query
- `backend/services/ctx_kg_service.py` — Aria integration (injects architectural context into chat responses)

**How search works:** hybrid scoring — text matching (1.0) + embedding similarity (0.6) + graph traversal (0.8). Surfaces architecturally connected components that grep misses.

**How impact works:** reverse graph traversal from a target node. HIGH risk = direct dependents, MEDIUM = 2-hop transitive, INDIRECT = semantically similar by embedding.

**Rebuilding:** if .ctx files change, rebuild with `python3 scripts/ctx-to-kg.py --root .`

---

## Tech Stack and Conventions

### Frontend

- **Next.js 15** with App Router — all components are `"use client"` (no RSC)
- **React 19** — use `ref` as prop (forwardRef is deprecated), `use()` hook available
- **TypeScript** strict mode — `@/*` path alias maps to `./src/*`
- **Zustand 5** for state — stores in `src/store/`, one store per domain
- **Tailwind CSS** — dark theme with custom tokens:
  - Surface: `bg-[#07070f]` (deep), `bg-white/[0.03]` (glass panels)
  - Accent: `text-gold` (#c9a84c), teal highlights (#4a9e8e)
  - Fonts: Inter (body), JetBrains Mono (code/UI), serif for narrative text
- **No external UI libraries** — all components are hand-built
- **COOP/COEP headers** enabled in `next.config.ts` for SharedArrayBuffer/OPFS (SQLite WASM)

### Backend

- **FastAPI** with Uvicorn — routers in `backend/routers/`, services in `backend/services/`
- **SQLite** for all persistence (game state, therapy sessions, therapist controls, KG)
- **Gemini API** for narrative generation, voice, and search
- **4D Persona Engine** — `backend/persona/` has brand and therapy variants across 4 dimensions (emotional, linguistic, relational, temporal)

### Code style

- Components use named exports: `export function ComponentName() {}`
- Stores use `create<StoreType>()` from Zustand with typed interfaces
- API calls in frontend: either direct `fetch('/api/...')` or through typed wrappers like `gameApi`
- No class components anywhere
- Mobile-first, touch-optimized — the app runs on Android/Termux

---

## Git Workflow

### Repository state
- Single branch: `main`
- Author: Eyal Nof <eyalnof123@gmail.com>
- Clean history — no secrets ever committed

### Pre-commit hook
A pre-commit hook (`scripts/pre-commit-ctx-check.sh`) runs on every commit. It checks:
- If you staged source files in a documented folder
- But did NOT stage the corresponding context files (start-here.md, .ctx, .md)
- If so, it prints a warning suggesting `/ctx -update`

The hook is **non-blocking** — it warns but does not reject commits.

### .gitignore
Excluded from the repo:
- `node_modules/`, `.next/`, `dist/`, `build/` — build artifacts
- `.env`, `.env.local`, `.env.*.local` — secrets
- `*.db`, `*.db-shm`, `*.db-wal`, `*.db-journal` — user session data (except `jewelry-store-kg.db` seed data)
- `models/` — large model weights (downloaded at runtime)
- `__pycache__/` — Python bytecode
- `ctx-skill/` — export convenience copy
- `docs/hf-token.txt` — HuggingFace token
- `tsconfig.tsbuildinfo` — build artifact

### Commit messages
- Short first line describing what and why
- Co-authored with Claude when AI-assisted
- Use conventional style: "Add...", "Fix...", "Update...", "Remove..."

---

## Cost Optimization Rules

These rules minimize token usage and API costs across sessions:

1. **Never read source files before reading context docs** — `start-here.md` tells you what's in the folder without reading every `.tsx` file
2. **Never read `node_modules/`** — use package.json and import statements to understand dependencies
3. **Use `.ctx` files instead of reading all imports** — the architecture graph shows all connections in ~30 lines
4. **Drill down lazily** — read a subfolder's `start-here.md` only when the user's task requires that domain
5. **Use `{folder}.md#anchor` for specifics** — don't read the entire reference doc, read the anchor for the component you need
6. **Prefer `Glob` and `Grep` over full file reads** — find the specific line or file first, then read only what's needed
7. **Backend Counterpart links save cross-reference time** — don't search for which backend files a frontend component uses; the docs tell you
8. **Run `/ctx -menu` at session start** — loads exactly the context needed for the user's task, nothing more
9. **Trust the context system** — if a staleness warning has NOT fired, the docs are current. Don't re-verify by reading source files unless you have a specific reason to doubt them
