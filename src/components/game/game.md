# game/ — Component Library Documentation

<!-- last-verified: 2026-03-28 -->

## Manifest

| Field | Value |
|---|---|
| **Library** | `src/components/game/` |
| **Purpose** | Complete React UI for the Aria therapeutic game engine — a narrative RPG with AI voice companion, therapist dashboard integration, and clinical psychology tooling |
| **Framework** | React 19 (Next.js "use client" components), Zustand state, Tailwind CSS |
| **Entry Point** | `GameShell.tsx` — screen router and session hydration |
| **External Deps** | `@/store/game`, `@/store/transcript`, `@/store/gameTheme`, `@/store/ariaMode`, `@/store/gameVoice`, `@/store/dashboard`, `@/store/devLog`, `@/lib/gameApi`, `@/lib/gameAriaAdapter`, `@/lib/gameDevLogger`, `@/lib/aria-core/devhub/*`, `@/types/game`, `@/types/dashboard`, `@xyflow/react` |
| **Component Count** | 48 files across 11 subdirectories |
| **Design Language** | Dark theme, gold accent (`#c9a84c`), teal highlights (`#4a9e8e`), serif headings, mono UI, CSS custom properties for theming |

---

## File Tree

```
game/
├── GameShell.tsx                  # Root: screen router + session hydration
├── COMPONENTS.md                  # (legacy component notes)
│
├── screens/                       # Full-screen phase views
│   ├── OnboardingScreen.tsx       # Vibe selection, depth, cartridges, saved games
│   ├── InterviewScreen.tsx        # AI interview: questions → game generation
│   ├── GeneratingScreen.tsx       # Loading spinner during world generation
│   ├── GameScreen.tsx             # Main gameplay orchestrator (490 lines)
│   └── TranscriptScreen.tsx       # Full-screen session transcript overlay
│
├── shared/                        # Reusable primitives
│   ├── ThemedContainer.tsx        # CSS variable injection from theme store
│   └── NarrativeText.tsx          # Safe **bold** markdown renderer
│
├── onboarding/                    # Onboarding flow components
│   ├── VibeCard.tsx               # Selectable vibe option card
│   ├── DepthSelector.tsx          # Quick/Custom/Epic depth toggle
│   ├── CartridgePicker.tsx        # Pre-made adventure browser
│   ├── CartridgeCard.tsx          # Single cartridge display card
│   └── SaveCard.tsx               # Saved game resume/delete card
│
├── interview/                     # AI interview components
│   ├── AriaMessage.tsx            # Current question display with phase label
│   ├── InterviewProgress.tsx      # Progress bar (current/total)
│   ├── MirrorBubble.tsx           # Therapeutic reflection moment
│   ├── ConversationTrail.tsx      # Q&A history scroll
│   └── InterviewInput.tsx         # Textarea with send button + exit ramp
│
├── gameplay/                      # Core gameplay UI
│   ├── GameTopBar.tsx             # Title, turn count, mode badge, action icons
│   ├── GameMap.tsx                # Horizontal scrollable location breadcrumbs
│   ├── StatsBar.tsx               # Courage/Trust/Items display
│   ├── NarrativePanel.tsx         # Scrollable narrative text feed
│   ├── QuestChoices.tsx           # Branching choice buttons
│   ├── ActionsBar.tsx             # Context-sensitive action pills (collapsible)
│   ├── GameInput.tsx              # Command textarea + slash command parser
│   └── RestOverlay.tsx            # Save & rest full-screen overlay
│
├── voice/                         # Aria voice integration
│   ├── GameVoiceOrb.tsx           # Floating mic button with state animations
│   └── VoiceStatus.tsx            # Connection state indicator text
│
├── transcript/                    # Session transcript system
│   ├── TranscriptHeader.tsx       # Title bar with close button
│   ├── TranscriptLegend.tsx       # Color-coded type legend
│   ├── TranscriptEntry.tsx        # Single log entry (user/aria/game/system)
│   ├── TranscriptLog.tsx          # Auto-scrolling entry list
│   └── TranscriptFooter.tsx       # Export JSON + Clear buttons
│
├── devpanel/                      # Developer tools
│   ├── DevPanel.tsx               # Legacy dev log viewer
│   └── DevHub.tsx                 # 6-tab dev dashboard (Logs, Voice, Game, Cmds, Therapy, Clinical)
│
├── drawer/                        # Left-slide journal drawer
│   ├── GameDrawer.tsx             # Drawer shell: slide, swipe-to-close, backdrop
│   ├── DrawerHandle.tsx           # Left-edge grab tab
│   ├── DrawerSection.tsx          # Collapsible section with icon + count badge
│   ├── DrawerMap.tsx              # ReactFlow visual world map
│   ├── DrawerInventory.tsx        # 3-column item grid with inspect/use
│   ├── DrawerQuests.tsx           # Active + completed quest journal
│   └── DrawerCompanion.tsx        # Companion avatar, bio, bond level
│
├── menu/                          # Overlay menus
│   ├── BurgerMenu.tsx             # Settings: profile, theme, save/load, exit
│   └── AriaPanel.tsx              # Aria config: connection, voice, personality, NPCs
│
└── therapy/                       # Therapeutic integration components
    ├── MoodCheckIn.tsx            # 1-5 weather-emoji mood selector (start/end)
    ├── AchievementToast.tsx       # Slide-up achievement notification
    └── TherapistPauseBanner.tsx   # Full-screen session pause overlay
```

