<!-- last-verified: 2026-03-26 -->

# aria-personal/ — Start Here

> Read this first. Drill into a subfolder's `start-here.md` only when you need that domain.
> Jump to [aria-personal.md](aria-personal.md) or [aria-personal.ctx](aria-personal.ctx) for root-level config details.

## Section 1 — Subfolder Index

| Folder | What it is | Files | Entry point |
|---|---|---|---|
| **src** | Next.js 15 + React 19 frontend — Aria chat interface, therapeutic game, SU Lab voice canvas, therapist dashboard, SDK tools, e-commerce store, Zustand state, and shared libraries | 188 | [src/components/start-here.md](src/components/start-here.md) |
| **backend** | FastAPI Python server — API routers (game, aria, therapy, dashboard, KG, termux, docs), business logic services, 4D persona engine, psychology datasets, and test suite | 145 | [backend/start-here.md](backend/start-here.md) |
| **docs** | Research documentation — therapy game design, psychology data sources, voice assistant reference, SU Lab reports, weekly progression logs, plans, and therapy knowledge base | 28 | [docs/start-here.md](docs/start-here.md) |
| **context-packets** | Session context preservation packets — Claude Code session handoffs capturing decisions, progress, and next steps for cross-session continuity | 10 | [context-packets/start-here.md](context-packets/start-here.md) |
| **data** | FunctionGemma fine-tuning pipeline — dataset generation (1,448 examples), HuggingFace training scripts, train/eval JSONL splits, and Colab notebook | 6 | [data/start-here.md](data/start-here.md) |
| **scripts** | FunctionGemma utilities — model download from HuggingFace, inference variants (native, HF Transformers, CTranslate2), and Gemini Live test harness | 5 | [scripts/start-here.md](scripts/start-here.md) |
| **models** | Reserved for local model weights (FunctionGemma 270M, Kokoro 82M) — currently empty, populated at runtime by download scripts | 0 | — |

## Section 2 — Root-Level Config

| Component | What it is | aria-personal.md | aria-personal.ctx |
|---|---|---|---|
| **package.json** | Project manifest — next 15, react 19, zustand 5, zod, sqlite-wasm, scripts for dev/build/start | [package-json](aria-personal.md#package-json) | PKG node |
| **next.config.ts** | API proxy (`/api/*` → `:8095`), COOP/COEP headers for SharedArrayBuffer/OPFS, CORS for API routes | [next-config](aria-personal.md#next-config) | NEXT_CFG node |
| **tailwind.config.ts** | Dark theme — surface/panel/border grays, aria purple (#7c6af7), gold accent palette, Inter + JetBrains Mono fonts | [tailwind-config](aria-personal.md#tailwind-config) | TW_CFG node |
| **tsconfig.json** | Strict TypeScript, ES2017 target, bundler resolution, `@/*` → `./src/*` path alias | [tsconfig](aria-personal.md#tsconfig) | TS_CFG node |
| **postcss.config.js** | PostCSS plugin chain — tailwindcss + autoprefixer | [postcss-config](aria-personal.md#postcss-config) | POSTCSS node |
| **README.md** | Project overview — architecture diagram, quick start, key doc links, SU Lab and FunctionGemma summaries | [README](aria-personal.md#README) | README node |

## Quick Orientation

```
You are here: aria-personal/start-here.md (project root)
                │
                ├── src/ ─────────── Frontend (Next.js + React)
                │   ├── app/         Pages and routing
                │   ├── components/  UI components (chat, game, SU Lab, dashboard, store, SDK)
                │   ├── store/       Zustand state stores
                │   ├── lib/         AriaCore engine, adapters, game voice glue
                │   └── types/       Shared TypeScript types
                │
                ├── backend/ ─────── API Server (FastAPI + Python)
                │   ├── routers/     HTTP endpoints
                │   ├── services/    Business logic
                │   ├── persona/     4D persona dimension computers
                │   ├── data/        Psychology datasets + KG builders
                │   └── tests/       Test suite
                │
                ├── docs/ ────────── Research & Plans
                ├── data/ ────────── FunctionGemma Training Data
                ├── scripts/ ─────── FunctionGemma Utilities
                └── context-packets/ Session Continuity
```
