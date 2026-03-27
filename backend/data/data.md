<!-- last-verified: 2026-03-25 -->

# data/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `backend/data/` |
| **Purpose** | Static and generated data layer for the Aria backend — psychology reference datasets, knowledge-graph builders, pre-built game cartridges, clinical cartridges, and per-user SQLite databases |
| **Framework / stack** | Python 3, SQLite (with WAL mode, FTS5), JSON |
| **Entry point** | No single entry point; modules are imported by backend services (`build_jewelry_kg.py`, `build_therapy_kg.py`, `clinical_cartridges.py`, `prebuilt_games.py`) |
| **External dependencies** | `sqlite3`, `uuid`, `datetime`, `dataclasses`, `os` (all stdlib); consumed by NAI KGManager, GameInterviewEngine, GameGenerator, therapist dashboard |
| **Component/file count** | 4 Python modules, 11 JSON datasets, 1 generated `.db`, ~15 runtime SQLite databases |
| **Architecture style** | Data-oriented — static JSON knowledge bases + Python factories that produce per-user SQLite graphs |

## File Tree

```
data/
  build_jewelry_kg.py          # Builds jewelry-store knowledge graph into SQLite
  build_therapy_kg.py          # Per-user therapy KG factory (TherapyKG class)
  clinical_cartridges.py       # 5 therapy-approach-specific game scenarios
  prebuilt_games.py            # 3 pre-built game cartridges bypassing interview
  jewelry-store-kg.db          # Generated SQLite KG for jewelry demo store
  psychology/
    act_processes.json          # ACT hexaflex processes and exercises
    assessment_scales.json      # Clinical assessment instruments (PHQ-9, GAD-7, etc.)
    cognitive_distortions.json  # 15 CBT cognitive distortions with game mappings
    dbt_skills.json             # DBT skills across 4 modules
    disorder_communication.json # Per-disorder communication rules for 10 conditions
    graduated_disclosure.json   # 4-layer disclosure depth control with safety triggers
    icd11_mental_disorders.json # ICD-11 Chapter 06 mental disorder taxonomy
    ifs_model.json              # Internal Family Systems parts model
    npc_archetypes.json         # 7 therapeutic NPC archetypes
    oars_framework.json         # Motivational Interviewing OARS framework
    safe_phrases.json           # Validated safe/harmful phrase filtering lists
  therapist/
    controls.db                 # Therapist controls SQLite database (runtime)
    dashboard.db                # Therapist dashboard SQLite database (runtime)
  therapy/
    user_*.db                   # Per-user therapy KG databases (runtime, WAL mode)
  users/
    */game.db                   # Per-user game state databases (runtime)
```

## Module Index

---

<a id="build_jewelry_kg"></a>

### build_jewelry_kg.py

**Builds a jewelry-store knowledge graph into a SQLite database for the demo store theme, populating products, categories, materials, brand values, care instructions, gift occasions, and all relationship edges.**

- Defines 8 products, 6 categories, 8 materials, 4 brand values, 4 care instructions, 6 gift occasions, and 3 brand identity nodes
- Creates edge types: `belongs_to`, `made_of`, `needs_care`, `recommended_for`, `pairs_with`, `similar_to`, `defines`, `sold_by`, `requires_care`, `similar_price_tier`
- Includes intent keywords per node for search/matching
- Schema uses `nodes`/`edges` tables compatible with NAI KGManager

**Connects to:** `sqlite3` (stdlib), outputs `jewelry-store-kg.db`, consumed by NAI KGManager

---

<a id="build_therapy_kg"></a>

### build_therapy_kg.py

**Per-user therapy knowledge graph factory — each user gets their own SQLite database that grows as Aria extracts concerns, emotions, triggers, coping strategies, and breakthroughs from conversation.**

