# Game Component Registry

> Living document. Updated as components are created. Every component has: path, purpose, data flow, relationships.

## Architecture Overview

```
/game (page.tsx)
  └── GameShell (screen router + theme provider)
      ├── OnboardingScreen
      │   ├── SaveCard ×N (if saves exist)
      │   ├── VibeCard ×3
      │   ├── DepthSelector
      │   └── CartridgePicker → CartridgeCard ×N
      ├── InterviewScreen
      │   ├── InterviewProgress
      │   ├── AriaMessage
      │   ├── MirrorBubble
      │   ├── ConversationTrail
      │   └── InterviewInput
      ├── GeneratingScreen
      └── GameScreen
          ├── GameTopBar [☰ Title T3 ✨ 📄 </>]
          ├── GameMap (horizontal nodes)
          ├── StatsBar
          ├── NarrativePanel + QuestChoices
          ├── ActionsBar (collapsible)
          ├── GameInput
          ├── RestOverlay
          ├── GameVoiceOrb + VoiceStatus
          ├── DrawerHandle (left edge)
          ├── GameDrawer (left 80% overlay)
          │   ├── DrawerMap (React Flow circles)
          │   ├── DrawerInventory (emoji grid)
          │   ├── DrawerQuests (journal)
          │   ├── DrawerCompanion (avatar + bond)
          │   └── Save button
          ├── BurgerMenu (left 75% overlay)  [☰]
          ├── AriaPanel (full overlay)       [✨]
          ├── TranscriptScreen (full overlay) [📄]
          └── DevHub (portal, full overlay)   [</>]
```

## Access Layers (3-tier separation)

| Layer | Audience | Panels | Purpose |
|-------|----------|--------|---------|
| **Player** | Everyone | Drawer (journal) + BurgerMenu | Gameplay + basic settings |
| **User** | Power user | AriaPanel | Voice/persona/NPC configuration |
| **Admin** | Dev/therapist | DevHub + Transcript | Observability + therapeutic data |

## Stores

| Store | File | Key State |
|-------|------|-----------|
| `useGameStore` | `store/game.ts` | currentScreen, gameConfig, playerStats, turnCount, mapNodes, choices, actions |
| `useTranscriptStore` | `store/transcript.ts` | entries[] (therapeutic only), isOpen |
| `useGameVoiceStore` | `store/gameVoice.ts` | orbState, isConnected |
| `useGameThemeStore` | `store/gameTheme.ts` | themeId, preset, moodPrimary/Secondary |
## Data Separation (Three-Tier Observability)

- **Transcript** (therapeutic): user speech, Aria speech, game narratives, quest choices, mirror moments → `useTranscriptStore`
- **Dev Logger** (operational): ring-buffer singleton, 500 entries, source-based filtering → `devLogger` from `lib/gameDevLogger.ts`
- **Command Audit** (function calls): 200 entries, timing, args, result type → `commandAudit` from `lib/gameDevLogger.ts`

### Dev Logger Sources

| Source | Color | What It Captures |
|--------|-------|-----------------|
| `voice` | Pink | WebSocket connect/disconnect, audio events, errors |
| `game` | Teal | Store mutations: screen changes, config loads, game actions |
| `function` | Purple | Voice function call execution details |
| `theme` | Amber | Theme switches, mood color changes |
| `api` | Blue | API call results, errors |
| `system` | Gray | DevHub meta-events, lifecycle |

### Instrumented Stores

| Store | Methods Instrumented |
|-------|---------------------|
| `game.ts` | `selectVibe`, `selectDepth`, `setScreen`, `setGameConfig`, `handleGameAction` |
| `gameAriaAdapter.ts` | `connect`, `disconnect`, `toolCall`, all function calls via `commandAudit.record()` |

---

## Shared Components

### NarrativeText
- **Path**: `src/components/game/shared/NarrativeText.tsx`
- **Purpose**: Renders narrative text with **bold** markdown safely (no innerHTML)
- **Reads**: nothing
- **Props**: `text: string`, `className?: string`
- **Children**: none
- **Used by**: NarrativePanel, GameScreen, InterviewScreen

### ThemedContainer
- **Path**: `src/components/game/shared/ThemedContainer.tsx`
- **Purpose**: Wraps children with CSS custom properties from theme store
- **Reads**: `useGameThemeStore` → `getCSSVars()`
- **Props**: `children`, `className?: string`
- **Children**: any
- **Used by**: GameShell (wraps everything)

---

## Screen Components

### GameShell
- **Path**: `src/components/game/GameShell.tsx`
- **Purpose**: Top-level router — renders correct screen based on `currentScreen` state
- **Reads**: `useGameStore` → `currentScreen`
- **Writes**: nothing
- **Props**: none
- **Children**: ThemedContainer → one of 4 Screen components

### OnboardingScreen
- **Path**: `src/components/game/screens/OnboardingScreen.tsx`
- **Purpose**: Entry point — vibe selection, depth, cartridge picker, begin button
- **Reads**: `useGameStore` → `selectedVibe`, `selectedDepth`
- **Writes**: `useGameStore` → `selectVibe`, `selectDepth`, `setScreen`, `setGameConfig`
- **API**: `fetchCartridges()`, `loadCartridge()`, `startInterview()`
- **Children**: VibeCard, DepthSelector, CartridgePicker

