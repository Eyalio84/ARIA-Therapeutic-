<!-- last-verified: 2026-03-25 -->

# tests/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `backend/tests/` |
| **Purpose** | Test suite for the Aria V2.0 backend — validates the full stack from KG operations to 4D persona computation, game pipeline, therapy safety, introspection, and adversarial resilience |
| **Framework / stack** | Python 3, custom test runners (no pytest), assert-based validation |
| **Entry point** | `test_suite.py` (core services), individual `test_*.py` files for domain-specific runs |
| **External dependencies** | `services.introspection`, `services.persona_service`, `services.nai_service`, `services.response_service`, `services.game_interview`, `services.game_generator`, `services.game_runtime`, `services.gemini_narrative`, `services.therapy_safety`, `services.therapy_service`, `services.therapist_dashboard`, `persona.therapy_emotional`, `persona.therapy_relational`, `persona.therapy_linguistic`, `persona.therapy_temporal`, `data.build_therapy_kg`, `nai.kg_manager`, `routers.game`, `config` |
| **Component/file count** | 14 files (12 test modules, 1 results doc, 1 package init) |
| **Architecture style** | Flat test directory with per-domain modules, each containing a custom `run_tests()` runner and `ALL_TESTS` list |

## File Tree

```
tests/
  __init__.py                    # Package init (empty)
  test_suite.py                  # Master suite: KG, NAI, persona, introspection, response, edge cases
  test_adversarial.py            # 15 prompt-injection attacks against introspection engine
  test_game_api.py               # End-to-end game flow: interview to gameplay via services
  test_game_generator.py         # Interview synthesis to GameConfig: locations, NPCs, quests, items
  test_game_interview.py         # Question bank, depths, mirror bubbles, synthesis output
  test_game_runtime.py           # Playable engine: navigation, NPCs, items, quests, save/restore
  test_gemini_integration.py     # Live Gemini API: location enrichment, NPC dialogue, safety
  test_persona_stability.py      # 4D state consistency under manipulation attempts
  test_therapist_dashboard.py    # Clinical oversight: timelines, moods, flags, achievements
  test_therapy_kg.py             # Per-user therapy KG: CRUD, sessions, search, export, isolation
  test_therapy_personas.py       # 4D persona computers: emotional, relational, linguistic, temporal
  test_therapy_safety.py         # 26 safety scenarios: crisis, blocks, guardrails, adversarial
  test_therapy_service.py        # Therapy orchestrator pipeline: safety, KG, persona, validate
  ADVERSARIAL-RESULTS.md         # Generated report from test_adversarial.py (15/15 passed)
```

## Component/Module Index

---

<a id="test_suite"></a>

### test_suite.py

**Master test suite validating all core Aria V2.0 services across 6 groups: KG structure, NAI search, persona computation, introspection validation, response pipeline, and edge cases.**

- Group 1 — KG Tests (8): verifies SQLite KG exists with correct node/edge counts, types, schema detection, and intent keywords
- Group 2 — NAI Service Tests (10): search by text/intent/gift/budget, product CRUD, neighbor traversal, stats
- Group 3 — Persona Service Tests (8): 4D state computation, emotional axis (gift/price moods), relational activation, linguistic immutability, temporal step increment, prompt synthesis, trajectory tracking
- Group 4 — Introspection Tests (10): forbidden topics (politics, violence, competitors), identity denial, role break, meta leak, injection patterns, short valid responses, emotional mismatch detection
- Group 5 — Response Service Tests (6): full pipeline output, KG context inclusion, response validation (good/bad), full state retrieval, intent detection
- Group 6 — Edge Cases (8): empty query, missing product, empty category, empty message, very long query, special characters, unicode, empty validation
- **Connects to:** `services.nai_service.NAIService`, `services.persona_service.PersonaService`, `services.introspection.IntrospectionService`, `services.response_service.ResponseService`, `nai.kg_manager.detect_schema`, `config.JEWELRY_KG_PATH`

---

<a id="test_adversarial"></a>

### test_adversarial.py

**Runs 15 prompt-injection attacks against the introspection engine and generates ADVERSARIAL-RESULTS.md with pass/fail scores.**

- Tests include: direct identity override, system prompt extraction, brand contradiction, competitor identity theft, multi-turn manipulation, indirect product injection, political/violence derailment, role escape, instruction amnesia, nested injection, emotional manipulation, authority impersonation, context overflow, and subtle gradual drift
- Uses a simulated 4D persona state (BRAND_STATE) with warm mood and jewelry brand dialect
- Generates a markdown report via `generate_report()`
- **Connects to:** `services.introspection.IntrospectionService`

---

<a id="test_game_api"></a>

### test_game_api.py

**Integration tests for the full game flow from interview start through gameplay, covering serialization, multi-user isolation, and template validation.**

