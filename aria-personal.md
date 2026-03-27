<!-- last-verified: 2026-03-26 -->

# aria-personal.md — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library** | `/root/aria-personal` |
| **Purpose** | Therapeutic AI voice assistant — real-time bidirectional voice (Gemini Live), therapeutic narrative games, visual composition canvas (SU Lab), therapist dashboard, and on-device FunctionGemma inference. Runs on Android/Termux (Galaxy S21 FE). |
| **Framework / Stack** | Next.js 15 + React 19 + Zustand (frontend), FastAPI + Python 3 (backend), Gemini Live WebSocket (voice), SQLite WASM + OPFS (client-side persistence) |
| **Entry point** | `package.json` → `next dev -p 3001` (frontend), `backend/serve_game.py` (backend, port 8095) |
| **External dependencies** | Gemini Live API, HuggingFace (model hosting), SQLite WASM, React Flow, Zod |
| **Root-level file count** | 8 config/build files |
| **Child folders** | 7 (src, backend, docs, data, scripts, context-packets, models) |
| **Architecture style** | Monorepo — Next.js frontend proxies to FastAPI backend via rewrites, voice via WebSocket, on-device AI via FunctionGemma |

## File Tree

```
aria-personal/
├── package.json              # Project manifest — deps, scripts, metadata
├── next.config.ts            # Next.js config — API proxy to :8095, COOP/COEP headers for OPFS
├── tailwind.config.ts        # Tailwind theme — dark surface palette, aria purple, gold accents
├── tsconfig.json             # TypeScript — ES2017, strict, bundler resolution, @/* path alias
├── postcss.config.js         # PostCSS — tailwindcss + autoprefixer plugins
├── next-env.d.ts             # Next.js generated type declarations
├── README.md                 # Project overview, architecture diagram, quick start
├── CONTEXT-PRESERVATION-2026-03-20-SESSION2.md  # Legacy session context (pre context-packets/)
├── src/                      # [188 files] Next.js frontend — pages, components, stores, types, lib
├── backend/                  # [145 files] FastAPI backend — routers, services, persona, data, tests
├── docs/                     # [28 files] Research docs, plans, therapy KB, game prototypes
├── data/                     # [6 files] FunctionGemma fine-tuning — dataset generation, training
├── scripts/                  # [5 files] FunctionGemma download and inference utilities
├── context-packets/          # [10 files] Session context preservation packets
├── models/                   # [empty] Reserved for local model weights (FunctionGemma, Kokoro)
└── node_modules/             # [excluded] NPM dependencies
```

## Root-Level File Index

<a id="package-json"></a>
### package.json

**Project manifest defining dependencies, scripts, and metadata for the Aria Personal monorepo.**

- **Scripts**: `dev` (next dev on port 3001), `build`, `start`, `typecheck`
- **Key deps**: next 15, react 19, zustand 5, zod, sqlite-wasm, react-flow, react-hot-toast
- **Dev deps**: @google/genai, typescript 5.7, tailwindcss 3.4, postcss, autoprefixer
- **Connects to:** next.config.ts (build config), tsconfig.json (TS config), all src/ code

<a id="next-config"></a>
### next.config.ts

**Next.js configuration — API proxy rewrites and cross-origin isolation headers for SQLite WASM/OPFS.**

- Rewrites `/api/*` → `http://localhost:8095/api/*` (FastAPI backend proxy)
- Sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` for SharedArrayBuffer support
- API routes get permissive CORS (`Access-Control-Allow-Origin: *`)
- **Connects to:** backend/serve_game.py (proxy target), src/lib/ (SQLite WASM client)

<a id="tailwind-config"></a>
### tailwind.config.ts

**Tailwind CSS theme configuration defining the Aria design language.**

- Custom colors: surface (#0f0f0f), panel (#161616), border (#262626), aria purple (#7c6af7), gold palette (5 shades)
- Fonts: Inter (sans), JetBrains Mono (mono)
- Content scan: `./src/**/*.{js,ts,jsx,tsx,mdx}`
- **Connects to:** all src/ components (consumed via Tailwind classes), postcss.config.js

<a id="tsconfig"></a>
### tsconfig.json

**TypeScript compiler configuration — strict mode, bundler module resolution, `@/*` path alias.**

- Target: ES2017, JSX: preserve, strict: true, incremental: true
- Path alias: `@/*` → `./src/*`
- Next.js plugin enabled
- **Connects to:** all .ts/.tsx files in src/

<a id="postcss-config"></a>
### postcss.config.js

**PostCSS plugin chain — tailwindcss and autoprefixer.** Pure configuration, no custom logic.

- **Connects to:** tailwind.config.ts (Tailwind plugin), package.json (postcss/autoprefixer deps)

<a id="next-env"></a>
### next-env.d.ts

**Auto-generated Next.js type declarations.** Do not edit — regenerated on build.

- **Connects to:** tsconfig.json (included in compilation)

<a id="README"></a>
### README.md

**Project overview document — architecture diagram, quick start instructions, key documentation links, and feature summaries for SU Lab and FunctionGemma pipeline.**

- **Connects to:** all subfolders (referenced in architecture diagram), docs/ (linked documentation)

<a id="CONTEXT-PRESERVATION"></a>
### CONTEXT-PRESERVATION-2026-03-20-SESSION2.md

**Legacy session context packet from before the context-packets/ directory was established.** Preserved for historical continuity.

- **Connects to:** context-packets/ (superseded by this directory)

## External Dependencies Summary

### Libraries

| Library | Purpose |
|---|---|
| next 15 | React framework — SSR, routing, API rewrites |
| react 19 | UI rendering with hooks, Suspense, lazy loading |
| zustand 5 | Lightweight client state management |
| zod | Runtime schema validation (persona cartridges, API payloads) |
| @sqlite.org/sqlite-wasm | Client-side SQLite via OPFS for persistent local storage |
| @xyflow/react + reactflow | Node-based graph visualization (KG explorer, dashboards) |
| react-hot-toast | Notification toasts |
| @google/genai | Gemini API client (dev dependency — used for voice and inference) |
| tailwindcss | Utility-first CSS framework |
| typescript 5.7 | Type checking and compilation |

### External Services

| Service | Purpose |
|---|---|
| Gemini Live API | Real-time bidirectional voice via WebSocket (BidiGenerateContent) |
| HuggingFace Hub | Model hosting and AutoTrain for FunctionGemma fine-tuning |
| FastAPI backend (port 8095) | Python API server — game engine, therapy, KG, persona, device APIs |