### InterviewScreen
- **Path**: `src/components/game/screens/InterviewScreen.tsx`
- **Purpose**: Therapeutic interview Q&A flow with mirror bubbles
- **Reads**: `useGameStore` → `currentQuestion`, `interviewProgress`, `mirrorData`, `conversationTrail`
- **Writes**: `useGameStore` → `setQuestion`, `setProgress`, `setMirrorData`, `addToTrail`, `setScreen`, `setGameConfig`
- **API**: `submitAnswer()`, `expandMirror()`, `generateGame()`, `playStart()`
- **Children**: InterviewProgress, AriaMessage, MirrorBubble, ConversationTrail, InterviewInput

### GeneratingScreen
- **Path**: `src/components/game/screens/GeneratingScreen.tsx`
- **Purpose**: Loading spinner while game generates
- **Reads**: nothing
- **Props**: none
- **Children**: none (pure visual)

### GameScreen
- **Path**: `src/components/game/screens/GameScreen.tsx`
- **Purpose**: Main gameplay — narrative, map, stats, actions, voice
- **Reads**: `useGameStore` → gameConfig, playerStats, turnCount, mapNodes, choices, actions, moodPrimary
- **Writes**: `useGameStore` → `handleGameAction`, `setRestOverlay`; `useTranscriptStore` → `log()`
- **API**: `playAction()`, `saveGame()`
- **Children**: GameTopBar, GameMap, StatsBar, NarrativePanel, QuestChoices, ActionsBar, GameInput, RestOverlay, GameVoiceOrb, VoiceStatus

### TranscriptScreen
- **Path**: `src/components/game/screens/TranscriptScreen.tsx`
- **Purpose**: Full-screen overlay showing session transcript
- **Reads**: `useTranscriptStore` → `entries`, `isOpen`; `useGameStore` → `gameConfig`, `userId`
- **Writes**: `useTranscriptStore` → `toggle`, `clear`, `exportJSON`
- **Children**: TranscriptHeader, TranscriptLegend, TranscriptLog, TranscriptFooter

---

## Onboarding Components

### VibeCard
- **Path**: `src/components/game/onboarding/VibeCard.tsx`
- **Purpose**: Single selectable vibe option (build_cool / your_way / explore_together)
- **Props**: `vibe: string`, `title: string`, `description: string`, `selected: boolean`, `onSelect: (vibe) => void`
- **Children**: none

### DepthSelector
- **Path**: `src/components/game/onboarding/DepthSelector.tsx`
- **Purpose**: Quick / Custom / Epic toggle group
- **Props**: `selected: string`, `onSelect: (depth) => void`
- **Children**: none

### CartridgePicker
- **Path**: `src/components/game/onboarding/CartridgePicker.tsx`
- **Purpose**: Loads and displays demo game cartridges from API
- **API**: `fetchCartridges()` on mount
- **Props**: `onLoad: (cartridgeId) => void`
- **Children**: CartridgeCard ×N

### CartridgeCard
- **Path**: `src/components/game/onboarding/CartridgeCard.tsx`
- **Purpose**: Single cartridge preview (name, age, tagline, tone)
- **Props**: `cartridge: Cartridge`, `onClick: () => void`
- **Children**: none

---

## Interview Components

### InterviewProgress
- **Path**: `src/components/game/interview/InterviewProgress.tsx`
- **Purpose**: Progress bar + "5 / 20" counter
- **Props**: `progress: InterviewProgress | null`
- **Children**: none

### AriaMessage
- **Path**: `src/components/game/interview/AriaMessage.tsx`
- **Purpose**: Animated question display with phase tag
- **Props**: `question: InterviewQuestion | null`
- **Children**: none

### MirrorBubble
- **Path**: `src/components/game/interview/MirrorBubble.tsx`
- **Purpose**: Therapeutic reflection popup with close/expand
- **Props**: `data: { bubble, nextQuestion } | null`, `onClose: () => void`, `onExpand: () => void`
- **Children**: none

### ConversationTrail
- **Path**: `src/components/game/interview/ConversationTrail.tsx`
- **Purpose**: Scrollable list of past Q&A pairs
- **Props**: `trail: { question, answer }[]`
- **Children**: none

### InterviewInput
- **Path**: `src/components/game/interview/InterviewInput.tsx`
- **Purpose**: Textarea + send button + exit ramp text
- **Props**: `exitRamp?: string`, `onSubmit: (answer) => void`, `onExitRamp: () => void`
- **Children**: none

---

## Gameplay Components

### GameTopBar
- **Path**: `src/components/game/gameplay/GameTopBar.tsx`
- **Purpose**: Game title + turn counter + transcript toggle button
- **Reads**: `useGameStore` → `gameConfig.title`, `turnCount`
- **Props**: `onTranscriptToggle: () => void`
- **Children**: none

### GameMap
- **Path**: `src/components/game/gameplay/GameMap.tsx`
- **Purpose**: Horizontal scrollable chain of location nodes
- **Props**: `nodes: MapNode[]`, `onNodeClick: (nodeId) => void`
- **Children**: none

