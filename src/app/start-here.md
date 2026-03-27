<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# app/ — Start Here

> Read this first. Jump to [app.md](app.md) or [app.ctx](app.ctx) only for the route you need.
> For the UI components these routes render, see [../components/start-here.md](../components/start-here.md).

| Component | What it is | app.md | app.ctx |
|---|---|---|---|
| **layout** | Root HTML layout — loads fonts, sets metadata ("Aria"), applies dark mode | [layout](app.md#layout) | layout node |
| **page** | Home route — renders TabBar + TabContainer in a full-viewport flex container | [page](app.md#page) | home node |
| **globals.css** | Global stylesheet — dark theme, glass-morphism, orb/drawer/game animations | [globals](app.md#globals) | globals.css node |
| **dashboard/page** | /dashboard route — thin wrapper rendering DashboardShell | [DashboardPage](app.md#DashboardPage) | dashboard node |
| **docs/page** | /docs route — self-contained markdown doc viewer/editor with safe rendering and edit mode | [DocsPage](app.md#DocsPage) | docs node |
| **game/page** | /game route — thin wrapper rendering GameShell | [GamePage](app.md#GamePage) | game node |
| **su/page** | /su route — thin wrapper rendering SUShell | [SUPage](app.md#SUPage) | su node |

## Cross-references

| Folder | What it provides | Start here |
|---|---|---|
| **components/** | All UI shells and components these routes render | [components/start-here.md](../components/start-here.md) |
| **store/** | Zustand state stores consumed by components | [store/start-here.md](../store/start-here.md) |
| **lib/** | Aria core engine, adapters, and utilities | [lib/start-here.md](../lib/start-here.md) |
| **types/** | Shared TypeScript type definitions | [types/start-here.md](../types/start-here.md) |
