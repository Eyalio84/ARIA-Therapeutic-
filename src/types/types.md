<!-- last-verified: 2026-03-25 -->

# types/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `src/types/` |
| **Purpose** | Shared TypeScript type definitions for game engine, therapist dashboard, and SQLite WASM |
| **Framework / stack** | TypeScript (pure types, no runtime code) |
| **Entry point** | No single entry — each file imported independently |
| **External dependencies** | `@sqlite.org/sqlite-wasm` (ambient declaration) |
| **Component/file count** | 3 files |
| **Architecture style** | Standalone type modules with no cross-imports |

## File Tree

```
types/
├── dashboard.ts       # Therapist dashboard analytics types
├── game.ts            # Game engine types (mirrors backend dataclasses)
└── sqlite-wasm.d.ts   # Ambient declaration for SQLite WASM
```

## Component/Module Index

<a id="dashboard"></a>
### dashboard.ts

**Type definitions for the therapist dashboard — mood tracking, flagged moments, session notes, achievements, choice analysis, mirror analytics, and antagonist analysis.**

- `MoodCheckIn` — 1-5 scale mood at session start/end
- `MoodVelocity` — Trend analysis (improving/declining/stable) with delta and average
- `FlaggedMoment` — Severity-rated moments (info/attention/concern/urgent) with annotations
- `SessionNote` — Therapist notes attached to nodes, flags, choices, or sessions
- `Achievement` — Earned/unearned achievements with timestamps
- `ChoiceEvent` / `ChoiceTimeline` — Quest choice records with therapeutic mappings
- `MirrorAnalytics` — Interview engagement metrics
- `AntagonistAnalysis` — Character fear/resolution analysis
- `KGStats` — Knowledge graph node/edge counts by type
- `FullDashboard` — Aggregates all above into a single dashboard object
- `MOOD_LABELS` — Constants mapping 1-5 to weather-themed labels with emojis
- **Connects to:** `store/dashboard.ts`, `components/dashboard/*`

---

<a id="game"></a>
### game.ts

**Type definitions for the game engine, mirroring backend Python dataclasses. Covers world-building, gameplay, onboarding, and transcript logging.**

- `Cartridge` — Game metadata (id, name, age, tagline, tone)
- `GameNPC` — NPC personality, dialogue style, location, relationship
- `GameLocation` — World locations with atmosphere, exits, NPCs, items, mood colors
- `GameItem` — Inventory items with use effects
- `Quest` / `QuestChoice` — Quests with player choice options and effects
- `GameCompanion` — Companion character for protagonist
- `GameConfig` — Complete game cartridge (locations, NPCs, items, quests, endings, state vars, map)
- `MapNode` / `MapEdge` — Map visualization with discovery state and colors
- `InterviewQuestion` / `InterviewProgress` — Onboarding interview flow
- `MirrorBubble` — Therapeutic reflection prompts
- `GameActionResponse` — Server response to player actions (narrative, state changes, mirrors, endings)
- `GameScreen` — Union: "onboarding" | "interview" | "generating" | "game"
- `PlayerStats` — Player metrics (courage, trust, items)
- `TranscriptEntry` / `TranscriptEntryType` — Typed transcript entries with metadata
- **Connects to:** `store/game.ts`, `store/transcript.ts`, `components/game/*`, `lib/gameAriaAdapter.ts`

---

<a id="sqlite-wasm"></a>
### sqlite-wasm.d.ts

**Ambient module declaration for `@sqlite.org/sqlite-wasm`. Declares `initSqlite` with optional print callbacks returning `Promise<unknown>`.**

- **Connects to:** `lib/db.ts`

---

## External Dependencies Summary

### Libraries

| Library | Purpose |
|---|---|
| `@sqlite.org/sqlite-wasm` | SQLite WASM module (ambient type declaration) |