### StatsBar
- **Path**: `src/components/game/gameplay/StatsBar.tsx`
- **Purpose**: Displays courage, trust, items counters
- **Props**: `stats: PlayerStats`
- **Children**: none

### NarrativePanel
- **Path**: `src/components/game/gameplay/NarrativePanel.tsx`
- **Purpose**: Scrollable narrative text area, auto-scrolls on new content
- **Props**: `narratives: string[]` (accumulated)
- **Children**: NarrativeText ×N

### QuestChoices
- **Path**: `src/components/game/gameplay/QuestChoices.tsx`
- **Purpose**: Vertical list of quest choice buttons
- **Props**: `choices: QuestChoice[]`, `onChoose: (choiceId) => void`
- **Children**: none

### ActionsBar
- **Path**: `src/components/game/gameplay/ActionsBar.tsx`
- **Purpose**: Horizontal action chips (look, quest, go explore, etc.)
- **Props**: `actions: string[]`, `onAction: (action, target) => void`
- **Children**: none

### GameInput
- **Path**: `src/components/game/gameplay/GameInput.tsx`
- **Purpose**: Text command input + send button
- **Props**: `onSubmit: (command) => void`
- **Children**: none

### RestOverlay
- **Path**: `src/components/game/gameplay/RestOverlay.tsx`
- **Purpose**: Full-screen modal for rest points
- **Props**: `visible: boolean`, `message?: string`, `onContinue: () => void`, `onSave: () => void`
- **Children**: none

---

## Voice Components

### GameVoiceOrb
- **Path**: `src/components/game/voice/GameVoiceOrb.tsx`
- **Purpose**: Voice activation orb with state animations
- **Reads**: `useGameVoiceStore` → `orbState`
- **Props**: `onToggle: () => void`
- **Children**: none

### VoiceStatus
- **Path**: `src/components/game/voice/VoiceStatus.tsx`
- **Purpose**: Small text label showing voice status near orb
- **Reads**: `useGameVoiceStore` → `orbState`, `lastSpokenText`
- **Children**: none

---

## Transcript Components

### TranscriptHeader
- **Path**: `src/components/game/transcript/TranscriptHeader.tsx`
- **Purpose**: "Session Transcript" title + close button
- **Props**: `onClose: () => void`
- **Children**: none

### TranscriptLegend
- **Path**: `src/components/game/transcript/TranscriptLegend.tsx`
- **Purpose**: Color-coded legend (Player=blue, Aria=gold, Game=teal, System=gray)
- **Children**: none

### TranscriptLog
- **Path**: `src/components/game/transcript/TranscriptLog.tsx`
- **Purpose**: Scrollable list of transcript entries, auto-scrolls
- **Props**: `entries: TranscriptEntry[]`
- **Children**: TranscriptEntry ×N

### TranscriptEntry
- **Path**: `src/components/game/transcript/TranscriptEntry.tsx`
- **Purpose**: Single colored/styled transcript entry
- **Props**: `entry: TranscriptEntry`
- **Children**: none

### TranscriptFooter
- **Path**: `src/components/game/transcript/TranscriptFooter.tsx`
- **Purpose**: Export JSON + Clear buttons
- **Props**: `onExport: () => void`, `onClear: () => void`
- **Children**: none

---

## DevHub Components (Observability Layer — 6 tabs, real-time)

### DevHub
- **Path**: `src/components/game/devpanel/DevHub.tsx`
- **Purpose**: Portal-mounted tabbed dev panel (z:99999). 6 tabs, header controls, footer stats.
- **Reads**: `devLogger`, `commandAudit`, `useGameStore`, `useGameVoiceStore`, `useGameThemeStore`, `useAriaModeStore`, `useDashboardStore`, dashboard API (polling)
- **Props**: `isOpen: boolean`, `onClose: () => void`
- **Renders via**: `createPortal` to `document.body`
- **Children**: LogsTab, VoiceConfigTab, GameStateTab, CommandsTab, TherapyTab, ClinicalTab (all inline)
- **Updates**: All tabs real-time — Logs via ring buffer pub/sub, Therapy/Clinical poll every 5s

### DevHub Tabs (6 tabs — inline in DevHub.tsx)

| Tab | Source | What It Shows |
|-----|--------|--------------|
| **Logs** | `devLogger.getAll()` | Unified log stream with level + source filters (incl. therapy source) |
| **Voice** | Voice logs + `useGameVoiceStore` + `useGameThemeStore` + `useAriaModeStore` | Connection status, voice preference, mode (game/SU), theme, game config summary, voice event log — **merged from old Voice + Config tabs** |
| **Game** | `useGameStore` | Live state + persistence status (which localStorage keys are active) + map + recent ops |
| **Cmds** | `commandAudit.getAll()` | Audit trail: command name, args, result type, duration, response |
| **Therapy** | Dashboard API (5s poll) | **NEW** — Therapist controls status (paused/disclosure/messages), flags with severity colors, mood velocity, achievements (earned/total), notes, link to full dashboard |
| **Clinical** | Static + API health | **NEW** — All 11 psychology JSON files with counts, ICD-11 stats (156 entities), LOINC codes, 5 clinical cartridges, API connection status |

