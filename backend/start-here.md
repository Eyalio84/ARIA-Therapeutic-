<!-- last-verified: 2026-03-28 -->
> Parent: [../start-here.md](../start-here.md)

# backend/ — Start Here

> Read this first. Jump to [backend.md](backend.md) or [backend.ctx](backend.ctx) only for the component you need.
> For subfolder details, follow the lazy links in Section 1.

## Section 1 — Subfolder Index

| Folder | What it is | Files | Entry point |
|---|---|---|---|
| **data** | KG builders, JSON psychology datasets (CBT/DBT/ACT/IFS/MI), clinical cartridges, and runtime SQLite databases | 40 | [data/start-here.md](data/start-here.md) |
| **persona** | 4D persona dimension computers — Emotional (X), Relational (Y), Linguistic (Z), Temporal (T) — with brand and therapy variants | 9 | [persona/start-here.md](persona/start-here.md) |
| **routers** | FastAPI route handlers for all API endpoints — aria, game, therapy, dashboard, products, KG, docs, termux, computer-use | 10 | [routers/start-here.md](routers/start-here.md) |
| **services** | Business logic layer — game pipeline (interview → generator → runtime), therapy orchestration, NAI search, Gemini narrative, device state, persistence, architectural KG | 22 | [services/start-here.md](services/start-here.md) |
| **templates** | Self-contained game client SPA (game.html) — onboarding, interview, gameplay, Gemini Live voice, transcript logging | 1 | [templates/start-here.md](templates/start-here.md) |
| **tests** | Comprehensive test suite — unit, integration, adversarial prompt injection, persona stability, therapy safety | 14 | [tests/start-here.md](tests/start-here.md) |

## Section 2 — Root-Level Components

| Component | What it is | backend.md | backend.ctx |
|---|---|---|---|
| **main.py** | FastAPI brand assistant server (port 8000) — initializes NAI, Persona, Introspection, CtxKG services, game services (Interview, Generator, Runtime), and wires aria/products/kg/game routers | [main](backend.md#main) | main node |
| **serve_game.py** | FastAPI game engine server (port 8080) — initializes game, therapy, dashboard services, wires 6 routers, serves game.html, includes FunctionGemma inference | [serve_game](backend.md#serve_game) | serve_game node |
| **config.py** | Central configuration — paths, API keys, server settings, brand identity, and Aria's base system prompt | [config](backend.md#config) | config node |
| **requirements.txt** | Core Python dependencies — fastapi, uvicorn, pydantic | [requirements](backend.md#requirements) | requirements node |
