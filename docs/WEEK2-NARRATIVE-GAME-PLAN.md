# Week 2 Plan: Therapeutic Narrative Game Engine

## Date: 2026-03-20
## Status: APPROVED (from architect interview)
## Research: Grounded in psychology research (see THERAPEUTIC-GAME-RESEARCH.md)

---

## Core Insight

"Everybody wants to be the hero of their story."

The user naturally builds the antagonist as an externalization of their own struggles.
The user naturally builds the hero as the version of themselves they want to become.
The game gives them a space to win that fight — in fiction first, then maybe for real.

The guidance must be good enough that the user WANTS to go deeper — not because
they're told to, but because the story demands it. A good story needs a real villain.
A real villain comes from real pain. The game mechanics create the conditions for
this to happen naturally.

---

## The Flow

### Phase 0: Warm-Up (Personalization)
- 3-5 friendly questions BEFORE anything else
- Purpose: make the app feel like it was made for them
- "What kind of stories do you like?" / "Pick 3 things that are cool to you"
- Output: initial KG seeds (media preferences, aesthetic preferences)
- The experience should feel UNDERSTOOD from the first moment

### Phase 1: Pick Your Vibe
User chooses creative tone (maps to transparency modes internally):
- **"Let's build something cool"** → Implicit mode (pure game, no therapy mention)
- **"Your story, your way"** → Subtle mode (light mirrors, gentle reflections)
- **"Let's explore together"** → Explicit mode (connects game to real feelings)

Then user picks depth:
- **Quick adventure** (10 questions) — "I want to jump in"
- **Custom world** (20 questions) — "I want detail"
- **Epic saga** (30+ questions) — "I want everything"

### Phase 2: The Interview (Building IS Therapy)
Story-driven interview using SFBT + OARS patterns:

#### Your Character (scaled by depth)
- "If your character had a pet or companion, what would it be?"
- "What's the one thing your character would protect no matter what?"
- "What makes your character smile?"
- "What's your character's secret strength that most people don't see?"

#### Your World
- "Describe the place where your character feels safest"
- "What's the most exciting place in this world?"
- "Is there somewhere your character avoids? What's there?"

#### Your Story
- "Something happens that changes everything for your character. What is it?"
- "Who helps your character when things get tough?"
- "There's someone or something making life harder. What is it?"
  (This is where the antagonist naturally emerges from real struggles)

#### Your Challenges
- Scaling questions gamified: "Your character's courage is at 4. What moves it to 5?"
- Exception questions: "Has your character ever surprised themselves by being brave?"
- Coping questions: "What's been keeping your character going?"

#### Your Choices
- "Your character reaches a fork. One path is safe, one is unknown. Which way?"
- "Someone asks your character for help but it means risk. What do they do?"

### Phase 3: The Mirror Bubble (Core UI Innovation)
- When user's answer carries emotional weight → small opt-in bubble appears
- **Close** button → proceed, no pressure, game continues
- **Tell me more** button → Aria explores gently within the fiction
- User controls depth. System stays in-game. Aesthetic distance preserved.
- Research basis: aesthetic distance (Landy), projective techniques, user agency

### Phase 4: Game Generation
Interview answers → Gemini generates full game config:
- **Title and theme** (from interview)
- **5-8 locations** (from world questions, visual map + mood atmosphere)
- **Protagonist** (from character questions, with companion)
- **3-5 NPCs** (from story questions — helper, mentor, wildcard, antagonist)
- **5-10 items** (symbolic, from character preferences)
- **2-4 quest arcs** (from story/challenge questions, branching)
- **State variables** (courage, trust, items — from challenges)
- **2-4 endings** (from choices questions)
- **Hidden therapeutic mappings** (which quest explores which concern — therapist sees this)

### Phase 5: Gameplay
- Text adventure + visual map + mood atmosphere
- Colors, typography, ambient imagery shift with scene emotion
- NEVER scary — fun, exciting, inviting
- Full complexity: locations, NPCs, items, quests, state variables
- Every choice feeds back to user's therapy KG

#### Avoidance Handling
- Choices respected with zero judgment
- KG quietly notes patterns
- Later in story: natural opportunity to revisit (open door, not push)

#### Session Management
- Timed sessions (therapist configurable, e.g., 20 min)
- Game paces toward natural rest points (campfire, safe room, calm moment)
- "Your character rests here. You can return anytime."
- Optional reflection question: "What was the best part of today's adventure?"
- Perfect continuity — come back days later, everything exactly where they left it

### Phase 6: Game Completion
Sequential, by user choice:
1. **Export as standalone playable game** (Python + frontend) — no therapy connection
   "I built this." Show friends, keep forever. Agency and pride.
2. **Export story as keepsake** (PDF/shareable page)
3. **KG growth visualization** — "Look how far your character came"
4. **Offer new adventure** — deeper because KG is richer