- `TherapyKG` class manages one user's SQLite KG with WAL mode and FTS5 full-text search
- Node types: `concern`, `emotion`, `media`, `coping`, `breakthrough`, `trigger`, `goal`, `session`
- Edge types: `triggers`, `helps_with`, `analogy_for`, `progressed`, `explored_in`, `feels_like`, `leads_to`, `resolved_by`, `connected_to`
- Session tracking with mood scores and node-count deltas
- `to_react_flow()` exports the graph for React Flow visualization
- `create_user_kg()` factory and `list_user_kgs()` utility
- Includes a `demo()` function simulating a 3-session therapy progression

**Connects to:** `sqlite3`, `uuid`, `datetime`, `dataclasses` (stdlib); outputs to `therapy/user_*.db`; consumed by backend therapy services and therapist dashboard

---

<a id="clinical_cartridges"></a>

### clinical_cartridges.py

**Defines 5 therapy-approach-specific game scenarios (cartridges), each built around a clinical modality with full world/character/story synthesis and references to psychology JSON data.**

- CBT: "The Thought Detective" — cognitive distortion identification (references `cognitive_distortions.json`)
- DBT: "The Fire Keeper" — distress tolerance and emotion regulation (references `dbt_skills.json`)
- ACT: "The Compass Quest" — values-driven exploration (references `act_processes.json`)
- IFS: "The Council of Parts" — internal family systems (references `ifs_model.json`)
- MI/OARS: "The Listener's Garden" — motivational interviewing (references `oars_framework.json`)
- Each cartridge includes narrator config, character/world/story synthesis, therapeutic data source, and NPC archetype assignments

**Connects to:** `psychology/cognitive_distortions.json`, `psychology/dbt_skills.json`, `psychology/act_processes.json`, `psychology/ifs_model.json`, `psychology/oars_framework.json`, `psychology/npc_archetypes.json`; consumed by GameGenerator

---

<a id="prebuilt_games"></a>

### prebuilt_games.py

**Provides 3 complete mock user profiles (Maya, Ren, Ash) that bypass the GameInterviewEngine interview, each with a full synthesis dict ready for GameGenerator.**

- Maya (age 14): ocean fantasy, school pressure, bioluminescent world
- Ren (age 22): sci-fi space station, isolation and connection
- Ash (age 35): noir philosophical, identity and fog-covered city
- Each includes narrator config, character, world, story, challenges, choices, and preferences
- `list_cartridges()` returns summaries; `get_cartridge()` returns full data

**Connects to:** consumed by GameInterviewEngine and GameGenerator

---

<a id="act_processes"></a>

### psychology/act_processes.json

**ACT hexaflex framework defining 6 core processes (Acceptance, Cognitive Defusion, Being Present, Self-as-Context, Values, Committed Action) with exercises, metaphors, and game integration mappings.**

**Connects to:** referenced by `clinical_cartridges.py` (act_compass_quest); consumed by game narrative engine

---

<a id="assessment_scales"></a>

### psychology/assessment_scales.json

**7 clinical assessment instruments (PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS screener, simple mood) with items, scoring thresholds, and game integration notes for the therapist dashboard.**

**Connects to:** consumed by therapist dashboard; C-SSRS integrated with safety system auto-flagging

---

<a id="cognitive_distortions"></a>

### psychology/cognitive_distortions.json

**15 Burns/Beck cognitive distortions with definitions, example thoughts, game signal patterns, and reframe suggestions for CBT-based narrative design.**

**Connects to:** referenced by `clinical_cartridges.py` (cbt_thought_detective); consumed by game narrative engine and therapist dashboard

---

<a id="dbt_skills"></a>

### psychology/dbt_skills.json

**Structured DBT skills across 4 modules (Core Mindfulness, Distress Tolerance, Emotion Regulation, Interpersonal Effectiveness) with acronym breakdowns, exercises, and game/NPC mappings.**

**Connects to:** referenced by `clinical_cartridges.py` (dbt_fire_keeper); consumed by game narrative engine

---

<a id="disorder_communication"></a>

### psychology/disorder_communication.json

**Per-disorder communication rules for 10 conditions (anxiety, depression, PTSD, SUD, ADHD, bipolar, schizophrenia, OCD, eating disorders, BPD) including what opens users up, phrases to use, phrases to avoid, and NPC design guidelines.**