---

## Component Index

---

<a id="GameShell"></a>
### GameShell.tsx
**Root orchestrator and screen router.** Maps `currentScreen` from `useGameStore` to one of four screen components (`onboarding`, `interview`, `generating`, `game`). On mount, runs an interview error recovery guard: if `currentScreen` is `"interview"` and the current question is null or has phase `"error"`, it resets to onboarding instead of rendering a broken interview. For the `"game"` screen, checks if the backend still has the game loaded; if not, attempts to restore from cartridge or falls back to onboarding. Wraps everything in `ThemedContainer` for CSS variable injection.

**Connects to:** `useGameStore` (screen state), `@/lib/gameApi` (session sync), `ThemedContainer`, all screen components.

---

<a id="OnboardingScreen"></a>
### screens/OnboardingScreen.tsx
**First screen — game creation and save management.** Presents three engagement vibes ("build cool", "your way", "explore together"), a depth selector (Quick/Custom/Epic), and a "Begin" button that transitions to the interview. Also loads and displays saved games for resume, and fetches pre-made cartridges. Handles cartridge loading (applies theme, starts game, skips interview) and save resume (full state restore).

**Connects to:** `useGameStore`, `useTranscriptStore`, `useGameThemeStore`, `@/lib/gameApi` (startInterview, loadCartridge, loadSave, listSaves, deleteSave), `VibeCard`, `DepthSelector`, `CartridgePicker`, `SaveCard`.

---

<a id="InterviewScreen"></a>
### screens/InterviewScreen.tsx
**AI-driven interview that generates the game world.** Displays Aria's questions phase-by-phase (warmup, character, world, story, challenges, choices). Submits answers to backend; handles mirror bubble therapeutic moments. When interview completes, transitions to generating screen, calls `generateGame`, then enters gameplay.

**Connects to:** `useGameStore`, `useTranscriptStore`, `@/lib/gameApi` (submitAnswer, generateGame, expandMirror, playStart), `InterviewProgress`, `AriaMessage`, `MirrorBubble`, `ConversationTrail`, `InterviewInput`.

---

<a id="GeneratingScreen"></a>
### screens/GeneratingScreen.tsx
**Simple loading screen** shown while the backend generates the game world. Displays "Crafting your world..." with a spinning indicator. Stateless — transitions are driven by the parent setting `currentScreen`.

**Connects to:** Nothing (pure presentational).

---

<a id="GameScreen"></a>
### screens/GameScreen.tsx
**Main gameplay orchestrator — the largest component (490 lines).** Manages:
- Game actions (move, look, choose, use) via `api.playAction`
- Narrative feed with auto-scroll
- Slash command system (/save, /help, /mood, /aria-su, /look, /map, etc.)
- Voice integration (connect/disconnect, narrative callbacks, UI callbacks)
- Therapist controls polling (pause state every 10s)
- Full save/restore logic (game state + transcript + theme + session metadata)
- Auto-save every 5 turns
- Panel toggles (drawer, burger menu, aria panel, transcript, dev hub)
- Therapy components (mood check-in, achievement toast, pause banner)

