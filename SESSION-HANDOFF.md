# Session Handoff — Aria Personal

**Author:** Eyal Nof
**Date:** 2026-03-28
**Previous session:** ~18 hours (March 27 evening → March 28 morning)
**Read CLAUDE.md first** — it has the full project architecture. This document adds session context.

---

## What Happened In The Last Session

### The Big Arc (chronological)

1. **Context system upgrades** — Added `/ctx -search` (semantic + graph search), `--impact` (reverse traversal risk analysis), `/ctx -upkeep` (automated maintenance for `/loop` and `/schedule`)
2. **Structural contextual embeddings** — Discovered that .ctx files ARE a knowledge graph. Built `ctx-to-kg.py` (766 lines): parser → SQLite KG (445 nodes, 528 edges) → 50d embeddings → hybrid search. Named the concept.
3. **Benchmark validation** — Validated on 5 open-source projects (FastAPI, Zustand, Excalidraw, Hono, Pydantic). 12.8 results per query that grep misses, across 25 queries.
4. **Aria as project expert** — `CtxKGService` injects architectural context into Aria's chat responses.
5. **Formalization** — Wrote the spec (`STRUCTURAL-CONTEXTUAL-EMBEDDINGS-SPEC.md`), the crystallization document, the interactive planning pattern.
6. **Bugfixes** — Game router not mounted (added to main.py with full service init), GameShell interview error recovery guard, docs page array guard, backend port alignment (8095).
7. **Weekly report** — `docs/WEEK1-FRIDAY-REPORT.md`
8. **Vigil extraction** — Copied (NOT moved) structural embeddings research + runtime prototypes + market research into `/root/vigil/` as a separate project. Aria-personal is 100% intact.
9. **Market research** — Live web search confirmed: no tool does the full docs-code-runtime comparison loop. Swimm ($8.8M revenue) proves the market. Full report at `/root/vigil/docs/MARKET-RESEARCH.md`.

### Files Modified (in aria-personal)

| File | What changed |
|------|-------------|
| `backend/main.py` | Added game router import, game service initialization (InterviewEngine, Generator, Runtime), CtxKGService |
| `backend/services/ctx_kg_service.py` | NEW — architectural KG search for Aria responses |
| `backend/services/response_service.py` | Added optional ctx_kg parameter |
| `backend/config.py` | Added CTX_KG_PATH, CTX_EMBEDDINGS_PATH |
| `src/components/game/GameShell.tsx` | Added interview error recovery guard (resets to onboarding if question is null/error) |
| `src/app/docs/page.tsx` | Array guard on categories fetch |
| `src/app/game/reset/page.tsx` | NEW — localStorage reset utility page |
| `CLAUDE.md` | Updated with -search, --impact, -upkeep, structural embeddings section |
| `.claude/skills/ctx/SKILL.md` | Added MODE: SEARCH, MODE: UPKEEP, -upkeep in description |
| `scripts/ctx-to-kg.py` | NEW — KG builder + embeddings + search + impact (766 lines) |
| `scripts/generate_basic_ctx.py` | NEW — heuristic .ctx generator (345 lines) |
| `scripts/benchmark-ctx-kg.py` | NEW — 5-project benchmark runner (421 lines) |
| `docs/STRUCTURAL-CONTEXTUAL-EMBEDDINGS-SPEC.md` | NEW — formal spec |
| `docs/BENCHMARK-RESULTS.md` | NEW — 5-project validation data |
| `docs/CTX-SKILL-README.md` | NEW — crystallization document |
| `docs/INTERACTIVE-PLANNING-PATTERN.md` | NEW — collaborative planning pattern |
| `docs/WEEK1-FRIDAY-REPORT.md` | NEW — weekly summary |
| `ctx-skill/` | Added ctx-to-kg.py, generate_basic_ctx.py, README.md to portable toolkit |
| All `backend/` context docs | Updated last-verified to 2026-03-28, added ctx_kg_service, game services |
| `src/components/game/` context docs | Updated last-verified to 2026-03-28, added GameShell error recovery |

### Context System State

- 24 documented folders with 3-file sets (start-here.md + .ctx + .md)
- `backend/` and `backend/services/` updated to 2026-03-28
- `src/components/game/` updated to 2026-03-28
- Pre-commit hook warns on ctx drift
- Staleness hook fires on stale doc reads
- KG: 445 nodes, 528 edges in ctx-kg.db
- Embeddings: 445 vectors × 50d in data/ctx_embeddings.json
- `/ctx -upkeep` now available for automated maintenance

---

## What Vigil Is (and isn't)

**Vigil** is a SEPARATE project at `/root/vigil/` that was created by COPYING (not moving) pieces from aria-personal. It's a developer intelligence tool for docs-code-runtime alignment detection.

**Aria-personal lost nothing.** All 412 tracked files are intact. Vigil has copies of:
- Scripts (ctx-to-kg.py, generate_basic_ctx.py, benchmark-ctx-kg.py)
- Docs (specs, benchmarks, market research)
- Embeddings data
- the-game prototypes (1.html, go2.html, 3.html, shooter-matrix.html, io-prototype.html)
- Its own CLAUDE.md with a full implementation plan