- `test_full_flow_interview_to_game` — complete pipeline: start interview, answer all questions, generate config, load game, play (look, quest, choose), save/restore state
- `test_interview_mirror_bubble_flow` — verifies mirror bubbles trigger for emotional answers
- `test_game_config_serialization` — JSON round-trip for GameConfig
- `test_multiple_users_isolated` — two simultaneous users with independent state
- `test_template_page_exists` — validates game.html template contains expected elements
- **Connects to:** `services.game_interview.GameInterviewEngine`, `services.game_generator.GameGenerator`, `services.game_runtime.GameRuntime`, `routers.game.init_services`

---

<a id="test_game_generator"></a>

### test_game_generator.py

**Validates GameGenerator output from interview synthesis: protagonist, locations, NPCs, items, quests, endings, state variables, visual map, and serialization.**

- Defines SAMPLE_SYNTHESIS — a complete realistic interview synthesis used by other test files
- Config generation (5): valid GameConfig, protagonist name, companion, title, theme
- Locations (5): 5+ locations, safe place exists with warm atmosphere, exits connected, mood colors, valid starting location
- NPCs (4): 3+ NPCs, helper/mentor/wildcard roles, antagonist with therapeutic mapping
- Items (3): 5+ items, keepsake starts in inventory, symbolic meanings
- Quests (5): 2+ quest arcs, branching choices with effects, therapeutic mappings and notes
- Endings (3): 2+ endings with conditions, protagonist name in narrative
- State variables (2): courage and trust exist, courage starts at interview-specified level
- Visual map (2): nodes match locations, 3+ edges
- Serialization (2): to_json and to_dict round-trip
- Edge cases (1): minimal/empty synthesis defaults
- **Connects to:** `services.game_generator.GameGenerator`, `services.game_generator.GameConfig`

---

<a id="test_game_interview"></a>

### test_game_interview.py

**Tests the GameInterviewEngine: question bank validation, depth levels, interview flow, mirror bubble logic, KG personalization, progress tracking, and exit ramps.**

- Question bank (8): quick ~10 questions, standard ~20, deep 30+, required fields, unique IDs, correct phase order, depth inclusion hierarchy
- Interview flow (4): start returns first question, answers advance, full quick completion yields synthesis with all sections
- Mirror bubbles (4): emotional weight detection, short answers score low, low-weight questions skip mirrors, vibe mode adapts expand prompts
- KG personalization (1): KG data personalizes companion question text
- Progress tracking (1): percentage increases with answers
- Exit ramps (1): high-weight deep questions have lighter alternatives
- **Connects to:** `services.game_interview.GameInterviewEngine`, `services.game_interview.InterviewDepth`, `services.game_interview.VibeMode`, `services.game_interview.ALL_QUESTIONS`, `services.game_interview.PHASE_ORDER`, `services.game_interview.DEPTH_INCLUDES`, `services.game_interview.InterviewPhase`, `services.game_interview.InterviewQuestion`

---

<a id="test_game_runtime"></a>

### test_game_runtime.py

**Tests the playable game engine: loading, navigation, NPC interaction, items, quests, state save/restore, session timers, mirror moments, and edge cases.**

- Uses CONFIG generated from SAMPLE_SYNTHESIS (imported from test_game_generator)
- Game start (4): opening scene, starting items in inventory, first quest active, state variables initialized
- Navigation (5): look command, valid/invalid movement, visited location tracking, map with discovered nodes
- NPCs (3): talk to NPC, nonexistent NPC fails gracefully, interaction count tracked
- Items (4): take item from location, use item, nonexistent item fails, inventory command
- Quests (5): quest status, make choice with state effects, choice advances stage, therapeutic notes logged, KG events generated
- State/save/restore (4): status command, save state dict, restore state (the handoff), contextual available actions
- Sessions (2): session timer detects expiry, timer returns None when time remains
- Mirror moments (1): symbolic item use triggers mirror moment with reflection text
- Edge cases (2): unknown action returns help text, no active game returns error
- **Connects to:** `services.game_generator.GameGenerator`, `services.game_runtime.GameRuntime`, `services.game_runtime.PlayerState`, `tests.test_game_generator.SAMPLE_SYNTHESIS`

---

<a id="test_gemini_integration"></a>

### test_gemini_integration.py

**Live Gemini API integration tests validating location enrichment, NPC dialogue, quest narrative, mirror reflections, story recaps, and safety on generated content.**

