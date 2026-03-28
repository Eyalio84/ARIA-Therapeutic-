<!-- last-verified: 2026-03-28 -->
> Parent: [../start-here.md](../start-here.md)

# services/ — Start Here

> Read this first. Jump to [services.md](services.md) or [services.ctx](services.ctx) only for the component you need.

| Component | What it is | services.md | services.ctx |
|---|---|---|---|
| **computer_use_service** | Web fetch, Gemini-powered search/vision, and game self-test suite | [computer_use_service](services.md#computer_use_service) | computer_use_service node |
| **ctx_kg_service** | Architectural KG query service — loads ctx-kg.db + embeddings, provides search and stats for Aria context injection (163 lines) | [ctx_kg_service](services.md#ctx_kg_service) | ctx_kg_service node |
| **device_state** | Cached device sensor polling (battery, thermal, RAM, WiFi) with adaptive behavior properties | [device_state](services.md#device_state) | device_state node |
| **game_generator** | Transforms interview synthesis into a playable game config with locations, NPCs, quests, and endings | [game_generator](services.md#game_generator) | game_generator node |
| **game_interview** | SFBT/OARS therapeutic interview engine with five phases, three depths, mirror bubbles | [game_interview](services.md#game_interview) | game_interview node |
| **game_kg_bridge** | Maps game events (choices, NPC talks, quests) to therapy knowledge graph nodes and flags | [game_kg_bridge](services.md#game_kg_bridge) | game_kg_bridge node |
| **game_runtime** | Executes a GameConfig as a playable narrative with navigation, dialogue, items, and branching quests | [game_runtime](services.md#game_runtime) | game_runtime node |
| **gemini_narrative** | LLM-powered narrative generation — location enrichment, NPC dialogue, quest narration, mirror reflections | [gemini_narrative](services.md#gemini_narrative) | gemini_narrative node |
| **http_client** | Shared aiohttp ClientSession with persistent connection pooling for all API calls | [http_client](services.md#http_client) | http_client node |
| **icd11_service** | WHO ICD-11 API client — OAuth2 auth, disorder lookup, Chapter 06 bulk import | [icd11_service](services.md#icd11_service) | icd11_service node |
| **introspection** | Output validation against 4D persona state — forbidden topics, identity, brand alignment | [introspection](services.md#introspection) | introspection node |
| **nai_service** | IntentGraph search over the jewelry knowledge graph with 4-weight scoring | [nai_service](services.md#nai_service) | nai_service node |
| **persistence** | Per-user SQLite game persistence — saves, transcripts, and Aria context | [persistence](services.md#persistence) | persistence node |
| **persona_service** | 4D PersonaEngine wrapper with brand-specific dimension computers | [persona_service](services.md#persona_service) | persona_service node |
| **response_service** | Full Aria jewelry pipeline — NAI retrieve, 4D compute, prompt build, introspection validate | [response_service](services.md#response_service) | response_service node |
| **scene_image** | Per-location atmospheric image generation via Gemini Imagen with caching | [scene_image](services.md#scene_image) | scene_image node |
| **termux_service** | Async wrapper for termux-api Android commands (battery, camera, SMS, GPS, notifications) | [termux_service](services.md#termux_service) | termux_service node |
| **therapist_controls** | Remote game management — pause/resume, disclosure limits, context injection, messaging | [therapist_controls](services.md#therapist_controls) | therapist_controls node |
| **therapist_dashboard** | Clinical oversight — choice timelines, mirror analytics, flags, mood velocity, achievements | [therapist_dashboard](services.md#therapist_dashboard) | therapist_dashboard node |
| **therapy_safety** | Crisis detection, hard blocks, and response guardrails — the non-negotiable safety layer | [therapy_safety](services.md#therapy_safety) | therapy_safety node |
| **therapy_service** | Therapy pipeline orchestrator — safety, KG, 4D persona, context building, KG growth | [therapy_service](services.md#therapy_service) | therapy_service node |
