# Session Context Packet — 2026-03-20 (Session 2)

## LOAD THIS FIRST in next session.

---

## SESSION SUMMARY

Built the complete therapeutic engine foundation (Week 1 Tasks #1-4) AND started Week 2 (Task #8 GameInterviewEngine). Total: 109/109 tests passing across 5 test suites. Conducted psychology research (7 topics, 60+ sources). Designed the Therapeutic Narrative Game Engine through a story-driven architect interview with Eyal. The product: Aria guides users through building a personalized narrative game as therapy.

## WHAT WAS BUILT THIS SESSION

### Week 1 Engine (Tasks #1-4 COMPLETE — 90/90 tests)

| File | Lines | Tests | What it does |
|------|-------|-------|-------------|
| `backend/services/therapy_safety.py` | ~230 | 26/26 | Crisis detection, hard blocks, response guardrails. Two methods: check_user_input() + check_response() |
| `backend/tests/test_therapy_safety.py` | ~200 | — | 8 crisis, 7 blocks, 3 guardrails, 3 adversarial, 5 edge cases |
| `backend/data/build_therapy_kg.py` | ~310 | 23/23 | Per-user SQLite KG. 8 node types, 9 edge types, FTS5, React Flow export, session lifecycle |
| `backend/tests/test_therapy_kg.py` | ~200 | — | CRUD, upsert, edges, sessions, search, export, multi-user isolation |
| `backend/persona/therapy_emotional.py` | ~130 | 24/24 (shared) | X-axis: empathy from KG intensity. Crisis→gentle, breakthrough→celebrating |
| `backend/persona/therapy_relational.py` | ~160 | — | Y-axis: traverses user's concern graph, surfaces media analogies + coping |
| `backend/persona/therapy_linguistic.py` | ~100 | — | Z-axis: adaptive voice, media integration, mood-based tone shifts |
| `backend/persona/therapy_temporal.py` | ~180 | — | T-axis: session stages, mood velocity, THE HANDOFF MOMENT |
| `backend/tests/test_therapy_personas.py` | ~230 | — | 6 emotional + 6 relational + 5 linguistic + 7 temporal tests |
| `backend/services/therapy_service.py` | ~280 | 17/17 | Orchestrator: safety→KG→4D persona→context→validate→grow |
| `backend/routers/therapy.py` | ~175 | — | 12 API endpoints for therapy pipeline |
| `backend/tests/test_therapy_service.py` | ~200 | — | Session mgmt, pipeline, validation, KG growth, reads |

### Week 2 Game Engine (Task #8 COMPLETE — 19/19 tests)

| File | Lines | Tests | What it does |
|------|-------|-------|-------------|
| `backend/services/game_interview.py` | ~480 | 19/19 | Interview engine: 33 questions, 5 phases, 3 depths, 3 vibes, mirror bubbles, KG personalization, SFBT+OARS patterns |
| `backend/tests/test_game_interview.py` | ~200 | — | Question bank validation, flow, mirror bubbles, synthesis, exit ramps |

### Documentation

| File | What it is |
|------|-----------|
| `docs/THERAPEUTIC-GAME-RESEARCH.md` | Psychology research backup — 7 topics, 60+ sources, narrative therapy, SFBT, projective techniques, AI ethics, minor safety |
| `docs/WEEK2-NARRATIVE-GAME-PLAN.md` | Full Week 2 plan — approved spec from architect interview |

### Test Totals

```
therapy_safety:    26/26
therapy_kg:        23/23
therapy_personas:  24/24
therapy_service:   17/17
game_interview:    19/19
─────────────────────────
TOTAL:            109/109
```

---

## TASK STATUS

```
#1  [COMPLETE] therapy_safety.py + tests (Day 1)
#2  [COMPLETE] build_therapy_kg.py + tests (Days 1-2)
#3  [COMPLETE] 4 therapy persona computers + tests (Days 2-3)
#4  [COMPLETE] therapy router + service + tests (Day 3)
#8  [COMPLETE] GameInterviewEngine + tests (Day 8)
#9  [PENDING]  GameGenerator — interview → game_config.json via Gemini (Day 9) ← NEXT
#10 [PENDING]  GameRuntime — execute config, state, choice → KG (Day 10)
#11 [PENDING]  Frontend — onboarding, interview, game player, mirror bubbles (Days 11-12)
#12 [PENDING]  Therapist dashboard + GameExporter (Days 12-13)
#13 [PENDING]  Integration tests + demo flow (Day 14)
```

---

## THE PRODUCT (Therapeutic Narrative Game Engine)

### What it is
Aria guides users through building a personalized narrative game, then the user plays it. Three interlocking therapeutic layers:
1. **Interview** (building the game IS therapy — projective storytelling)
2. **Game creation** (interview → full game config via Gemini)
3. **Gameplay** (playing continues therapy, choices feed KG)

### Three Transparency Modes (user picks "vibe")
- A: "Let's build something cool" → Implicit (pure game)
- B: "Your story, your way" → Subtle (light mirrors)
- C: "Let's explore together" → Explicit (connects to feelings)

### Three Interview Depths (user picks)
- Quick: ~13 questions
- Standard: ~25 questions
- Deep: 33+ questions

### Mirror Bubble (Core UI Innovation)
When answer carries emotional weight → small opt-in bubble: Close (proceed) or Tell Me More (Aria explores gently). User controls depth. System stays in-game.

### Key Design Decisions (from architect interview)
1. Warm-up questions personalize before anything else
2. User picks vibe (not labeled as "transparency mode")
3. Aria stays in-game, mirror bubble is opt-in depth
4. Avoidance respected + open door later (no judgment)
5. Aria's tone subtly warms on soft signals (never explicit)
6. Always therapist-guided (tool FOR therapy, not replacement)
7. Therapist dashboard: KG graph + themes + flags (mobile-first)
8. Game completion → export standalone playable Python game (no therapy connection)
9. Mobile-first design throughout
10. Voice throughout (not a blocker but high priority — the magic)
11. Never scary — fun, exciting, inviting
12. Session timing + perfect continuity (come back days later)

### Core Insight
"Everybody wants to be the hero of their story."
The user naturally builds the antagonist from real struggles.
The user naturally builds the hero as who they want to become.
The game gives them a safe place to win that fight — in fiction first.

---

## RESEARCH GROUNDING

Psychology research completed (docs/THERAPEUTIC-GAME-RESEARCH.md):
- **Narrative Therapy** (White & Epston): externalizing, unique outcomes, re-authoring
- **SFBT** (de Shazer & Berg): miracle, exception, scaling, coping questions → all in interview
- **OARS** (Miller & Rollnick): Aria's conversational style
- **Aesthetic Distance** (Landy): three transparency modes = distance spectrum
- **Sand Tray Therapy**: game world-building IS digital sand tray
- **Projective Techniques**: never interpret, genuinely ambiguous, distance by age
- **AI Ethics** (APA June 2025, Brown University Oct 2025): Aria is companion, never therapist
- **Minors Safety**: COPPA, SB 243, disclosure protocol, no manipulation

Key rule: System NEVER interprets what choices "mean." NEVER claims to be therapist. NEVER excavates trauma. Always has exit ramps. Always therapist-guided.

---

## WHAT TO BUILD NEXT (Task #9)

**GameGenerator** — takes interview synthesis output → generates full game_config.json via Gemini:
- 5-8 locations (from world answers, with visual map data)
- Protagonist + companion (from character answers)
- 3-5 NPCs: helper, mentor, wildcard, antagonist (from story answers)
- 5-10 items (symbolic, from preferences)
- 2-4 quest arcs with branching (from story + challenge answers)
- State variables (courage, trust, items)
- 2-4 endings (from choices answers)
- Hidden therapeutic mappings (which quest → which concern)
- Mood atmosphere data per location (colors, tone — never scary)
- Grey Peace complexity level

Uses Gemini API for narrative content generation. Output must be valid JSON that GameRuntime can execute.

---

## KEY FILES AND LOCATIONS

```
Backend services:    ~/aria-personal/backend/services/
  therapy_safety.py, therapy_service.py, game_interview.py
Backend data:        ~/aria-personal/backend/data/
  build_therapy_kg.py (per-user KG factory)
Backend persona:     ~/aria-personal/backend/persona/
  therapy_emotional.py, therapy_relational.py, therapy_linguistic.py, therapy_temporal.py
Backend router:      ~/aria-personal/backend/routers/
  therapy.py (12 endpoints)
Backend tests:       ~/aria-personal/backend/tests/
  test_therapy_safety.py, test_therapy_kg.py, test_therapy_personas.py,
  test_therapy_service.py, test_game_interview.py
Documentation:       ~/aria-personal/docs/
  THERAPEUTIC-GAME-RESEARCH.md, WEEK2-NARRATIVE-GAME-PLAN.md
Plans:               /root/.claude/plans/crispy-humming-blanket.md (MVP plan)
Memory:              /root/.claude/projects/.../memory/ (MEMORY.md + 5 memory files)
Research (reference): Grey Peace engine at /storage/emulated/0/Download/synthesis-rules/gpt/deepseekv2.0/
```

---

## EYAL CONTEXT

- Vision: "The most responsible approach IS the most effective IS the most efficient"
- This is personal — been through therapy, knows the potential for healing AND harm
- Ariel Leventhal: brought the mental health platform opportunity. Direction document sent.
- Demographics unknown (pending Ariel) — system built for teens, children, adults
- Voice is high priority (not a blocker but it's "the magic")
- Mobile-first always
- `python3` not `python`, 4GB RAM, PRoot/Termux, Samsung Galaxy S21 FE

---

*Session 2, March 20, 2026*
*109/109 tests, 5 test suites, ~2,500 lines of production code*
*Next: Task #9 GameGenerator*