### Infrastructure (Non-Component)

| File | Purpose |
|------|---------|
| `lib/gameDevLogger.ts` | Singleton `devLogger` (RingBufferLogger) + `commandAudit` (CommandAuditTrail) + source color map |
| `lib/aria-core/devhub/logger.ts` | `RingBufferLogger` class — 500 entries, pub/sub, no-op in prod |
| `lib/aria-core/devhub/auditTrail.ts` | `CommandAuditTrail` class — 200 records, queryable by command/errors |

---

## Persistence Layer

| File | Purpose |
|------|---------|
| `backend/services/persistence.py` | `GamePersistence` class — per-user SQLite at `data/users/{user_id}/game.db` |
| `backend/routers/game.py` | 4 new endpoints: save-full, saves/{user_id}, load-save, delete save |
| `lib/gameApi.ts` | `saveFullGame`, `listSaves`, `loadSave`, `deleteSave` typed wrappers |

### Schema (per-user game.db)

| Table | Purpose |
|-------|---------|
| `saves` | Game state snapshots: config JSON, player state, narratives, location, stats |
| `transcripts` | Full transcript entries per game session |
| `aria_context` | Aria session memory: summary, key events, companion bond level |

### Data Flow

```
Save: GameScreen → saveFullGame() → POST /api/game/save-full → GamePersistence.save_game() + save_transcript()
Load: OnboardingScreen → listSaves() → SaveCard → loadSave() → POST /api/game/load-save → restore config + state
Aria: gameAriaDisconnect() → _saveAriaContext() → saves summary to aria_context table
      gameAriaConnect() → loads aria_context → injects "PREVIOUS SESSION" into system prompt
```

### UI Components

### SaveCard
- **Path**: `src/components/game/onboarding/SaveCard.tsx`
- **Purpose**: Saved game preview card with title, location, stats, time ago. Resume + Delete buttons.
- **Props**: `save: SaveSummary`, `onResume: () => void`, `onDelete: () => void`
- **Children**: none
- **Used by**: OnboardingScreen

---

## Drawer Components

### GameDrawer
- **Path**: `src/components/game/drawer/GameDrawer.tsx`
- **Purpose**: Left-side 80% overlay drawer with dimmed backdrop, slide animation, swipe-to-close
- **Props**: `isOpen: boolean`, `onClose: () => void`, `children: ReactNode`
- **Children**: DrawerSection ×N

### DrawerHandle
- **Path**: `src/components/game/drawer/DrawerHandle.tsx`
- **Purpose**: Thin vertical tab on left edge — always visible, tap to open drawer
- **Props**: `onClick: () => void`, `visible: boolean`

### DrawerSection
- **Path**: `src/components/game/drawer/DrawerSection.tsx`
- **Purpose**: Collapsible section with title, icon, chevron toggle, count badge
- **Props**: `title, icon, defaultOpen?, children, count?`

### DrawerMap
- **Path**: `src/components/game/drawer/DrawerMap.tsx`
- **Purpose**: React Flow map with custom circle nodes. Current=gold glow, discovered=visible, hidden=fog.
- **Reads**: nothing (props-driven)
- **Props**: `nodes: MapNode[]`, `onNodeClick: (nodeId) => void`
- **Uses**: React Flow + custom `MapCircleNode` component

### DrawerInventory
- **Path**: `src/components/game/drawer/DrawerInventory.tsx`
- **Purpose**: 3-column emoji grid. Tap to inspect (description + Use button).
- **Props**: `items: Item[]`, `onUse?: (itemId) => void`

### DrawerQuests
- **Path**: `src/components/game/drawer/DrawerQuests.tsx`
- **Purpose**: Active quest + completed quests (dimmed). Active quest highlighted.
- **Props**: `quests: Quest[]`, `activeQuestId?`, `completedQuestIds?`

### DrawerCompanion
- **Path**: `src/components/game/drawer/DrawerCompanion.tsx`
- **Purpose**: Companion avatar (emoji), name, description, bond hearts indicator.
- **Props**: `companion: GameCompanion | null`, `bondLevel?`

---

## Menu Components (Player + User Layers)

### BurgerMenu [☰]
- **Path**: `src/components/game/menu/BurgerMenu.tsx`
- **Purpose**: Player-facing settings. Slide from left, 75% width.
- **Reads**: `useGameStore` → userId, gameConfig; `useGameThemeStore` → themeId, applyTheme
- **Props**: `isOpen, onClose, onSave`
- **Sections**: Profile (user ID, current game), Theme (4-preset grid), Game (save, exit), About
- **Audience**: Player — no debug, no admin features

### AriaPanel [✨]
- **Path**: `src/components/game/menu/AriaPanel.tsx`
- **Purpose**: Aria voice/persona configuration. Full-screen overlay.
- **Reads**: `useGameVoiceStore` → orbState, isConnected; `useGameStore` → gameConfig
- **Calls**: `gameAriaConnect`, `gameAriaDisconnect`
- **Props**: `isOpen, onClose`
- **Sections**: Connection status + reconnect, Voice selection (6 voices), Personality sliders (visual stubs), NPC voice presets (auto labels), Active context summary
- **Audience**: User/power-user — controls their Aria experience