- Also includes 12 gamification mechanics mapped to clinical mechanisms and best-fit disorders

**Connects to:** consumed by voice interview system, NPC dialogue generator, game narrative engine

---

<a id="graduated_disclosure"></a>

### psychology/graduated_disclosure.json

**4-layer graduated disclosure model (Aspirational, Relational, Historical, Core Wounds) controlling depth of emotional content with unlock conditions, therapist review gates, and safety triggers.**

- Defines 5 safety triggers with severity levels and response protocols
- Includes interview opening sequence and pacing rules

**Connects to:** consumed by voice interview system, game narrative pacing, therapist approval workflow

---

<a id="icd11_mental_disorders"></a>

### psychology/icd11_mental_disorders.json

**ICD-11 Chapter 06 (Mental, behavioural or neurodevelopmental disorders) hierarchical taxonomy with 23 top-level disorder groupings, definitions, and ICD codes.**

**Connects to:** consumed by therapist dashboard for diagnostic classification reference

---

<a id="ifs_model"></a>

### psychology/ifs_model.json

**Internal Family Systems model defining Self qualities, 3 part types (Exiles, Managers, Firefighters), and game integration patterns for character creation and NPC design.**

**Connects to:** referenced by `clinical_cartridges.py` (ifs_council_of_parts); consumed by game narrative engine

---

<a id="npc_archetypes"></a>

### psychology/npc_archetypes.json

**7 therapeutic NPC archetypes (Companion, Mentor, Mirror, Challenger, Peer in Recovery, Gatekeeper, Scribe) with therapeutic functions, design rules, best-fit disorders, and example dialogue.**

- Includes projective identification design principles

**Connects to:** referenced by `clinical_cartridges.py` (all cartridges assign archetypes); consumed by game NPC generator

---

<a id="oars_framework"></a>

### psychology/oars_framework.json

**Motivational Interviewing OARS framework (Open-ended questions, Affirmations, Reflective Listening, Summarizing) with game examples, avoid lists, active listening cues, and curiosity stance rules.**

**Connects to:** referenced by `clinical_cartridges.py` (mi_listeners_garden); consumed by voice interview system

---

<a id="safe_phrases"></a>

### psychology/safe_phrases.json

**Validated safe and harmful phrase lists for voice interview and NPC dialogue generation — 13 universal safe phrases with contexts, 11 harmful phrases with explanations and alternatives.**

**Connects to:** consumed by voice interview system, NPC dialogue generator

---

<a id="therapist_dbs"></a>

### therapist/controls.db, therapist/dashboard.db

**Runtime SQLite databases for therapist-facing features — controls (session settings, approval gates) and dashboard (aggregated patient data, assessment scores).**

**Connects to:** populated by backend services; read by therapist dashboard frontend

---

<a id="therapy_dbs"></a>

### therapy/user_*.db

**Per-user therapy knowledge graph databases created by `build_therapy_kg.py`'s TherapyKG class, using WAL mode for concurrent read/write.**

**Connects to:** created/managed by `build_therapy_kg.py`; read by backend therapy services and React Flow visualization

---

<a id="game_dbs"></a>

### users/*/game.db

**Per-user game state databases storing game configuration, progress, and session data.**

**Connects to:** created/managed by game engine backend services

## External Dependencies Summary

### Stores / State

| Name | Purpose |
|---|---|
| `therapy/user_*.db` | Per-user therapy knowledge graphs (nodes, edges, sessions, FTS5) |
| `therapist/controls.db` | Therapist session controls and approval gates |
| `therapist/dashboard.db` | Aggregated patient data and assessment scores |
| `users/*/game.db` | Per-user game state and progress |
| `jewelry-store-kg.db` | Demo jewelry store knowledge graph |

### Libraries

| Name | Purpose |
|---|---|
| `sqlite3` | Database engine for all KG and state storage |
| `uuid` | Generate unique IDs for nodes, edges, and sessions |
| `datetime` | Timestamp all KG mutations |
| `dataclasses` | Type import (used in build_therapy_kg) |
| `os` | File path resolution and directory creation |
