<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# Dashboard — Start Here

> Read this first. Jump to [dashboard.md](dashboard.md) or [dashboard.ctx](dashboard.ctx) only for the component you need.

| Component | What it is | dashboard.md | dashboard.ctx |
|---|---|---|---|
| **DashboardShell** | Root shell with 6-tab navigation and user ID selector. Renders the active tab. Entry point for the entire dashboard. | [DashboardShell](dashboard.md#DashboardShell) | `DashboardShell` node |
| **OverviewTab** | Landing summary showing KG stats, mood trend, achievements, flags, active concerns, therapist controls (pause/resume/message/disclosure), and story recap. | [OverviewTab](dashboard.md#OverviewTab) | `OverviewTab` node |
| **TherapistControlsPanel** | Internal to OverviewTab. Real-time therapist controls: pause/resume game, set disclosure layer (L1-L4), send message to player, inject context for next session. Polls API every 5s. | [OverviewTab](dashboard.md#OverviewTab) | `TherapistControlsPanel` node |
| **TherapyKGTab** | Interactive React Flow visualization of the patient's therapy knowledge graph. Color-coded by node type with detail panel on click. | [TherapyKGTab](dashboard.md#TherapyKGTab) | `TherapyKGTab` node |
| **MoodTab** | Mood velocity trend card and chronological session mood timeline with start/end comparison bars. | [MoodTab](dashboard.md#MoodTab) | `MoodTab` node |
| **FlagsNotesTab** | Severity-coded flagged moments with inline annotation, plus a therapist notes section with CRUD for session/node/flag/choice targets. | [FlagsNotesTab](dashboard.md#FlagsNotesTab) | `FlagsNotesTab` node |
| **SessionsTab** | Session history list, choice evolution timeline with pattern detection, mirror bubble analytics, and full dashboard JSON export. | [SessionsTab](dashboard.md#SessionsTab) | `SessionsTab` node |
| **AssessmentsTab** | Catalog of 6 clinical scales (PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS) with integration status and connected data sources (ICD-11, LOINC). | [AssessmentsTab](dashboard.md#AssessmentsTab) | `AssessmentsTab` node |
| **StatCard** | Presentational. Renders a labeled stat with value, subtitle, and optional color. No state or side effects. | [OverviewTab](dashboard.md#OverviewTab) | `StatCard` node |
| **MoodBar** | Presentational. Color-coded horizontal progress bar for mood values 1-5. No state or side effects. | [MoodTab](dashboard.md#MoodTab) | `MoodBar` node |