---

## Aria Dual Mode System

### Store: `useAriaModeStore`
- **Path**: `src/store/ariaMode.ts`
- **State**: `mode: "game" | "su"`
- **Actions**: `setMode`, `toggleMode`

### Mode Behavior

| Aspect | Game Mode | Super User Mode |
|--------|-----------|-----------------|
| System prompt | Storyteller, in-character | System-aware Jarvis assistant |
| Functions | 23 game commands | 12 SU commands (panels, diagnostics, config) |
| Voice tone | Atmospheric, narrative | Clear, direct, helpful |
| Visual | Normal top bar | Pulsing "SU" badge, purple send button |
| Input placeholder | "Type a command..." | "Ask Aria anything... /aria-game to resume" |
| Transcript tags | `meta.mode: "game"` | `meta.mode: "su"` |

### Activation Methods
- **Chat**: `/aria-su` and `/aria-game`
- **Voice**: "Aria, super user mode" / "Aria, back to game" (via switch_to_su / switch_to_game functions)
- **AriaPanel**: Connect/disconnect button

### Slash Commands (20 total — 3-tier access)

**Player mode** (always available):

| Command | Action |
|---------|--------|
| `/save` | Full game save |
| `/mood` | Open mood check-in |
| `/help` | List available commands |
| `/aria-su` | Enter Super User mode |

**SU mode** (requires `/aria-su` first):

| Command | Category | Action |
|---------|----------|--------|
| `/aria-game` | Mode | Return to game mode |
| `/look` | Game nav | Look around |
| `/map` | Game nav | Open drawer map |
| `/inventory` | Game nav | Open drawer inventory |
| `/quest` | Game nav | Show quest |
| `/hint` | Game nav | Get hint |
| `/recap` | Game nav | Story recap |
| `/status` | Game nav | Show stats |
| `/restart` | Game ctrl | Reset to onboarding (keeps saves) |
| `/difficulty easy\|hard` | Game ctrl | Adjust hints/rest frequency |
| `/skip` | Game ctrl | Skip current quest stage |
| `/voice [name]` | Aria ctrl | Switch voice (Leda/Charon/Kore/etc.) |
| `/mute` | Aria ctrl | Disable voice output |
| `/unmute` | Aria ctrl | Re-enable voice output |
| `/replay` | Aria ctrl | Re-read last narrative |
| `/theme [name]` | Settings | Switch theme (default/maya/ren/ash) |
| `/export` | Settings | Export transcript JSON |

### Key Files
- `src/store/ariaMode.ts` — mode state
- `src/lib/aria/engine.ts` — AriaEngine (domain-agnostic voice orchestrator)
- `src/lib/aria/persona.ts` — PersonaConfig type + registry
- `src/lib/aria/su/suFunctions.ts` — 23 SU function declarations (12 panel/config/diagnostics + 11 device control)
- `src/lib/aria/su/suPersona.ts` — SU handler + device-adaptive prompt
- `src/lib/gameAriaAdapter.ts` — Game persona creator + voice wiring
- `src/components/game/gameplay/GameInput.tsx` — slash parser, mode-aware placeholder + button color
- `src/components/game/gameplay/GameTopBar.tsx` — "SU" badge indicator

---

## Termux Device Control (Phase 1 — Jarvis Upgrade)

### Backend Infrastructure

