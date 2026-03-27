<!-- last-verified: 2026-03-27 -->

# store/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/store/` |
| **Purpose** | Zustand state stores — all client-side state for Aria, game, dashboard, lab, and e-commerce |
| **Framework / stack** | Zustand, TypeScript, Next.js (client components) |
| **Entry point** | No single entry — each store is imported independently |
| **External dependencies** | `zustand`, `zustand/middleware` (persist), `@xyflow/react`, `@/types/game`, `@/types/dashboard`, `@/lib/gameDevLogger` |
| **Component/file count** | 14 stores |
| **Architecture style** | Independent Zustand stores with optional localStorage persistence |

## File Tree

```
store/
├── ariaMode.ts       # Toggle game/su mode (persisted)
├── cart.ts           # Shopping cart state
├── chat.ts           # Chat messages and voice status
├── dashboard.ts      # Therapist dashboard analytics
├── devLog.ts         # Dev console log entries
├── game.ts           # Main game state (persisted)
├── gameTheme.ts      # Game color theme presets (persisted)
├── gameVoice.ts      # Voice orb state for game
├── kg.ts             # Knowledge graph CRUD + visualization
├── lab.ts            # Visual logic editor canvas (persisted)
├── products.ts       # Product inventory for store
├── sdk.ts            # SDK testing (NAI, persona, introspection)
├── tab.ts            # Tab navigation state
└── transcript.ts     # Game transcript logging (persisted)
```

## Component/Module Index

<a id="ariaMode"></a>
### ariaMode.ts

**Toggles between "game" and "su" mode. Persisted to localStorage.**

- **Connects to:** Consumed by game and SU components to switch Aria behavior

---

<a id="cart"></a>
### cart.ts

**Shopping cart with add/remove/quantity, gift note, and subtotal calculation.**

- **Connects to:** `products` store (product data), store UI components

---

<a id="chat"></a>
### chat.ts

**Chat message list and Aria voice status (idle/connecting/listening/thinking/speaking). Tracks active context, active voice, mic state, and connection status.**

- **Connects to:** `@/components/ChatPanel`, `@/components/MessageThread`, `@/components/VoiceOrb`, `@/lib/aria.ts`

---

<a id="dashboard"></a>
### dashboard.ts

**Full therapist dashboard state — mood history, flagged moments, session notes, achievements, choice timeline, mirror analytics, antagonist analysis, and session recaps. Fetches from `/api/dashboard/` endpoints.**

- **Connects to:** `@/types/dashboard`, `/api/dashboard/*` (backend), `@/components/dashboard/*`

---

<a id="devLog"></a>
### devLog.ts

**Dev console log buffer (max 500 entries) with level/source filtering. Used by DevHub for debugging.**

- **Connects to:** `@/components/game/DevHub`

---

<a id="game"></a>
### game.ts

**Main game state — screens, onboarding, interview progress, game config, player stats, turn count, narratives, mood colors, map nodes, choices, and actions. Persisted to localStorage. Logs state changes via devLogger.**

- **Connects to:** `@/types/game`, `@/lib/gameDevLogger`, `@/components/game/*`

---

<a id="gameTheme"></a>
### gameTheme.ts

**Game color theme system with 4 presets (Classic/Ocean Depths/Deep Space/Noir City). Each preset defines background layers, accent colors, and mood overrides. Persisted to localStorage.**

- **Connects to:** `@/components/game/*` (via CSS variables)

---

<a id="gameVoice"></a>
### gameVoice.ts

**Voice orb state for game mode — tracks orb state (idle/connecting/listening/thinking/speaking), connection, and last spoken text.**

- **Connects to:** `@/components/game/VoiceOrb`, `@/lib/gameAriaAdapter.ts`

---

<a id="kg"></a>
### kg.ts

**Knowledge graph CRUD and visualization state. Manages xyflow nodes/edges, selection, editing, and stats. Fetches from `/api/kg/*` endpoints. Defines 7 node type colors.**

- **Connects to:** `@xyflow/react`, `/api/kg/*` (backend), `@/components/sdk/KGExplorer`

---

<a id="lab"></a>
### lab.ts

**Visual logic editor canvas — manages canvas objects (12 types), logic graph (7 block types), wires, listeners, variables, presets, undo/redo (30 states), zoom, grid, and play mode. Persisted to localStorage. The largest and most complex store.**

- 12 object types: shape, image, button, text, input, timer, container, slider, toggle, progress, dropdown, counter
- 7 logic block types: if_else, compare, math, delay, set_variable, get_variable, loop, collision
- Full project export/import with ID regeneration
- **Connects to:** `@/components/su/*`, `@/lib/logicEngine.ts`

---

<a id="products"></a>
### products.ts

**Product inventory for the jewelry e-commerce store. Fetches product lists and enriched details from backend. Maps product IDs to hardcoded image URLs.**

- **Connects to:** `/api/products/*` (backend), `@/components/store/*`

---

<a id="sdk"></a>
### sdk.ts

**SDK testing dashboard state — NAI search (with score decomposition), 4D persona computation, and introspection validation. All three sections fetch from `/api/aria/*` endpoints.**

- **Connects to:** `/api/aria/query`, `/api/aria/state`, `/api/aria/validate` (backend), `@/components/sdk/*`

---

<a id="tab"></a>
### tab.ts

**Simple tab navigation state. Tracks active tab: "sdk" | "store" | "roadmap".**

- **Connects to:** `@/components/TabBar`, `@/components/TabContainer`

---

<a id="transcript"></a>
### transcript.ts

**Game transcript logger with persistence. Logs typed entries (user/aria/game/system) with metadata. Supports JSON export with session context.**

- **Connects to:** `@/types/game`, `@/components/game/TranscriptDrawer`

---

## External Dependencies Summary

### Stores / State

| Dependency | Purpose |
|---|---|
| `zustand` | State management (all stores) |
| `zustand/middleware` (persist) | localStorage persistence (6 stores) |
| `@xyflow/react` | React Flow node/edge types (kg store) |

### Libraries

| Library | Purpose |
|---|---|
| `@/types/game` | Game engine types (game, transcript stores) |
| `@/types/dashboard` | Dashboard analytics types |
| `@/lib/gameDevLogger` | Dev logging singleton (game store) |

### Backend APIs

| Endpoint | Store |
|---|---|
| `/api/products/*` | products |
| `/api/aria/*` | sdk |
| `/api/kg/*` | kg |
| `/api/dashboard/*` | dashboard |

### Persistence Keys

| localStorage Key | Store |
|---|---|
| `aria-game-state` | game |
| `aria-transcript` | transcript |
| `aria-mode` | ariaMode |
| `aria-theme` | gameTheme |
| `aria-lab-state-v2` | lab |
