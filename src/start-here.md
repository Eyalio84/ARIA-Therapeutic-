<!-- last-verified: 2026-03-26 -->
> Parent: [../start-here.md](../start-here.md)

# src/ — Start Here

> Read this first. Drill into a folder's `start-here.md` for component-level detail.
> Jump to [src.md](src.md) for the full reference or [src.ctx](src.ctx) for the architecture diagram.

## Folder Index

| Folder | What it is | src.md | src.ctx | Drill down |
|---|---|---|---|---|
| **app/** | Next.js App Router — 5 routes (`/`, `/dashboard`, `/docs`, `/game`, `/su`) as thin wrappers around component shells | [app](src.md#app) | app subgraph | [app/start-here.md](app/start-here.md) |
| **components/** | 84 React components — root chat interface (13) plus 6 domain UIs: game (46), dashboard (9), store (8), sdk (5), su (3), roadmap (1) | [components](src.md#components) | components subgraph | [components/start-here.md](components/start-here.md) |
| **lib/** | Core engine — provider-agnostic AriaCore framework, NLKE knowledge engine, SQLite persistence, Gemini Live provider, game voice adapter, visual logic engine, local AI | [lib](src.md#lib) | lib subgraph | [lib/start-here.md](lib/start-here.md) |
| **store/** | 14 independent Zustand stores covering chat, game, dashboard, lab, e-commerce, and SDK state. 6 persist to localStorage | [store](src.md#store) | stores subgraph | [store/start-here.md](store/start-here.md) |
| **types/** | 3 shared TypeScript type files — game engine types (mirrors backend), dashboard analytics types, SQLite WASM ambient declaration | [types](src.md#types) | types subgraph | [types/start-here.md](types/start-here.md) |

## How It Fits Together

```
  app/  ──renders──▶  components/  ──reads/writes──▶  store/
                         │                              ▲
                         │calls                         │updates
                         ▼                              │
                       lib/  ──────reads/writes────────┘
                         │
                         ▼
                   Python backend + Gemini Live API
```

- **app/** is the entry point — `layout.tsx` loads the shell, routes mount domain components
- **components/** is the UI layer — every screen is here, organized by domain
- **store/** is the state layer — components and lib modules share state through 14 Zustand stores
- **lib/** is the brain — AriaCore orchestrates voice AI, NLKE handles knowledge retrieval, SQLite persists sessions and KG
- **types/** is the contract layer — shared type definitions consumed by store, lib, and components

## Domains at a Glance

| Domain | Route | Components | Stores | Lib modules |
|---|---|---|---|---|
| **Chat** (main) | `/` | ChatPanel, VoiceOrb, ChatInput, ConfigDrawer, etc. | chat, ariaMode, tab | aria.ts, AriaCore, GeminiLive |
| **Game** | `/game` | GameShell + 45 game components | game, gameVoice, gameTheme, transcript | gameAriaAdapter, gameApi, logicEngine |
| **Dashboard** | `/dashboard` | DashboardShell + 8 panels | dashboard | useAriaBackend (fetches from backend) |
| **SU Lab** | `/su` | SUShell, SUCanvas, ColorPicker | lab, devLog | AriaEngine, SU persona (~95 functions) |
| **Store** | `/` (tab) | StorePage + 7 commerce components | products, cart | storekit-commands |
| **SDK** | `/` (tab) | SdkDashboard + 4 tools | sdk, kg | useAriaBackend |
| **Docs** | `/docs` | Self-contained page | — | — |
| **Roadmap** | `/` (tab) | RoadmapPage | — | — |