| File | Purpose |
|------|---------|
| `backend/services/termux_service.py` | Async wrapper for 25+ termux-* commands via `create_subprocess_exec` |
| `backend/services/device_state.py` | `DeviceState` dataclass, cached polling (30s), CPU temp from sysfs, RAM from procfs |
| `backend/routers/termux.py` | 15 FastAPI endpoints at `/api/termux/*` |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/termux/device-state` | GET | Aggregated: battery + temp + RAM + WiFi |
| `/api/termux/battery` | GET | Detailed battery status |
| `/api/termux/torch` | POST | Flashlight on/off |
| `/api/termux/vibrate` | POST | Haptic feedback (duration_ms) |
| `/api/termux/notification` | POST | Android notification |
| `/api/termux/clipboard` | GET/POST | Read/write clipboard |
| `/api/termux/volume` | GET/POST | Get/set volume |
| `/api/termux/wifi` | GET | WiFi connection info |
| `/api/termux/location` | GET | GPS coordinates |
| `/api/termux/sms/inbox` | GET | Read SMS |
| `/api/termux/sms/send` | POST | Send SMS |
| `/api/termux/contacts` | GET | Contact list |
| `/api/termux/calls` | GET | Call log |
| `/api/termux/sensors/{type}` | GET | Sensor data |
| `/api/termux/camera/photo` | POST | Take photo |

### Device-Adaptive Prompt

`DeviceState.to_prompt_context()` generates context injected into SU system prompt:
```
DEVICE CONTEXT:
Battery: 23% (NOT charging) — LOW! Be concise, avoid heavy operations
Temperature: CPU 44C, Battery 38C — HOT! Suggest cooling break
RAM: 412MB / 7358MB free — LOW! Avoid launching processes
Network: No WiFi — on mobile data or offline
```

Aria automatically adapts: terse on low battery, suggests breaks when hot, avoids heavy operations on low RAM.

### 11 SU Voice Functions (Device Control)

| Function | What It Does |
|----------|-------------|
| `device_status()` | "Battery 94%, 41C CPU, 810MB RAM free, charging" |
| `battery_check()` | "94%, health GOOD, 34.1C, charging via AC" |
| `toggle_torch(on)` | Flashlight on/off |
| `set_volume(stream, value)` | "Music volume set to 7" |
| `vibrate(duration_ms)` | "Vibrated for 200ms" |
| `send_notification(title, content)` | Android notification |
| `clipboard_read()` | "Your clipboard contains..." |
| `clipboard_write(text)` | "Copied to clipboard" |
| `wifi_info()` | "WiFi: HomeNet, -52dBm, IP: 192.168.1.x" |
| `location_check()` | "Location: 32.0853, 34.7818, altitude 50m" |
| `open_url(url)` | Opens in device browser |

---

## Therapy Components (Week 1 — Dashboard Foundation)

### MoodCheckIn
- **Path**: `src/components/game/therapy/MoodCheckIn.tsx`
- **Purpose**: Weather-themed 1-5 mood selector shown at session start and end
- **Reads**: `useGameStore` -> `userId`; `useDashboardStore` -> `recordMood`
- **Props**: `phase: "start" | "end"`, `sessionId: string`, `onComplete: () => void`
- **Children**: none
- **Behavior**: Posts mood to `POST /api/dashboard/user/{id}/mood`. Skip button available. Weather emoji labels (storm -> bright).
- **Used by**: GameScreen (planned — session start/end overlay)

---

## Dashboard Store + Types (Therapist Layer)

### Store: `useDashboardStore`
- **Path**: `src/store/dashboard.ts`
- **State**: `dashboard`, `moodHistory`, `moodVelocity`, `flags`, `notes`, `achievements`, `choiceTimeline`, `mirrorAnalytics`, `antagonistAnalysis`, `recap`, `loading`, `error`
- **Actions (13)**: `fetchDashboard`, `fetchMood`, `recordMood`, `fetchFlags`, `addFlag`, `annotateFlag`, `fetchNotes`, `addNote`, `fetchAchievements`, `fetchRecap`, `submitChoicesForAnalysis`, `submitMirrorStats`, `clearError`
- **API Base**: `/api/dashboard/*` (18 endpoints)

### Types: `src/types/dashboard.ts`
- `MoodCheckIn`, `MoodVelocity`, `FlaggedMoment`, `SessionNote`, `Achievement`
- `ChoiceEvent`, `ChoiceTimeline`, `MirrorAnalytics`, `AntagonistAnalysis`
- `KGStats`, `FullDashboard`
- `MOOD_LABELS` constant (weather-themed, 1-5)

---

## Dashboard API (Backend — 18 endpoints)

### Router: `backend/routers/dashboard.py`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard/user/{id}` | GET | Full dashboard (all 8 features compiled) |
| `/api/dashboard/user/{id}/choices` | GET/POST | Choice evolution timeline |
| `/api/dashboard/user/{id}/mirror` | GET/POST | Mirror bubble analytics |
| `/api/dashboard/user/{id}/antagonist` | GET/POST | Antagonist analysis |
| `/api/dashboard/user/{id}/mood` | GET | Mood history + velocity |
| `/api/dashboard/user/{id}/mood` | POST | Record mood check-in |
| `/api/dashboard/user/{id}/flags` | GET/POST | Flagged moments |
| `/api/dashboard/flag/{id}/annotate` | PUT | Therapist annotation on flag |
| `/api/dashboard/user/{id}/notes` | GET/POST | Session notes |
| `/api/dashboard/user/{id}/achievements` | GET/POST | Achievements |
| `/api/dashboard/user/{id}/recap` | GET | Story recap for handoff |
| `/api/dashboard/health` | GET | Service health |

### Game -> KG Bridge: `backend/services/game_kg_bridge.py`

Automatically maps game events to therapy KG nodes:

| Game Event | KG Node Type | Intensity |
|------------|-------------|-----------|
| Helper NPC met | coping | 0.4 |
| Antagonist confronted | trigger | 0.5 |
| Courage choice | emotion | 0.6 |
| Trust-building choice | emotion | 0.6 |
| Quest completed | breakthrough | 0.8 |
| Mirror moment | breakthrough | 0.7 |
| Game ending reached | breakthrough | 0.9 |
| New location discovered | goal | 0.3 |
| Item found | coping | 0.3 |
| Avoidance pattern detected | concern + flag | 0.5 |

### Achievement Triggers (10 auto-awarded)

| Trigger | Achievement | When |
|---------|------------|------|
| `first_action` | First Step | First game action |
| `new_location` | Explorer | Visit new location |
| `item_found` | Treasure Hunter | Pick up item |
| `npc_talked` | Made a Friend | Talk to NPC |
| `helper_npc_met` | Helping Hand | Meet helper NPC |
| `antagonist_confronted` | Brave Heart | Face antagonist |
| `mirror_expanded` | Looking Deeper | Explore a reflection |
| `session_resumed` | Welcome Back | Return to continue |
| `quest_completed` | Quest Complete | Finish a quest arc |
| `game_generated` | World Builder | Create a game world |

### Psychology JSON Data: `backend/data/psychology/` (8 files, 51.5 KB)

| File | Content | Key Data |
|------|---------|----------|
| `cognitive_distortions.json` | 15 Burns/Beck distortions | game_signal, reframe per distortion |
| `oars_framework.json` | MI conversational technique | game_examples per OARS skill |
| `safe_phrases.json` | 14 safe + 11 harmful phrases | say_instead alternatives |
| `npc_archetypes.json` | 7 therapeutic NPC roles | best_for disorder mapping |
| `assessment_scales.json` | PHQ-9, GAD-7, Simple Mood | items, severity_thresholds |
| `ifs_model.json` | IFS parts model | exiles/managers/firefighters + game_integration |
| `graduated_disclosure.json` | 4-layer disclosure architecture | safety_triggers, pacing_rules |
| `disorder_communication.json` | 10 disorder-specific rule sets | opens_them_up, avoid, npc_design per disorder |
| `dbt_skills.json` | 4 DBT modules (TIPP, STOP, DEAR MAN, etc.) | game_mapping per skill |
| `act_processes.json` | 6 ACT hexaflex processes | exercises + game_mapping + metaphors |
| `icd11_mental_disorders.json` | 156 WHO disorder entities (live import) | code, title, definition, taxonomy tree |

---

## Therapist Dashboard (Week 2 — `/dashboard` route)

### DashboardShell
- **Path**: `src/components/dashboard/DashboardShell.tsx`
- **Purpose**: Top-level dashboard router — header, user selector, 6-tab navigation, error/loading states
- **Reads**: `useDashboardStore`, `useGameStore` -> `userId`
- **Children**: OverviewTab, TherapyKGTab, MoodTab, FlagsNotesTab, SessionsTab, AssessmentsTab

### Dashboard Tabs

| Tab | File | Key Features |
|-----|------|-------------|
| **Overview** | `tabs/OverviewTab.tsx` | KG stats cards, mood velocity, active concerns, recent flags, achievements grid, story recap |
| **Therapy KG** | `tabs/TherapyKGTab.tsx` | React Flow interactive KG viz, 8 node type colors, click-to-inspect, minimap |
| **Mood** | `tabs/MoodTab.tsx` | Velocity trend card, session-by-session mood bars, start/end delta indicators |
| **Flags & Notes** | `tabs/FlagsNotesTab.tsx` | Severity-colored flags, inline annotation, add-note form with target types |
| **Sessions** | `tabs/SessionsTab.tsx` | Session history, choice evolution timeline, mirror analytics, JSON export |
| **Assessments** | `tabs/AssessmentsTab.tsx` | 7 clinical scales catalog, LOINC codes, integration status, data sources |

---

## Therapy Components (Week 1+3)

### AchievementToast
- **Path**: `src/components/game/therapy/AchievementToast.tsx`
- **Purpose**: Slide-up toast when a new achievement is earned during gameplay
- **Props**: `achievement: { id, title, description } | null`, `onDone: () => void`
- **Behavior**: Auto-dismisses after 3.5 seconds with gold glow animation

### TherapistPauseBanner
- **Path**: `src/components/game/therapy/TherapistPauseBanner.tsx`
- **Purpose**: Full-screen overlay when therapist has paused the game session
- **Props**: `message: string`
- **Behavior**: Blocks all interaction until therapist resumes via dashboard

---

## Scene Image Generation (Week 3)

### Service: `backend/services/scene_image.py`
- Generates atmospheric scene images via Gemini 2.0 Flash
- Prompt built from: location name + description + atmosphere + time of day
- Images cached per location in `data/scene_cache/`
- Endpoint: `POST /api/game/scene-image`

---

## Device-Adaptive Gameplay (Week 3)

### Endpoint: `GET /api/game/device-context`
- Returns device state + time-of-day + computed gameplay adaptations
- Adaptations: `session_hint`, `narrative_mod`, `suggest_save`, `suggest_rest`, `mood_shift`, `suggest_dream_sequence`
- Uses existing `DeviceState` from `services/device_state.py`

---

## Clinical Cartridges (Week 3 — 5 therapy-specific games)

### Data: `backend/data/clinical_cartridges.py`

| Cartridge | Approach | Target | Key Mechanic |
|-----------|----------|--------|-------------|
| **The Thought Detective** | CBT | Anxiety, Depression | Identify cognitive distortions, find evidence, write balanced thoughts |
| **The Fire Keeper** | DBT | BPD, Emotion dysregulation | TIPP at rest points, Opposite Action quests, Wise Mind pool |
| **The Compass Quest** | ACT | Depression, Avoidance | Values compass, Passengers (defusion), ACT Matrix choices |
| **The Council of Parts** | IFS | PTSD, Complex trauma | Approach Parts with curiosity, unburden Exiles, Manager/Firefighter wings |
| **The Listener's Garden** | MI/OARS | SUD, Ambivalence | OARS dialogue, Rolling with resistance, Righting Reflex as antagonist |

All 5 cartridges loadable via `POST /api/game/cartridges/load` with their `id`.

---

## Therapist Controls (Week 3)

### Service: `backend/services/therapist_controls.py`
- SQLite-backed remote game controls for therapist oversight
- Polled by game frontend via `GET /api/dashboard/user/{id}/controls`

### Dashboard Endpoints (7 new, total 25)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard/user/{id}/controls` | GET | Poll current control state |
| `/api/dashboard/user/{id}/pause` | POST | Pause game session |
| `/api/dashboard/user/{id}/resume` | POST | Resume paused session |
| `/api/dashboard/user/{id}/disclosure` | POST | Set max disclosure layer (1-4) |
| `/api/dashboard/user/{id}/inject-context` | POST | Inject therapist guidance for next session |
| `/api/dashboard/user/{id}/therapist-message` | POST | Send message to user in-game |
| `/api/dashboard/user/{id}/control-log` | GET | Audit trail of therapist actions |

---

## SU Lab — FunctionGemma Integration (2026-03-23)

### SUShell Expansion (`src/components/su/SUShell.tsx`)

~1,200+ lines. 45 voice functions, 3 object types, creation drawer, animations, canvas controls.

- **45 OBJECT_FUNCTIONS** — compact descriptions for Gemini Live token limits
- **Creation drawer** — bottom sheet: Shape / Image / Button
- **Typed rendering**: image (background-image cover), button (gradient, tap handler, toggle/link indicators)
- **Button tap handler**: toggle_visibility, set_color_random, animate, stop, delete, device, URL
- **Shape edit mode**: 8 drag handles (4 corners + 4 sides)
- **Canvas**: zoom (center-origin), grid toggle, background color, snap-to-grid
- **Group drag**: all group members move together
- **CSS keyframes**: lab-spin, lab-bounce, lab-pulse, lab-orbit
- **Training auto-capture**: every function call → localStorage JSONL
- **Config panel**: type-specific (image: file picker + camera; button: label, target, action, style)

### Store: `useLabStore` (`src/store/lab.ts`)

**New Types**: `ObjectType` (shape/image/button/text), `ButtonConfig`, `LogicGraph`, `LogicBlock`, `Wire`, `Condition`, `ValueRef`, `LogicAction`

**LabObject fields**: objectType, imageSrc, buttonConfig, textContent, fontSize, textAlign, zIndex, groupId, animation, animSpeed, orbitTarget, outputValue

**Canvas state**: canvasZoom, canvasBg, showGrid, snapToGrid, gridSize, presets

**Logic state**: logicGraph (nodes + wires), CRUD methods for blocks/wires

**Undo state**: _history (30 snapshots max), _historyIndex, _pushSnapshot(), undo(), redo()

**Project**: exportProject() → JSON string, importProject(json) → boolean (regenerates IDs)

**Note**: partialize strips imageSrc and _history from localStorage.

### Training Logger (`src/lib/trainingLogger.ts`)

Singleton `trainingLogger`. Methods: capture(), getAll(), count(), clear(), exportFunctionGemmaJSONL(), download(). Storage: localStorage `aria-lab-training-data`, max 500.

### Local Aria Client (`src/lib/localAria.ts`)

localInfer(text), localStatus(), localUnload(). Calls /api/functiongemma/* endpoints.

### Backend Endpoints (serve_game.py)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/functiongemma/infer` | POST | Lazy-loads FunctionGemma, inference in executor |
| `/api/functiongemma/status` | GET | Check if model loaded |
| `/api/functiongemma/unload` | POST | Free RAM |
| `/api/termux/camera/photo` | POST | Now returns base64 alongside path |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/download_functiongemma.py` | Download GGUF from HuggingFace (q4_k_m / q8_0) |
| `scripts/functiongemma_inference.py` | FunctionGemmaEngine (llama-cpp): REPL, --query, --serve |
| `scripts/functiongemma_inference_ct2.py` | FunctionGemma CT2 int8 engine (258MB, 2-3s) |
| `scripts/functiongemma_inference_hf.py` | FunctionGemma HF transformers (accurate but slow) |
| `data/finetune/generate_dataset.py` | 45 functions × 10-12 utterances = 1,448 examples |
| `data/finetune/train_on_hf.py` | Launch training on HF Space (A10G GPU) |
| `data/finetune/finetune-functiongemma-colab.ipynb` | Colab training notebook (fp16, T4) |

---

## Recent Additions (2026-03-24)

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| ColorPicker | `src/components/su/ColorPicker.tsx` | Hue slider (0-360) + 8 preset swatches, live preview |
| LogicEditor | `src/components/su/LogicEditor.tsx` | Full-screen node editor: wiring, blocks, config |

### New Features

| Feature | What |
|---------|------|
| Text objects | ObjectType "text" — textContent, fontSize, textAlign. Creation drawer + config panel |
| Undo/Redo | 30-snapshot history stack. Buttons in header (↩/↪). Voice commands. Drag snapshots start-only. |
| Project save/load | Export/import full state as JSON file. Header buttons (⬇/⬆). Voice commands. |
| Color picker | Hue slider + 8 presets in config panel for all object types |
| Context-aware functions | SHARED(7) + CANVAS(40) or LOGIC(8) — swaps based on active view |
