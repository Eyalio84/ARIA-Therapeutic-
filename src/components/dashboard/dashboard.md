<!-- last-verified: 2026-03-25 -->

# dashboard — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/components/dashboard` |
| **Purpose** | Therapist-facing dashboard for monitoring patient gameplay, mood, therapy knowledge graph, clinical flags, sessions, and assessments |
| **Framework / stack** | React 18+, Next.js (client components), ReactFlow, Zustand (stores), Tailwind CSS |
| **Entry point** | `DashboardShell.tsx` |
| **External dependencies** | `@/store/dashboard` (useDashboardStore), `@/store/game` (useGameStore), `@/types/dashboard` (MOOD_LABELS), `reactflow`, `NEXT_PUBLIC_GAME_API` env var |
| **Component/file count** | 7 files, 10 exported/internal components |
| **Design language** | Dark glassmorphism UI with amber (#c9a96e) accent, severity-coded color system |

## File Tree

```
dashboard/
├── DashboardShell.tsx          # Root shell — tab nav, user selector, renders active tab
└── tabs/
    ├── OverviewTab.tsx          # Summary stats, therapist controls, concerns, flags, achievements, recap
    ├── TherapyKGTab.tsx         # Interactive React Flow graph of therapy knowledge graph
    ├── MoodTab.tsx              # Mood velocity card + session mood history timeline
    ├── FlagsNotesTab.tsx        # Flagged moments list + therapist notes CRUD
    ├── SessionsTab.tsx          # Session history, choice evolution, mirror analytics, JSON export
    └── AssessmentsTab.tsx       # Clinical scale catalog (PHQ-9, GAD-7, etc.) + integration status
```

## Component / Module Index

---

<a id="DashboardShell"></a>

### DashboardShell.tsx

**Root orchestrator that provides the tab navigation shell, user ID input, and conditionally renders the active tab component.**

- Defines the 6-tab layout (Overview, Therapy KG, Mood, Flags & Notes, Sessions, Assessments)
- Auto-populates user ID from `useGameStore` if available
- Shows loading, error, and empty states before delegating to tab components
- **Connects to:** `useDashboardStore` (userId, fetchDashboard, loading, error), `useGameStore` (userId auto-population), all 6 tab components

---

<a id="OverviewTab"></a>

### tabs/OverviewTab.tsx

**Dashboard landing view showing summary statistics, therapist real-time controls, active concerns, recent flags, achievements, and a story recap.**

- Contains two internal components: `StatCard` (presentational stat display) and `SeverityBadge` (severity-colored pill)
- Contains `TherapistControlsPanel` — a stateful sub-component that polls the API for controls state and provides pause/resume, disclosure layer adjustment (L1-L4), send-message-to-player, and inject-context-for-next-session capabilities
- Displays KG node count, mood trend, achievement progress, and flag count as stat cards
- Shows active concerns with intensity percentages, recent flags (top 5), achievement grid, and story recap with refresh
- **Connects to:** `useDashboardStore` (dashboard, moodVelocity, flags, achievements, recap, fetchRecap), `NEXT_PUBLIC_GAME_API` (direct fetch for controls, pause, resume, message, context injection, disclosure)

---

<a id="TherapyKGTab"></a>

### tabs/TherapyKGTab.tsx

**Interactive node-graph visualization of the patient's therapy knowledge graph using React Flow.**

- Fetches graph data directly from `NEXT_PUBLIC_GAME_API/api/therapy/user/{userId}/graph`
- Color-codes nodes by type: concern (red), emotion (amber), trigger (orange), coping (green), breakthrough (purple), media (blue), goal (cyan), session (gray)
- Provides a color legend, refresh button, pan/zoom canvas with minimap, and a detail panel on node click showing type, intensity, description, session count
- **Connects to:** `useDashboardStore` (userId only), `reactflow` (ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState), `NEXT_PUBLIC_GAME_API` (direct fetch for graph data)

---

<a id="MoodTab"></a>

### tabs/MoodTab.tsx

**Displays mood velocity trend and a chronological timeline of per-session mood check-ins (start vs. end).**

- Contains internal `MoodBar` component — a presentational color-coded progress bar for mood values 1-5
- Shows mood velocity card with trend direction (improving/declining/stable), session count, average, and delta
- Renders mood scale legend using `MOOD_LABELS` from types
- Lists each session's start/end mood with change indicator
- **Connects to:** `useDashboardStore` (userId, moodHistory, moodVelocity, fetchMood), `@/types/dashboard` (MOOD_LABELS)

---

<a id="FlagsNotesTab"></a>

### tabs/FlagsNotesTab.tsx

**Two-section view for reviewing auto-flagged concerning moments and managing therapist clinical notes.**

- Flags section displays severity-colored cards (info/attention/concern/urgent) with category, description, quoted user content, and optional therapist annotations
- Inline annotation form lets therapist add clinical notes to individual flags
- Notes section lists existing notes and provides a form to add new notes with target type (session/node/flag/choice) and target ID
- **Connects to:** `useDashboardStore` (userId, flags, notes, fetchFlags, fetchNotes, annotateFlag, addNote)

---

<a id="SessionsTab"></a>

### tabs/SessionsTab.tsx

**Session history list, choice evolution timeline, mirror bubble analytics, and full dashboard JSON export.**

- Session history shows each session's date, summary, mood in/out, and KG node count
- Choice evolution displays detected behavioral patterns and a timeline with color-coded dots (breakthrough = purple, avoidance = orange)
- Mirror analytics shows interview shown/expanded/engagement ratio with interpretation text
- Export button serializes the full dashboard object to a downloadable JSON file
- **Connects to:** `useDashboardStore` (dashboard, choiceTimeline, mirrorAnalytics, userId, submitChoicesForAnalysis, submitMirrorStats)

---

<a id="AssessmentsTab"></a>

### tabs/AssessmentsTab.tsx

**Catalog of supported clinical assessment scales with integration status and connected data sources.**

- Displays 6 clinical scales in a card grid: PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS
- Each card shows scale name, what it measures, item count, score range, and LOINC code if applicable
- Integration status section shows which scales are active, ready, or available for future use
- Connected data sources section lists ICD-11, LOINC, and Psychology JSON import status
- Scale detail loading is stubbed — fetches from health endpoint but doesn't render detail yet
- **Connects to:** `NEXT_PUBLIC_GAME_API` (direct fetch for scale data, currently stubbed)

---

## External Dependencies Summary

### Stores / State

| Store | Purpose |
|---|---|
| `useDashboardStore` (`@/store/dashboard`) | Central state for dashboard data — user ID, dashboard payload, mood, flags, notes, achievements, recap, choice timeline, mirror analytics, and all fetch/mutation actions |
| `useGameStore` (`@/store/game`) | Game session state — used only to auto-populate userId in DashboardShell |

### Libraries

| Library | Purpose |
|---|---|
| `react` | Component framework (useState, useEffect, useCallback) |
| `reactflow` | Interactive node-graph rendering for TherapyKGTab (ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState) |
| `next` (implicit) | "use client" directive — all components are client-side rendered |

### Types

| Type | Source | Purpose |
|---|---|---|
| `MOOD_LABELS` | `@/types/dashboard` | Mood scale emoji/value mappings for the mood legend |

### APIs

| Endpoint Pattern | Used By |
|---|---|
| `/api/therapy/user/{userId}/graph` | TherapyKGTab — fetch KG graph data |
| `/api/dashboard/user/{userId}/controls` | OverviewTab — poll therapist controls state |
| `/api/dashboard/user/{userId}/pause` | OverviewTab — pause game |
| `/api/dashboard/user/{userId}/resume` | OverviewTab — resume game |
| `/api/dashboard/user/{userId}/therapist-message` | OverviewTab — send message to player |
| `/api/dashboard/user/{userId}/inject-context` | OverviewTab — inject context for next session |
| `/api/dashboard/user/{userId}/disclosure` | OverviewTab — set max disclosure layer |
| `/api/dashboard/health` | AssessmentsTab — fetch scale data (stubbed) |