---

## Safety Architecture

### Always Therapist-Guided
- This is a TOOL for therapy, not a replacement
- Professional monitors via their own interface
- App does not operate standalone for therapeutic purposes

### Soft Signal Detection
- When content suggests concern: Aria's tone subtly warms (never explicit, never alarming)
- System flags for therapist dashboard
- Crisis-level: immediate escalation with resources (already built in therapy_safety.py)

### Aria's Rules
- NEVER claims to be a therapist — "creative companion" / "story guide"
- NEVER interprets what choices "mean" psychologically
- NEVER excavates trauma directly
- NEVER asks the same deep question twice if user deflected
- Uses OARS: Open questions, Affirmations, Reflections, Summaries
- Stays in-game by default. Mirror bubble is opt-in depth.

### For Minors
- Therapist always in the loop
- Age-appropriate content boundaries
- COPPA compliance path (parental consent for under-13)
- Data minimization and encryption
- No manipulative mechanics (no streaks, FOMO, loss aversion)

---

## Therapist Dashboard (Mobile-First)

### What they see:
- **KG graph** — user's concern nodes, edges, intensity changes over sessions
- **Extracted themes** — "recurring: protection of sibling, avoidance of confrontation"
- **Flagged moments** — "Session 2: described unsafe home through game character"
- **Session history** — mood trajectory, KG growth rate, game progress
- **Game content summary** — character traits, world choices, quest paths (not raw transcript)

### What they can do:
- Configure session time limits
- Select transparency mode for their patient
- Add concerns/media to patient's KG before session (pre-seed)
- Review and annotate flagged moments
- Track progress across sessions

---

## Demo for Ariel (Sequential, Mobile-First)

Three moments, one device:
1. **The Mirror Bubble** — user builds character, says something real, bubble appears, they tap "tell me more", Aria responds with warmth
2. **The Session Handoff** — user returns days later, Aria: "Your character was at the Crystal Cave with their dolphin. Want to continue?"
3. **The Therapist View** — swipe to dashboard showing growing KG, themes, flags

---

## Technical Stack

### Backend (extends what we built today)
- `TherapySafetyService` — already handles crisis/blocks/guardrails
- `TherapyKG` — per-user SQLite, grows through interview AND gameplay
- `TherapyService` — orchestrates pipeline (extend for game context)
- 4D Persona Computers — adapt Aria through all phases
- NEW: `GameInterviewEngine` — question bank, KG-seeded, 3 depths
- NEW: `GameGenerator` — interview answers → game config via Gemini
- NEW: `GameRuntime` — execute game config, manage state, track choices
- NEW: `GameExporter` — export standalone playable game

### Frontend (mobile-first web)
- Obsidian design language (warm, not clinical)
- Interview flow with mirror bubbles
- Game player (text + visual map + mood atmosphere)
- Therapist dashboard (separate view/auth)

### Gemini Integration
- Interview question generation (personalized from KG)
- Game narrative generation (from interview synthesis)
- In-game narrative (dynamic responses to player choices)
- Mirror bubble content (gentle reflections)

---

## Reuse from Existing

| Existing | Reuse For |
|----------|-----------|
| `therapy_safety.py` (26 tests) | Safety checks on interview + game content |
| `build_therapy_kg.py` (23 tests) | User KG grows through interview AND gameplay |
| 4D Persona Computers (24 tests) | Aria's tone adapts throughout all phases |
| `therapy_service.py` (17 tests) | Orchestrator — extend for game pipeline |
| Grey Peace engine pattern | Game runtime architecture |
| Story-driven interview playbook | Interview question design |
| SFBT + OARS patterns | Question framework |
| Ariel intake app design | Obsidian frontend aesthetic |

---

## Week 2 Day Plan

| Day | Deliverable |
|-----|-------------|
| 8 | `GameInterviewEngine` — question bank (3 depths), KG-seeded, mirror bubble logic |
| 9 | `GameGenerator` — interview → game_config.json via Gemini, full Grey Peace complexity |
| 10 | `GameRuntime` — execute config, state management, choice → KG feedback loop |
| 11 | Frontend — interview flow + game player (mobile-first, visual map, mood atmosphere) |
| 12 | Therapist dashboard + session management + mirror bubble UI |
| 13 | `GameExporter` — standalone playable game export + story PDF |
| 14 | Integration tests + demo flow (3 moments, sequential, mobile) |

---

*"Everyone wants to be the hero of their story."*
*The game gives them a safe place to become one.*

*Research basis: Narrative Therapy, Sand Tray Therapy, Aesthetic Distance,*
*SFBT, OARS, APA AI Ethics Guidelines (June 2025)*
*90 engine tests passing. Psychology research grounded.*
*Therapist-guided. Never standalone. Never a replacement.*
