<!-- last-verified: 2026-03-27 -->
> Parent: [../start-here.md](../start-here.md)

# store/ — Start Here

> Read this first. Jump to [store.md](store.md) or [store.ctx](store.ctx) only for the store you need.

| Store | What it is | store.md | store.ctx |
|---|---|---|---|
| **chat** | Chat messages, Aria voice status (5 states), active context/voice, mic state | [chat](store.md#chat) | chat node |
| **tab** | Active tab navigation ("sdk" / "store" / "roadmap") | [tab](store.md#tab) | tab node |
| **ariaMode** | Toggles game/su mode. Persisted to localStorage | [ariaMode](store.md#ariaMode) | ariaMode node |
| **game** | Main game state — screens, interview, config, stats, narratives, moods. Persisted | [game](store.md#game) | game node |
| **gameVoice** | Voice orb state for game mode (idle/connecting/listening/thinking/speaking) | [gameVoice](store.md#gameVoice) | gameVoice node |
| **gameTheme** | 4 color theme presets (Classic, Ocean Depths, Deep Space, Noir City). Persisted | [gameTheme](store.md#gameTheme) | gameTheme node |
| **transcript** | Game transcript logger with typed entries and JSON export. Persisted | [transcript](store.md#transcript) | transcript node |
| **dashboard** | Therapist dashboard — mood, flags, notes, achievements, choice analysis. Fetches from backend | [dashboard](store.md#dashboard) | dashboard node |
| **devLog** | Dev console buffer (max 500 entries) with level/source filtering | [devLog](store.md#devLog) | devLog node |
| **lab** | Visual logic editor — 12 object types, 7 logic blocks, wires, undo/redo, presets. Persisted | [lab](store.md#lab) | lab node |
| **products** | Product inventory for jewelry store. Fetches from backend | [products](store.md#products) | products node |
| **cart** | Shopping cart — add/remove, quantity, gift note, subtotal | [cart](store.md#cart) | cart node |
| **kg** | Knowledge graph CRUD and xyflow visualization. Fetches from backend | [kg](store.md#kg) | kg node |
| **sdk** | SDK testing — NAI search, 4D persona, introspection validation. Fetches from backend | [sdk](store.md#sdk) | sdk node |

## Cross-references

| Folder | What it provides | Start here |
|---|---|---|
| **components/** | UI components that consume these stores | [components/start-here.md](../components/start-here.md) |
| **lib/** | Aria core engine and adapters that read/write store state | [lib/start-here.md](../lib/start-here.md) |
| **types/** | Type definitions imported by game, transcript, and dashboard stores | [types/start-here.md](../types/start-here.md) |
| **app/** | Next.js routes that mount store-consuming components | [app/start-here.md](../app/start-here.md) |