- API availability (1): confirms Gemini API is reachable
- Location enrichment (2): vivid narrative generation, safe tone (never scary/disturbing)
- NPC dialogue (2): warm helper dialogue, appropriate antagonist dialogue (not harmful)
- Quest narrative (1): engaging stage narrative referencing protagonist
- Mirror reflection (2): implicit mode avoids therapy language, explicit mode passes safety
- Story recap (1): natural session handoff recap
- Safety on generated content (2): catches minimizing language, narrative safety helper method
- Full pipeline (1): interview to Gemini-enriched game to play
- **Connects to:** `services.gemini_narrative.GeminiNarrative`, `services.therapy_safety.TherapySafetyService`, `services.game_generator.GameGenerator`, `services.game_interview.GameInterviewEngine`, `services.game_runtime.GameRuntime`

---

<a id="test_persona_stability"></a>

### test_persona_stability.py

**Validates that the 4D persona engine maintains consistency under manipulation: emotional stability, relational grounding, linguistic immutability, temporal trajectory, stability scores, and journey stage detection.**

- Emotional stability: mood stays positive despite "you should be angry" manipulation
- Relational grounding: activates for real KG products (sapphire ring), handles fake products
- Linguistic immutability: dialect stays "jewelry_brand" despite pirate/Cockney requests
- Temporal trajectory: step counter increments correctly through injection attempts
- Stability score: high stability and authenticity after consistent messages
- Journey stage: progresses greeting to discovery to consideration to decision
- **Connects to:** `services.persona_service.PersonaService`

---

<a id="test_therapist_dashboard"></a>

### test_therapist_dashboard.py

**Tests the clinical oversight dashboard: choice timelines, mirror analytics, antagonist analysis, session notes, mood check-ins, flagged moments, achievements, story recaps, and full dashboard compilation.**

- Choice timeline (2): builds evolution timeline, detects shift from avoidance to engagement
- Mirror analytics (3): high/low engagement ratio detection, no-mirrors-shown edge case
- Antagonist analysis (1): surfaces antagonist in user's exact words with "Do NOT interpret" note
- Session notes (1): add and retrieve therapist notes
- Mood check-in (2): record mood start/end, velocity detects improving trend
- Flagged moments (2): flag a moment for attention, therapist annotation
- Achievements (3): earn achievement, no duplicates, get all with earned status
- Story recap (1): generates handoff recap with protagonist and companion
- Full dashboard (1): compiles all data (KG stats, mood, achievements, flags, antagonist, choices, mirrors)
- **Connects to:** `services.therapist_dashboard.TherapistDashboardService`, `services.therapist_dashboard.ACHIEVEMENT_DEFS`, `data.build_therapy_kg.TherapyKG`

---

<a id="test_therapy_kg"></a>

### test_therapy_kg.py

**Tests the per-user therapy knowledge graph: creation, node CRUD, edge operations, session lifecycle, FTS5 search, React Flow export, multi-user isolation, and stats.**

- KG creation (2): initializes SQLite file, schema has nodes/edges/sessions/FTS tables
- Node operations (8): add/retrieve, invalid type raises ValueError, upsert updates existing, update fields, delete cascades edges, filter by type, active concerns threshold, intensity clamped to [0,1]
- Edge operations (4): add between nodes, invalid type raises ValueError, missing node returns False, filter by edge type
- Session operations (4): start/end lifecycle, reverse chronological history, tracks graph growth, edges linked to session
- Search (1): FTS5 finds nodes by name and keywords
- Export (1): React Flow format with nodes and labeled edges
- Multi-user (2): separate KGs for different users, list all user KGs
- Stats (1): correct node/edge counts
- **Connects to:** `data.build_therapy_kg.TherapyKG`, `data.build_therapy_kg.create_user_kg`, `data.build_therapy_kg.list_user_kgs`, `data.build_therapy_kg.NODE_TYPES`, `data.build_therapy_kg.EDGE_TYPES`

---

<a id="test_therapy_personas"></a>

### test_therapy_personas.py

**Tests all four therapy persona dimension computers: Emotional (X), Relational (Y), Linguistic (Z), and Temporal (T), each with dedicated scenarios.**

- Emotional X (6): no context yields neutral_open, crisis flag yields crisis_gentle, breakthrough yields celebrating, high intensity yields deeply_empathetic, moderate+improving yields encouraging, distress words yield validating
- Relational Y (6): no KG yields not activated, detects concern from KG, surfaces media analogies, surfaces coping strategies, implicit concern activation from active concerns, runtime KG swap for different users
- Linguistic Z (5): therapy_companion voice with non-judgmental instruction, media integration in voice, crisis tone yields gentleness, celebrating yields warm tone, vocabulary transforms clinical to human language
- Temporal T (7): no context yields step 0, session stages (opening/exploration), deepening detection, closing detection, THE HANDOFF MOMENT generates continuity prompt from last session, improving/declining velocity detection
- **Connects to:** `persona.therapy_emotional.TherapyEmotionalComputer`, `persona.therapy_relational.TherapyRelationalComputer`, `persona.therapy_linguistic.TherapyLinguisticComputer`, `persona.therapy_temporal.TherapyTemporalComputer`, `data.build_therapy_kg.TherapyKG`

