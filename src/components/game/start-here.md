<!-- last-verified: 2026-03-28 -->
> Parent: [../start-here.md](../start-here.md)

# game/ — Start Here

> Read this first. Jump to [game.md](game.md) or [game.ctx](game.ctx) only for the component you need.

| Component | What it is | game.md | game.ctx |
|---|---|---|---|
| **GameShell** | Root screen router. Maps `currentScreen` to one of 4 phase views. Hydrates backend session on mount. Interview error recovery guard resets to onboarding if question is null or has error phase. | [GameShell](game.md#GameShell) | `GameShell` node |
| **OnboardingScreen** | First screen — vibe selection, depth picker, cartridge browser, saved game list. Entry to interview or direct cartridge load. | [OnboardingScreen](game.md#OnboardingScreen) | `OnboardingScreen` node |
| **InterviewScreen** | AI-driven Q&A that builds the game world. Handles mirror bubble therapeutic moments and phase progression. | [InterviewScreen](game.md#InterviewScreen) | `InterviewScreen` node |
| **GeneratingScreen** | Stateless loading spinner shown during world generation. No logic — parent drives transitions. | [GeneratingScreen](game.md#GeneratingScreen) | `GeneratingScreen` node |
| **GameScreen** | Main gameplay orchestrator (490 lines). Manages actions, voice, slash commands, save/load, therapist polling, all panel toggles, and therapy overlays. | [GameScreen](game.md#GameScreen) | `GameScreen` node |
| **TranscriptScreen** | Full-screen session log overlay. Header, legend, scrollable entries, export/clear footer. | [TranscriptScreen](game.md#TranscriptScreen) | `TranscriptScreen` node |
| **ThemedContainer** | CSS variable injection wrapper. Reads theme store, sets `--bg-deep`, `--gold`, etc. as inline custom properties. | [ThemedContainer](game.md#ThemedContainer) | `ThemedContainer` node |
| **NarrativeText** | Safe `**bold**` markdown renderer using pure React elements. No raw HTML. | [NarrativeText](game.md#NarrativeText) | `NarrativeText` node |
| **VibeCard** | Selectable engagement option card with gold left-border accent. One of 3 vibes. | [VibeCard](game.md#VibeCard) | `VibeCard` node |
| **DepthSelector** | Three-button toggle for interview depth: Quick (~10q), Custom (~20q), Epic (30+q). | [DepthSelector](game.md#DepthSelector) | `DepthSelector` node |
| **CartridgePicker** | Fetches pre-made cartridges from API and renders a grid of `CartridgeCard`. Hidden if none. | [CartridgePicker](game.md#CartridgePicker) | `CartridgePicker` node |
| **CartridgeCard** | Single cartridge display — name, age, tagline, tone hint. Click loads it. | [CartridgeCard](game.md#CartridgeCard) | `CartridgeCard` node |
| **SaveCard** | Saved game card — title, protagonist, location, stats, timestamp. Continue or Delete. | [SaveCard](game.md#SaveCard) | `SaveCard` node |
| **AriaMessage** | Current interview question with phase label (GETTING TO KNOW YOU, etc.) in serif gold. | [AriaMessage](game.md#AriaMessage) | `AriaMessage` node |
| **InterviewProgress** | Progress bar — current/total with gold gradient fill. Null if no data. | [InterviewProgress](game.md#InterviewProgress) | `InterviewProgress` node |
| **MirrorBubble** | Therapeutic reflection moment — teal card with "Continue" and "Tell me more". Part of graduated disclosure. | [MirrorBubble](game.md#MirrorBubble) | `MirrorBubble` node |
| **ConversationTrail** | Scrollable history of Q&A pairs from the interview phase. | [ConversationTrail](game.md#ConversationTrail) | `ConversationTrail` node |
| **InterviewInput** | Textarea + send button for interview answers. Auto-grow, Enter-to-submit, optional exit ramp. | [InterviewInput](game.md#InterviewInput) | `InterviewInput` node |
| **GameTopBar** | Top nav — burger (left), title + turn count + SU badge (center), journal/aria/transcript/dev icons (right). | [GameTopBar](game.md#GameTopBar) | `GameTopBar` node |
| **GameMap** | Horizontal scrollable location breadcrumb pills. Gold=current, dim=undiscovered. Click navigates. | [GameMap](game.md#GameMap) | `GameMap` node |
| **StatsBar** | Minimal mono display — Courage, Trust, Items with gold values. | [StatsBar](game.md#StatsBar) | `StatsBar` node |
| **NarrativePanel** | Scrollable story feed with auto-scroll. Uses `NarrativeText` for each entry. | [NarrativePanel](game.md#NarrativePanel) | `NarrativePanel` node |
| **QuestChoices** | Branching choice buttons with gold left-border. Hidden when no choices. | [QuestChoices](game.md#QuestChoices) | `QuestChoices` node |
| **ActionsBar** | Collapsible action pills from game engine. First 4 shown, "+N MORE" toggle. Priority pills get gold. | [ActionsBar](game.md#ActionsBar) | `ActionsBar` node |
| **GameInput** | Command textarea with `/slash` parser. SU mode shows purple accent. Auto-grow. | [GameInput](game.md#GameInput) | `GameInput` node |
| **RestOverlay** | Full-screen "moment of rest" with Keep Playing / Save & Rest buttons. | [RestOverlay](game.md#RestOverlay) | `RestOverlay` node |
| **GameVoiceOrb** | Floating bottom-right mic button. Animated by orb state (pulse/spin/glow). Triggers Aria voice. | [GameVoiceOrb](game.md#GameVoiceOrb) | `GameVoiceOrb` node |
| **VoiceStatus** | Tiny label under voice orb — "listening", "thinking...", etc. Hidden when idle. | [VoiceStatus](game.md#VoiceStatus) | `VoiceStatus` node |
| **TranscriptHeader** | Title bar — "Session Transcript" in teal with close button. | [TranscriptHeader](game.md#TranscriptHeader) | `TranscriptHeader` node |
| **TranscriptLegend** | Color legend — Player(blue), Aria(gold), Game(teal), System(gray). | [TranscriptLegend](game.md#TranscriptLegend) | `TranscriptLegend` node |
| **TranscriptEntry** | Single log entry — color-coded by type, left border, timestamp, turn. | [TranscriptEntry](game.md#TranscriptEntry) | `TranscriptEntry` node |
| **TranscriptLog** | Auto-scrolling list of TranscriptEntry. Placeholder when empty. | [TranscriptLog](game.md#TranscriptLog) | `TranscriptLog` node |
| **TranscriptFooter** | Export JSON + Clear buttons for transcript. | [TranscriptFooter](game.md#TranscriptFooter) | `TranscriptFooter` node |
| **DevPanel** | Legacy single-panel dev log viewer. Color-coded by level. | [DevPanel](game.md#DevPanel) | `DevPanel` node |
| **DevHub** | 6-tab dev dashboard — Logs, Voice, Game, Cmds, Therapy, Clinical. Ring-buffer subscriptions. Portaled. | [DevHub](game.md#DevHub) | `DevHub` node |
| **GameDrawer** | Left-slide journal drawer — 80% width, swipe-to-close, backdrop. Contains DrawerSections. | [GameDrawer](game.md#GameDrawer) | `GameDrawer` node |
| **DrawerHandle** | Left-edge vertical tab — 3 gold dots. Visible when drawer closed. Tap to open. | [DrawerHandle](game.md#DrawerHandle) | `DrawerHandle` node |
| **DrawerSection** | Collapsible accordion — icon, title, count badge, chevron. Used inside GameDrawer. | [DrawerSection](game.md#DrawerSection) | `DrawerSection` node |
| **DrawerMap** | ReactFlow-based visual world map with custom circle nodes, auto-layout, animated edges. | [DrawerMap](game.md#DrawerMap) | `DrawerMap` node |
| **DrawerInventory** | 3-column item grid with emoji icons. Tap to inspect, "Use" triggers action. | [DrawerInventory](game.md#DrawerInventory) | `DrawerInventory` node |
| **DrawerQuests** | Quest journal — active (pinned) and completed (strikethrough). Title + description. | [DrawerQuests](game.md#DrawerQuests) | `DrawerQuests` node |
| **DrawerCompanion** | Companion card — emoji avatar, name, bio, 5-heart bond indicator. | [DrawerCompanion](game.md#DrawerCompanion) | `DrawerCompanion` node |
| **BurgerMenu** | Settings menu — profile, theme (4 presets), save/load/exit. Slides from left. | [BurgerMenu](game.md#BurgerMenu) | `BurgerMenu` node |
| **AriaPanel** | Aria config — connection, voice selection (6), personality sliders, NPC presets, context. | [AriaPanel](game.md#AriaPanel) | `AriaPanel` node |
| **MoodCheckIn** | 1-5 weather-emoji mood selector. Shown at session start/end. Posts to dashboard API. | [MoodCheckIn](game.md#MoodCheckIn) | `MoodCheckIn` node |
| **AchievementToast** | Slide-up toast for earned achievements. Star icon, auto-dismiss 3.5s. | [AchievementToast](game.md#AchievementToast) | `AchievementToast` node |
| **TherapistPauseBanner** | Full-screen blocking overlay when therapist pauses session. z-index 10000. | [TherapistPauseBanner](game.md#TherapistPauseBanner) | `TherapistPauseBanner` node |

## Backend Counterpart

> Also load these when working on this folder — components make direct API calls.

| Router | What this folder uses it for | Entry point |
|--------|------------------------------|-------------|
| **game** | Interview flow, game generation, play actions, save/load, cartridges, voice config, session snapshots | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
| **dashboard** | Therapist controls polling, user dashboard data, dashboard health check | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
