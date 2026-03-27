# Session Plan — 2026-03-21

## Status: Aria voice CONNECTED and responding

---

## Block 1: Aria Deep Dive (CURRENT)

### 1A. Voice Connection — DONE
- [x] Fix WebSocket format (`setup` key, snake_case, Blob→text)
- [x] Aria responds with audio

### 1B. Optimize Voice Responses (NOW)
- [ ] Improve system prompt for immersion (tone, brevity, atmospheric narration)
- [ ] Hands-free optimization (auto-listen after response, no tap required)
- [ ] Response accuracy — Aria should know exact game state, not hallucinate
- [ ] Test all 7 function calls work via voice (move, look, talk, take, use, choose, quest)

### 1C. Deep Aria Integration
- [ ] Jarvis features: save game by voice, describe stats, list inventory, help/hint
- [ ] Aria remembers conversation context within session (not just current state)
- [ ] NPC voice acting — Aria changes tone/personality when voicing NPCs
- [ ] Ambient narration — Aria comments on discoveries, atmosphere changes
- [ ] Mirror moments via voice — therapeutic reflections spoken naturally
- [ ] Voice-triggered rest points

---

## Block 2: Persistence
- [ ] Game state save/load (SQLite: location, inventory, quests, turn count)
- [ ] Per-user/per-game Aria conversation context
- [ ] Resume game from save (cartridge picker shows saved games)
- [ ] Architecture: SQLite game_saves table with JSON state + conversation_log table

---

## Block 3: Visuals & UI
- [ ] Replace green with per-game color palettes (Maya=ocean blue, Ren=purple, Ash=noir gray)
- [ ] Per-game light animations (particles, glow, atmosphere effects)
- [ ] Left-side drawer with HoMM-style 2D node map
- [ ] Visual inventory with emoji items
- [ ] User-customizable colors
- [ ] Dynamic theme switching

---

## Block 4: Burger Menu & Settings
- [ ] Hamburger icon → slide-out menu
- [ ] Aria persona presets (voice name, tone, speaking style per NPC)
- [ ] Therapist dashboard stub
- [ ] KG studio stub (visual editor placeholder)
- [ ] Game settings (difficulty, text speed, voice on/off)

---

## Block 5: KG Mental Model Visualization (INVESTIGATE only)
- [ ] Research: React Flow vs vis.js vs D3 for therapy KG display
- [ ] Concept: nodes = concerns/coping/relationships, edges = connections
- [ ] Design: therapist sees graph grow as user plays
- [ ] Output format: structured report + visual flowchart KG
- [ ] NOT building today — design phase only

---

## Backlog (don't forget)
- IntentGraph Phase 1A: 100-query benchmark for Ariel
- IntentGraph Phase 2: 2-page technical summary for Ariel
- APK build: needs termux-remote to real Linux laptop
- AI-LAB multi pages: phone testing (Personas/ImageEdit/VideoGen/Coding/Builder)
- Health? 500 error in CORE
- Pipeline guided tours: phone testing
- Medical KG: no edges yet