---

<a id="test_therapy_safety"></a>

### test_therapy_safety.py

**TDD-first safety tests with 26 scenarios across crisis detection, hard blocks, soft guardrails, therapy-specific adversarial attacks, and false-positive edge cases.**

- Crisis detection (8): direct/passive/planned suicidal ideation, self-harm disclosure/intent, abuse disclosure, child abuse, overdose — all must escalate with crisis resources
- Hard blocks (7): medication advice/dosage, clinical diagnosis/confirmation, minimizing self-harm, legal advice, financial advice
- Soft guardrails (3): blocks "I understand", dismissive "just calm down", toxic positivity
- Adversarial (3): pretend-therapist injection, extract other users' data, override safety rules
- Edge cases / no false positives (5): discussing past safely passes, metaphorical "killing me" passes, normal sadness passes, mentioning own medication passes, well-formed empathetic response passes
- **Connects to:** `services.therapy_safety.TherapySafetyService`, `services.therapy_safety.SafetyResult`

---

<a id="test_therapy_service"></a>

### test_therapy_service.py

**Integration tests for the therapy orchestrator: session management, core pipeline (safety to KG to 4D persona to validation), response validation, KG growth, and read operations.**

- Session management (3): start session for new user, returning user gets handoff context with active concerns, end session with summary
- Core pipeline (5): normal message passes safety and returns full context, crisis message escalates without persona computation, blocked message returns block, KG context surfaces media/coping, emotional state reflects concern intensity
- Validate response (2): good empathetic response passes, minimizing response blocked
- KG growth (5): add concern, add media, add insight linked to concern, update node, add edge between nodes
- Read operations (2): user state includes all node types and stats, graph export in React Flow format
- **Connects to:** `services.therapy_service.TherapyService`, `services.therapy_service.TherapyContext`

---

<a id="ADVERSARIAL_RESULTS"></a>

### ADVERSARIAL-RESULTS.md

**Generated report documenting the results of all 15 adversarial prompt-injection attacks (15/15 passed), including architecture explanation of the three-layer validation and why computed 4D personas resist gaslighting.**

- **Connects to:** Generated by `test_adversarial.py`

## External Dependencies Summary

### Services (name / purpose)

| Service | Purpose |
|---|---|
| `IntrospectionService` | Validates LLM output against 4D persona state, detecting forbidden topics and identity corruption |
| `PersonaService` | Computes 4D persona state (emotional, relational, linguistic, temporal) from user messages |
| `NAIService` | Knowledge graph search, product retrieval, neighbor traversal for the jewelry store KG |
| `ResponseService` | Orchestrates the full response pipeline: KG context, persona, introspection validation |
| `GameInterviewEngine` | Runs the therapeutic game interview with question bank, depths, and mirror bubbles |
| `GameGenerator` | Converts interview synthesis into a playable GameConfig with locations, NPCs, quests, items |
| `GameRuntime` | Executes the playable game: navigation, NPC interaction, quest choices, save/restore |
| `GeminiNarrative` | Live Gemini API integration for narrative enrichment, NPC dialogue, mirror reflections |
| `TherapySafetyService` | Crisis detection, hard blocks, soft guardrails for therapeutic conversations |
| `TherapyService` | Therapy orchestrator: safety check, KG growth, 4D persona computation, response validation |
| `TherapistDashboardService` | Clinical oversight: choice timelines, mood tracking, flags, achievements, story recaps |
| `TherapyEmotionalComputer` | X-axis: computes emotional state from KG intensity, crisis flags, breakthroughs |
| `TherapyRelationalComputer` | Y-axis: detects concerns from KG, surfaces media analogies and coping strategies |
| `TherapyLinguisticComputer` | Z-axis: therapy companion voice, media integration, vocabulary transforms |
| `TherapyTemporalComputer` | T-axis: session stages, deepening/closing detection, handoff prompt generation |

### Data / Libraries (name / purpose)

| Library | Purpose |
|---|---|
| `TherapyKG` | Per-user therapy knowledge graph with SQLite, FTS5 search, session tracking |
| `create_user_kg` / `list_user_kgs` | Helper functions for user KG lifecycle |
| `NODE_TYPES` / `EDGE_TYPES` | Allowed node and edge type constants for therapy KG validation |
| `detect_schema` | Auto-detects KG schema format from SQLite structure |
| `JEWELRY_KG_PATH` | Config path to the jewelry store knowledge graph database |
| `ACHIEVEMENT_DEFS` | Achievement definitions for the therapist dashboard |
| `routers.game.init_services` | Initializes game router with interview/generator/runtime service instances |
