<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# data/ — Start Here

> Read this first. Jump to data.md or data.ctx only for the component you need.

| Component | What it is | data.md | data.ctx |
|---|---|---|---|
| **build_jewelry_kg** | Builds a jewelry-store knowledge graph into SQLite with products, categories, materials, and relationship edges | [build_jewelry_kg](data.md#build_jewelry_kg) | build_jewelry_kg node |
| **build_therapy_kg** | Per-user therapy KG factory — each user gets a SQLite graph that grows as Aria extracts concerns, emotions, and breakthroughs | [build_therapy_kg](data.md#build_therapy_kg) | build_therapy_kg node |
| **clinical_cartridges** | 5 therapy-approach-specific game scenarios (CBT, DBT, ACT, IFS, MI/OARS) with full world/character synthesis | [clinical_cartridges](data.md#clinical_cartridges) | clinical_cartridges node |
| **prebuilt_games** | 3 pre-built game cartridges (Maya, Ren, Ash) that bypass the interview with complete synthesis dicts | [prebuilt_games](data.md#prebuilt_games) | prebuilt_games node |
| **act_processes** | ACT hexaflex framework — 6 core processes with exercises, metaphors, and game mappings | [act_processes](data.md#act_processes) | act_processes node |
| **assessment_scales** | 7 clinical assessment instruments (PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS, simple mood) | [assessment_scales](data.md#assessment_scales) | assessment_scales node |
| **cognitive_distortions** | 15 Burns/Beck cognitive distortions with game signals and reframe suggestions | [cognitive_distortions](data.md#cognitive_distortions) | cognitive_distortions node |
| **dbt_skills** | DBT skills across 4 modules — mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness | [dbt_skills](data.md#dbt_skills) | dbt_skills node |
| **disorder_communication** | Per-disorder communication rules for 10 conditions with NPC design guidelines and gamification mechanics | [disorder_communication](data.md#disorder_communication) | disorder_communication node |
| **graduated_disclosure** | 4-layer disclosure depth control with safety triggers and interview pacing rules | [graduated_disclosure](data.md#graduated_disclosure) | graduated_disclosure node |
| **icd11_mental_disorders** | ICD-11 Chapter 06 hierarchical taxonomy of mental, behavioural, and neurodevelopmental disorders | [icd11_mental_disorders](data.md#icd11_mental_disorders) | icd11_mental_disorders node |
| **ifs_model** | Internal Family Systems model — Self qualities, Exiles, Managers, Firefighters, and game integration | [ifs_model](data.md#ifs_model) | ifs_model node |
| **npc_archetypes** | 7 therapeutic NPC archetypes (Companion, Mentor, Mirror, Challenger, Peer, Gatekeeper, Scribe) | [npc_archetypes](data.md#npc_archetypes) | npc_archetypes node |
| **oars_framework** | Motivational Interviewing OARS framework — open questions, affirmations, reflections, summaries | [oars_framework](data.md#oars_framework) | oars_framework node |
| **safe_phrases** | Validated safe and harmful phrase lists for voice interview and NPC dialogue filtering | [safe_phrases](data.md#safe_phrases) | safe_phrases node |
| **therapist DBs** | Runtime SQLite databases for therapist controls and dashboard | [therapist_dbs](data.md#therapist_dbs) | therapist_controls_db / therapist_dashboard_db nodes |
| **therapy DBs** | Per-user therapy KG databases created by build_therapy_kg (WAL mode) | [therapy_dbs](data.md#therapy_dbs) | therapy_user_dbs node |
| **game DBs** | Per-user game state databases | [game_dbs](data.md#game_dbs) | game_dbs node |