**Connects to:** Nearly everything — all gameplay/*, voice/*, transcript/*, drawer/*, menu/*, devpanel/*, therapy/* components. Stores: `useGameStore`, `useTranscriptStore`, `useAriaModeStore`, `useGameThemeStore`. Libs: `@/lib/gameApi`, `@/lib/gameAriaAdapter`.

---

<a id="TranscriptScreen"></a>
### screens/TranscriptScreen.tsx
**Full-screen transcript overlay** toggled from GameScreen. Renders the session log with header, color legend, scrollable entries, and footer with export/clear. Returns `null` when `!isOpen`.

**Connects to:** `useTranscriptStore`, `useGameStore`, `TranscriptHeader`, `TranscriptLegend`, `TranscriptLog`, `TranscriptFooter`.

---

<a id="ThemedContainer"></a>
### shared/ThemedContainer.tsx
**CSS variable injection wrapper.** Reads the active theme preset and mood colors from `useGameThemeStore`, converts them to CSS custom properties (`--bg-deep`, `--gold`, `--mood-primary`, etc.), and applies them as inline styles. Every themed component downstream uses these variables.

**Connects to:** `useGameThemeStore`.

---

<a id="NarrativeText"></a>
### shared/NarrativeText.tsx
**Safe markdown-bold renderer.** Splits text on `**...**` patterns and renders bold segments as gold-highlighted `<span>` elements. No raw HTML injection — pure React elements only. Used by `NarrativePanel`.

**Connects to:** Nothing (pure presentational).

---

<a id="VibeCard"></a>
### onboarding/VibeCard.tsx
**Selectable card for engagement vibe** (build cool / your way / explore together). Gold left-border accent on selection, slide-right hover animation.

**Connects to:** Called by `OnboardingScreen`.

---

<a id="DepthSelector"></a>
### onboarding/DepthSelector.tsx
**Three-option toggle** for interview depth: Quick (~10q), Custom (~20q), Epic (30+q). Highlights selected option with gold border.

**Connects to:** Called by `OnboardingScreen`.

---

<a id="CartridgePicker"></a>
### onboarding/CartridgePicker.tsx
**Fetches and displays pre-made game cartridges** from `@/lib/gameApi.fetchCartridges()`. Renders a "try a demo adventure" section with `CartridgeCard` for each. Hidden if no cartridges available.

**Connects to:** `@/lib/gameApi`, `CartridgeCard`, `@/types/game.Cartridge`.

---

<a id="CartridgeCard"></a>
### onboarding/CartridgeCard.tsx
**Display card for a single cartridge** — shows name, age range, tagline, and tone hint. Click triggers cartridge load.

**Connects to:** `@/types/game.Cartridge`.

---

<a id="SaveCard"></a>
### onboarding/SaveCard.tsx
**Saved game card** with title, protagonist, location, turn count, stats, and relative timestamp. Two bottom buttons: Continue (resume) and Delete. Includes `timeAgo()` helper.

**Connects to:** `@/lib/gameApi.SaveSummary`.

---

<a id="AriaMessage"></a>
### interview/AriaMessage.tsx
**Displays Aria's current interview question** with a phase label (GETTING TO KNOW YOU, YOUR CHARACTER, etc.) and the question text in serif gold. Fade-slide-up animation.

**Connects to:** `@/types/game.InterviewQuestion`.

---

<a id="InterviewProgress"></a>
### interview/InterviewProgress.tsx
**Progress bar** showing current question / total with a gold gradient fill. Null if no progress data.

**Connects to:** `@/types/game.InterviewProgress`.

---

<a id="MirrorBubble"></a>
### interview/MirrorBubble.tsx
**Therapeutic reflection moment** during the interview. Teal-bordered card with italic reflection text, "Continue" and "Tell me more" buttons. Bounce-in animation. Part of the graduated disclosure system.

**Connects to:** `@/types/game.MirrorBubble`, `@/types/game.InterviewQuestion`.

---

<a id="ConversationTrail"></a>
### interview/ConversationTrail.tsx
**Scrollable history of previous Q&A pairs** during the interview. Each entry shows the question (gold-dim) and the user's answer (secondary text).

**Connects to:** Receives `trail: Array<{question, answer}>` from `InterviewScreen`.

---

<a id="InterviewInput"></a>
### interview/InterviewInput.tsx
**Textarea input with send button** for the interview phase. Supports auto-grow up to 120px, Enter-to-submit (Shift+Enter for newline). Optional exit ramp suggestion displayed above the input.

**Connects to:** Called by `InterviewScreen`.

---

<a id="GameTopBar"></a>
### gameplay/GameTopBar.tsx
**Top navigation bar** during gameplay. Shows: burger menu button (left), game title + turn count + SU mode badge (center), journal/aria/transcript/dev toggle buttons (right). Reads `useAriaModeStore` for SU badge visibility.

**Connects to:** `useAriaModeStore`. Callbacks from `GameScreen`.

---

<a id="GameMap"></a>
### gameplay/GameMap.tsx
**Horizontal scrollable location breadcrumbs** in the gameplay area. Each node shows as a pill (gold if current, secondary if discovered, dim if hidden). Connected by dash separators. Click navigates to discovered locations.

**Connects to:** `@/types/game.MapNode`.

---

<a id="StatsBar"></a>
### gameplay/StatsBar.tsx
**Minimal stats display** — Courage, Trust, Items as mono text with gold values. Fixed height, always visible.

**Connects to:** `@/types/game.PlayerStats`.

---

<a id="NarrativePanel"></a>
### gameplay/NarrativePanel.tsx
**Scrollable narrative text feed** — the main story output area. Auto-scrolls to bottom on new entries. Each narrative uses `NarrativeText` for safe bold rendering. Fade-slide-up animation per entry.

**Connects to:** `NarrativeText`.

---

<a id="QuestChoices"></a>
### gameplay/QuestChoices.tsx
**Branching choice buttons** displayed when the game presents options. Gold left-border accent, slide-right hover. Hidden when no choices available.

**Connects to:** `@/types/game.QuestChoice`.

---

<a id="ActionsBar"></a>
### gameplay/ActionsBar.tsx
**Context-sensitive action pills** from the game engine. Shows first 4 by default with a "+N MORE" expand toggle. Priority actions (quest, look) get gold border. Each pill is `action target` format — click triggers `onAction(action, target)`.

**Connects to:** Receives `actions: string[]` from `GameScreen`.

---

<a id="GameInput"></a>
### gameplay/GameInput.tsx
**Command input textarea with slash command parser.** Detects `/command args` patterns, routes to `onSlash` handler. SU mode shows purple accent and mode indicator. Same auto-grow textarea pattern as `InterviewInput`.

**Connects to:** `useAriaModeStore`. Callbacks from `GameScreen`.

---

<a id="RestOverlay"></a>
### gameplay/RestOverlay.tsx
**Full-screen save & rest overlay** triggered at therapeutic rest points. "Keep playing" or "Save & rest" buttons. Dark backdrop with centered card.

**Connects to:** Called by `GameScreen`.

---

<a id="GameVoiceOrb"></a>
### voice/GameVoiceOrb.tsx
**Floating mic button** (bottom-right) that triggers Aria voice connection. Visual state driven by `useGameVoiceStore.orbState`: idle (pulse), connecting (spin), listening (glow), thinking (spin), speaking (glow+scale). Radial gold gradient background.

**Connects to:** `useGameVoiceStore`.

---

<a id="VoiceStatus"></a>
### voice/VoiceStatus.tsx
**Small text label** below the voice orb showing connection state ("listening", "thinking...", "speaking") or last spoken text snippet. Hidden when idle.

**Connects to:** `useGameVoiceStore`.

---

<a id="TranscriptHeader"></a>
### transcript/TranscriptHeader.tsx
**Header bar** for the transcript screen — "Session Transcript" title in teal, close button.

**Connects to:** Called by `TranscriptScreen`.

---

<a id="TranscriptLegend"></a>
### transcript/TranscriptLegend.tsx
**Color legend bar** — Player (blue), Aria (gold), Game (teal), System (gray) with colored dots.

**Connects to:** Nothing (pure presentational).

---

<a id="TranscriptEntry"></a>
### transcript/TranscriptEntry.tsx
**Single transcript log entry.** Color-coded by type (user/aria/game/system) with left border, timestamp, turn number. Each type has distinct text style (e.g., aria is italic serif).

**Connects to:** `@/types/game.TranscriptEntry`.

---

<a id="TranscriptLog"></a>
### transcript/TranscriptLog.tsx
**Auto-scrolling list** of `TranscriptEntry` components. Shows placeholder when empty.

**Connects to:** `TranscriptEntry`, `@/types/game.TranscriptEntry`.

---

<a id="TranscriptFooter"></a>
### transcript/TranscriptFooter.tsx
**Footer with Export JSON and Clear buttons.** Export downloads full transcript, Clear empties the store.

**Connects to:** Called by `TranscriptScreen`.

---

<a id="DevPanel"></a>
### devpanel/DevPanel.tsx
**Legacy dev log viewer** (single panel). Reads from `useDevLogStore`, color-codes by level (ERR/WRN/INF/DBG). Full-screen overlay with header, scrollable log, and placeholder footer.

**Connects to:** `useDevLogStore`, `@/store/devLog.DevLogEntry`.

---

<a id="DevHub"></a>
### devpanel/DevHub.tsx
**6-tab developer dashboard** (420 lines) — the advanced dev panel. Tabs: Logs (filterable by level/source), Voice+Config (connection status, theme, game config), Game State (live stats, persistence status, map nodes), Commands (audit trail), Therapy (therapist controls, flags, mood, achievements, notes), Clinical (psychology data sources, ICD-11, LOINC, clinical cartridges). Uses `useSyncExternalStore` to subscribe to ring-buffer loggers. Portaled to document.body.

**Connects to:** `@/lib/gameDevLogger` (devLogger, commandAudit), `useGameStore`, `useGameVoiceStore`, `useGameThemeStore`, `useAriaModeStore`, `useDashboardStore`, `@/lib/aria-core/devhub/*`.

---

<a id="GameDrawer"></a>
### drawer/GameDrawer.tsx
**Left-slide drawer shell** — 80% width, dimmed backdrop, swipe-to-close gesture, Escape key support. Journal/field-notebook aesthetic. Contains `DrawerSection` children.

**Connects to:** Called by `GameScreen`. Contains drawer content components.

---

<a id="DrawerHandle"></a>
### drawer/DrawerHandle.tsx
**Thin vertical tab on left screen edge** — always visible when drawer is closed. Three gold dots, tap to open. z-index 49.

**Connects to:** Called by `GameScreen`.

---

<a id="DrawerSection"></a>
### drawer/DrawerSection.tsx
**Collapsible accordion section** for the drawer — icon, title, optional count badge, chevron toggle. Animates max-height on open/close.

**Connects to:** Used by `GameScreen` to wrap drawer content.

---

<a id="DrawerMap"></a>
### drawer/DrawerMap.tsx
**Visual world map using ReactFlow** (`@xyflow/react`). Custom circle nodes with glow for current location, dimmed for undiscovered. Auto-layout in 3-column grid with offset rows. Animated edges between discovered nodes. Click navigates.

**Connects to:** `@xyflow/react`, `@/types/game.MapNode`.

---

<a id="DrawerInventory"></a>
### drawer/DrawerInventory.tsx
**3-column item grid** with emoji icons mapped by keyword. Tap to inspect (shows description), "Use" button triggers action. Empty state shows backpack emoji.

**Connects to:** Called by `GameScreen`.

---

<a id="DrawerQuests"></a>
### drawer/DrawerQuests.tsx
**Quest journal** — active quests (pinned, gold highlight for active) and completed quests (strikethrough, dimmed). Each shows title and description.

**Connects to:** `@/types/game.Quest`.

---

<a id="DrawerCompanion"></a>
### drawer/DrawerCompanion.tsx
**Companion display** — emoji avatar (mapped by species keyword), name, description, and a 5-heart bond level indicator. Null state shows "No companion."

**Connects to:** `@/types/game.GameCompanion`.

---

<a id="BurgerMenu"></a>
### menu/BurgerMenu.tsx
**Settings slide-out menu** (left, 75% width). Sections: Profile (user ID, current game), Theme (4 presets: Classic, Ocean Depths, Deep Space, Noir City), Game (save, load with expandable saves list, exit to menu), About. Loads saves on open.

**Connects to:** `useGameStore`, `useGameThemeStore`, `useTranscriptStore`, `@/lib/gameApi` (listSaves).

---

<a id="AriaPanel"></a>
### menu/AriaPanel.tsx
**Aria configuration panel** — full-screen overlay. Sections: Connection status (connected/disconnected, connect/disconnect button), Voice selection (6 voices: Aoede, Kore, Puck, Charon, Fenrir, Leda), Personality sliders (warmth, verbosity, atmosphere — placeholder), NPC voice presets, Active context summary.

**Connects to:** `useGameVoiceStore`, `useGameStore`, `@/lib/gameAriaAdapter` (gameAriaConnect, gameAriaDisconnect).

---

<a id="MoodCheckIn"></a>
### therapy/MoodCheckIn.tsx
**1-5 mood selector** shown at session start and end. Weather-themed emoji buttons, submits to dashboard API via `useDashboardStore.recordMood`. Skip option available. Therapist sees mood velocity across sessions.

**Connects to:** `useDashboardStore`, `useGameStore`, `@/types/dashboard.MOOD_LABELS`.

---

<a id="AchievementToast"></a>
### therapy/AchievementToast.tsx
**Slide-up toast notification** when a therapeutic achievement is earned during gameplay. Star icon, title, description. Auto-dismisses after 3.5s with exit animation.

**Connects to:** Triggered by `game_kg_bridge` achievement system via `GameScreen`.

---

<a id="TherapistPauseBanner"></a>
### therapy/TherapistPauseBanner.tsx
**Full-screen pause overlay** when a therapist pauses the session remotely. Pause icon, "Session Paused" message, custom therapist message. Blocks all interaction (z-index 10000).

**Connects to:** Therapist controls polled by `GameScreen` from `/api/dashboard/user/{id}/controls`.

---

## External Dependencies Summary

| Store | Purpose |
|---|---|
| `useGameStore` | Core game state: screen, config, stats, map, choices, actions, narratives, user |
| `useTranscriptStore` | Session transcript entries, open/close, export |
| `useGameThemeStore` | Theme presets, mood colors, CSS variables |
| `useAriaModeStore` | game/su mode toggle |
| `useGameVoiceStore` | Voice orb state, connection status, last spoken text |
| `useDashboardStore` | Therapist dashboard integration, mood recording |
| `useDevLogStore` | Legacy dev log entries |

| Library | Purpose |
|---|---|
| `@/lib/gameApi` | All backend API calls (interview, game actions, save/load, cartridges) |
| `@/lib/gameAriaAdapter` | Voice connection, narrative callbacks, UI callbacks, mode switching |
| `@/lib/gameDevLogger` | Ring-buffer dev logger + command audit trail |
| `@xyflow/react` | ReactFlow graph library (DrawerMap only) |

### Backend API
| Endpoint | Method | Router | Purpose |
|----------|--------|--------|---------|
| `/api/game/snapshot/{userId}` | GET | game | Check if backend has game loaded (session hydration) |
| `/api/game/cartridges` | GET | game | Fetch pre-made cartridge list |
| `/api/game/cartridges/load` | POST | game | Load a cartridge into the game engine |
| `/api/game/interview/start` | POST | game | Start the AI interview flow |
| `/api/game/interview/answer` | POST | game | Submit an interview answer |
| `/api/game/interview/expand_mirror` | POST | game | Expand a mirror bubble therapeutic moment |
| `/api/game/generate` | POST | game | Generate game world from interview synthesis |
| `/api/game/play/start` | POST | game | Begin gameplay (first action after generation) |
| `/api/game/play/action` | POST | game | Submit a gameplay action (move, look, choose, use) |
| `/api/game/play/save` | POST | game | Quick save current game state |
| `/api/game/save-full` | POST | game | Full save with transcript, session state, narratives |
| `/api/game/saves/{userId}` | GET | game | List all saves for a user |
| `/api/game/load-save` | POST | game | Load a saved game (full restore) |
| `/api/game/saves/{userId}/{saveId}` | DELETE | game | Delete a saved game |
| `/api/game/voice-config` | GET | game | Fetch voice configuration |
| `/api/dashboard/user/{userId}` | GET | dashboard | Fetch user dashboard data (flags, mood, achievements, notes) |
| `/api/dashboard/user/{userId}/controls` | GET | dashboard | Poll therapist controls (pause, disclosure layer, messages) |
| `/api/dashboard/health` | GET | dashboard | Check dashboard API health status |
