<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# types/ — Start Here

> Read this first. Jump to [types.md](types.md) or [types.ctx](types.ctx) only for the type file you need.

| Type File | What it is | types.md | types.ctx |
|---|---|---|---|
| **dashboard.ts** | Therapist dashboard types — mood (1-5 scale), flagged moments (4 severity levels), session notes, achievements, choice analysis, mirror analytics, and the `FullDashboard` aggregate | [dashboard](types.md#dashboard) | dashboard node |
| **game.ts** | Game engine types mirroring backend dataclasses — cartridges, NPCs, locations, items, quests, map, interview, transcript entries, and `GameConfig` aggregate | [game](types.md#game) | game node |
| **sqlite-wasm.d.ts** | Ambient module declaration for `@sqlite.org/sqlite-wasm` — provides `initSqlite` type | [sqlite-wasm](types.md#sqlite-wasm) | sqlite node |

## Cross-references

| Folder | What it provides | Start here |
|---|---|---|
| **store/** | Zustand stores that import these types | [store/start-here.md](../store/start-here.md) |
| **lib/** | Core engine modules that use these types | [lib/start-here.md](../lib/start-here.md) |
| **components/** | UI components that render data shaped by these types | [components/start-here.md](../components/start-here.md) |
| **app/** | Next.js routes | [app/start-here.md](../app/start-here.md) |
