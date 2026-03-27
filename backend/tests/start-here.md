<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# tests/ — Start Here

> Read this first. Jump to [tests.md](tests.md) or [tests.ctx](tests.ctx) only for the component you need.

| Component | What it is | tests.md | tests.ctx |
|---|---|---|---|
| **test_suite** | Master test suite covering KG, NAI, persona, introspection, response pipeline, and edge cases (50 tests across 6 groups) | [test_suite](tests.md#test_suite) | test_suite node |
| **test_adversarial** | 15 prompt-injection attacks against the introspection engine, validating that computed 4D personas resist gaslighting | [test_adversarial](tests.md#test_adversarial) | test_adversarial node |
| **test_game_api** | End-to-end game integration: interview to gameplay, config serialization, multi-user isolation, template validation | [test_game_api](tests.md#test_game_api) | test_game_api node |
| **test_game_generator** | Validates GameGenerator output from interview synthesis: locations, NPCs, items, quests, endings, state variables, visual map | [test_game_generator](tests.md#test_game_generator) | test_game_generator node |
| **test_game_interview** | Tests the interview engine: question bank depths, phase ordering, mirror bubble logic, KG personalization, exit ramps | [test_game_interview](tests.md#test_game_interview) | test_game_interview node |
| **test_game_runtime** | Tests the playable game engine: navigation, NPC interaction, items, quest choices, save/restore, session timers, mirror moments | [test_game_runtime](tests.md#test_game_runtime) | test_game_runtime node |
| **test_gemini_integration** | Live Gemini API tests: location enrichment, NPC dialogue, quest narrative, mirror reflections, story recaps, safety validation | [test_gemini_integration](tests.md#test_gemini_integration) | test_gemini_integration node |
| **test_persona_stability** | Validates 4D persona consistency under manipulation: emotional stability, relational grounding, linguistic immutability, temporal trajectory | [test_persona_stability](tests.md#test_persona_stability) | test_persona_stability node |
| **test_therapist_dashboard** | Clinical oversight features: choice timelines, mirror analytics, antagonist analysis, mood tracking, flags, achievements, story recaps | [test_therapist_dashboard](tests.md#test_therapist_dashboard) | test_therapist_dashboard node |
| **test_therapy_kg** | Per-user therapy KG operations: node CRUD, edge operations, session lifecycle, FTS5 search, React Flow export, multi-user isolation | [test_therapy_kg](tests.md#test_therapy_kg) | test_therapy_kg node |
| **test_therapy_personas** | All four therapy persona dimension computers: Emotional (X), Relational (Y), Linguistic (Z), Temporal (T) with 24 scenarios | [test_therapy_personas](tests.md#test_therapy_personas) | test_therapy_personas node |
| **test_therapy_safety** | TDD-first safety tests: 8 crisis escalations, 7 hard blocks, 3 soft guardrails, 3 adversarial attacks, 5 false-positive edge cases | [test_therapy_safety](tests.md#test_therapy_safety) | test_therapy_safety node |
| **test_therapy_service** | Therapy orchestrator integration: session management, core pipeline (safety to persona), KG growth, response validation | [test_therapy_service](tests.md#test_therapy_service) | test_therapy_service node |
| **ADVERSARIAL-RESULTS** | Generated report from test_adversarial.py documenting 15/15 attacks blocked with scores and architecture explanation | [ADVERSARIAL-RESULTS](tests.md#ADVERSARIAL_RESULTS) | ADVERSARIAL_RESULTS node |