**The boundary:** Vigil research and Aria development happen in separate sessions. Upgrades can flow between them in the future, but they're independent projects now.

---

## What Eyal Wants To Do Next

### The Goal: Foundation, Not Features

This is a **consolidation phase** — no new major builds. The focus is:

1. **DevHub visibility** — It's buried in `src/components/game/devpanel/`. It should be accessible from anywhere in the app, not just the game. Consider making it a global overlay or a top-level route.

2. **Landing page / GUI OS** — Replace the current TabBar (SDK/Store/Roadmap) with a landing page that presents the app's sections as "apps" in a visual OS-like interface. Think launcher, not tab bar. The pages (game, store, dashboard, SDK, chat) become app icons.

3. **Layout/UX refactoring** — The current navigation is functional but doesn't reflect the app's actual scope. Aria is a full platform (therapy game + voice canvas + store + dashboard + SDK tools + chat), but the UI hides most of it behind tabs.

4. **Aria expert polish** — The CtxKGService integration works but needs refinement. When should Aria inject architectural context vs product context? How does it know the difference?

5. **Bugfix/polish** — Any remaining issues from the rapid development sprint. The game works now (interview → onboarding → play), but edge cases may exist.

6. **General upkeeping** — Run `/ctx -upkeep` to ensure all docs are aligned after the changes.

### What NOT to do
- No new game features
- No new store features
- No structural embeddings work (that's Vigil now)
- No deployment changes
- No new documentation system features (that's stable)

---

## Current Architecture Quick Reference

### Running the app
```bash
# Backend (port 8095 — matches Next.js proxy)
python3 -c "
import sys, os
sys.path.insert(0, 'backend')
os.chdir('backend')
import config; config.PORT = 8095
from main import app
import uvicorn
uvicorn.run(app, host='0.0.0.0', port=8095)
" &

# Frontend (port 3001)
npm run dev
```

### Backend services (what's wired in main.py)
- **NAIService** — knowledge graph search (jewelry KG)
- **PersonaService** — 4D persona engine (emotional × linguistic × relational × temporal)
- **ResponseService** — orchestrator (NAI + persona + optional ctx_kg + optional introspection)
- **CtxKGService** — architectural search from .ctx files (optional, graceful degradation)
- **GameInterviewEngine** — therapy interview flow
- **GameGenerator** — interview → game config via Gemini API
- **GameRuntime** — game execution engine

### Routers mounted
- `/api/aria/*` — chat, state, query, memory, health, validate
- `/api/products/*` — jewelry store
- `/api/kg/*` — KG explorer
- `/api/game/*` — interview, gameplay, voice-config, cartridges, saves

### Frontend pages
- `/` — Home (TabBar with SDK/Store/Roadmap tabs)
- `/game` — Therapy game (onboarding → interview → generating → gameplay)
- `/game/reset` — localStorage reset utility
- `/docs` — Documentation viewer

### Key stores
- `chat.ts` — messages, status, voice, context (used by ChatPanel)
- `game.ts` — game state, persisted to localStorage as "aria-game-state"
- `lab.ts` — SU Lab canvas objects
- `gameVoice.ts` — voice connection state for game
- `gameTheme.ts` — game visual theme
- `ariaMode.ts` — current Aria mode (game/su)
- `dashboard.ts` — therapist dashboard state
- `transcript.ts` — session transcript
- `tab.ts` — current tab selection
- `kg.ts` — KG explorer state

### External path-injected dependencies
- PersonaEngine: `/storage/self/primary/Download/ari1/framework/`
- NAI IntentGraphEngine: `/storage/self/primary/Download/gemini-3-pro/AI-LAB/docs/py-query/nai/`

These are loaded via `sys.path.insert()` in backend code. They're external to the repo.

### Known issues
- `docs/` page needs the docs router mounted in main.py (currently not mounted — only aria, products, kg, game are)
- Backend port must be 8095 to match Next.js proxy in next.config.ts
- Game voice-config reads API key from `/storage/emulated/0/Download/perplexity/gemini.txt`
- Frontend needs `.env.local` with `NEXT_PUBLIC_GEMINI_API_KEY` for the chat VoiceOrb

---

## Git State

```
Branch: main
Remote: https://github.com/Eyalio84/ARIA-Therapeutic-.git
Latest commit: 35dec9c Add ctx-skill crystallization document
Total commits: 17
Tracked files: 412
```

Unstaged changes:
- `backend/main.py` (game router + services added)
- `src/components/game/GameShell.tsx` (error recovery guard)
- `src/app/docs/page.tsx` (array guard)
- `src/app/game/reset/page.tsx` (new file)
- `.claude/skills/ctx/SKILL.md` (-upkeep mode added)
- `CLAUDE.md` (-upkeep in skill reference)

These should be committed before starting new work.
