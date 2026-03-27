<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# components/ — Start Here

> Read this first. Drill into a subfolder's `start-here.md` only when you need that domain.
> Jump to [components.md](components.md) or [components.ctx](components.ctx) for the root-level components.

## Subfolder Index (lazy-load — click to drill down)

| Folder | What it is | Components | Entry point |
|---|---|---|---|
| **dashboard/** | Therapist dashboard — 6-tab clinical panel with KG visualization, mood tracking, flags/notes, session analytics, clinical assessments, and real-time therapist controls. | 9 | [dashboard/start-here.md](dashboard/start-here.md) |
| **game/** | Therapeutic narrative game engine — onboarding, interview, gameplay, transcript, journal drawer, dev tools, voice integration, and 46 UI components. | 46 | [game/start-here.md](game/start-here.md) |
| **su/** | SU Lab — voice-controlled visual canvas with ~95 voice functions, object type renderers, logic editor, and color picker. | 3 | [su/start-here.md](su/start-here.md) |
| **sdk/** | SDK developer dashboard — NAI search, KG explorer, persona visualizer, and introspection tester. | 5 | [sdk/start-here.md](sdk/start-here.md) |
| **store/** | Jewelry e-commerce store — product grid, detail views, cart, category filters, and Jarvis/Aria chat assistant. | 8 | [store/start-here.md](store/start-here.md) |
| **roadmap/** | Project roadmap viewer — 9 themed sections with status tracking and progress bars. | 1 | [roadmap/start-here.md](roadmap/start-here.md) |

## Root-Level Components (13)

These live directly in `components/` and form the **main Aria chat interface** — the default home screen.

| Component | What it is | components.md |
|---|---|---|
| **ChatPanel** | Root orchestrator for the chat view. Composes TopBar, MessageThread, VoiceOrb, ChatInput, ConfigDrawer, SessionHistory, and SnapshotManager. Manages drawer/panel open states. | [ChatPanel](components.md#ChatPanel) |
| **TopBar** | Header bar with Aria logo, status dot, history button, and settings button. | [TopBar](components.md#TopBar) |
| **MessageThread** | Scrollable chat message list with auto-scroll. Renders user, aria, and system messages with role-specific styling. | [MessageThread](components.md#MessageThread) |
| **VoiceOrb** | Central voice control orb. 5-state animated button (idle/connecting/listening/thinking/speaking) with pulse rings and status label. | [VoiceOrb](components.md#VoiceOrb) |
| **ChatInput** | Text input with slash command parsing. Auto-growing textarea, slash menu integration, 7 built-in commands (/connect, /disconnect, /clear, /status, /context, /voice, /mic). | [ChatInput](components.md#ChatInput) |
| **SlashMenu** | Autocomplete dropdown for slash commands. Filters 9 commands by prefix, shows trigger + description. | [SlashMenu](components.md#SlashMenu) |
| **ConfigDrawer** | Right-slide settings drawer. Persona loader, context selector, voice picker (8 voices), and slash command reference. | [ConfigDrawer](components.md#ConfigDrawer) |
| **ConfigPanel** | Sidebar config panel (alternative layout). Connection controls, context/voice/persona display, slash command list. | [ConfigPanel](components.md#ConfigPanel) |
| **PersonaLoader** | Drag-drop zone for `.aria.json` persona cartridges. Validates via Zod, saves to localStorage, shows active persona with reset. | [PersonaLoader](components.md#PersonaLoader) |
| **SessionHistory** | Bottom-sheet panel with named snapshots and recent sessions (last 20). Tap to resume. | [SessionHistory](components.md#SessionHistory) |
| **SnapshotManager** | Inline save form for naming and persisting the current session as a permanent snapshot. | [SnapshotManager](components.md#SnapshotManager) |
| **TabBar** | Top navigation with SDK/Store/Roadmap tabs, Aria status dot, and page links (Game, SU Lab, Dash, Docs). | [TabBar](components.md#TabBar) |
| **TabContainer** | Lazy-loading tab router. Uses `React.lazy()` + `Suspense` to code-split SdkDashboard, StorePage, and RoadmapPage. | [TabContainer](components.md#TabContainer) |

## Cross-references

| Folder | What it provides | Start here |
|---|---|---|
| **app/** | Next.js routes that mount these components | [app/start-here.md](../app/start-here.md) |
| **store/** | Zustand state stores consumed by these components | [store/start-here.md](../store/start-here.md) |
| **lib/** | Aria core engine, adapters, and game voice glue | [lib/start-here.md](../lib/start-here.md) |
| **types/** | Shared TypeScript type definitions | [types/start-here.md](../types/start-here.md) |
