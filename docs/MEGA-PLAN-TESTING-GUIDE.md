# MEGA PLAN Testing Guide

**Covers**: All Week 1-3 features — backend APIs, dashboard UI, clinical cartridges, scene images, sensor mechanics, therapist controls.

**Servers needed**:
```bash
# Terminal 1 — Backend
cd /root/aria-personal/backend && python3 serve_game.py 8095

# Terminal 2 — Frontend
cd /root/aria-personal && npx next dev -p 3001 -H 0.0.0.0
```

**Test order**: Backend first (curl), then frontend (browser). Backend issues will cascade to frontend.

---

## Phase 1: Backend Health Check

Run these immediately after starting the backend server.

### 1.1 Server Startup
```bash
curl -s http://localhost:8095/health | python3 -m json.tool
```
**Expected**:
```json
{
  "status": "running",
  "services": {
    "interview": true,
    "generator": true,
    "runtime": true,
    "therapy": true,
    "dashboard": true
  }
}
```
**If it fails**: Check the terminal for import errors. Most likely a missing module or path issue.

### 1.2 Dashboard Health
```bash
curl -s http://localhost:8095/api/dashboard/health | python3 -m json.tool
```
**Expected**:
```json
{
  "status": "healthy",
  "dashboard": true,
  "therapy_service": true,
  "controls": true
}
```

### 1.3 Cartridge Listing (Story + Clinical)
```bash
curl -s http://localhost:8095/api/game/cartridges | python3 -m json.tool
```
**Expected**: `cartridges` array (3 story: maya, ren, ash) + `clinical` array (5: cbt_thought_detective, dbt_fire_keeper, act_compass_quest, ifs_council_of_parts, mi_listeners_garden).

**Check**: All 8 cartridges listed? Each has `id`, `name`, `tagline`? Clinical ones have `clinical_approach` and `target_concerns`?

---

## Phase 2: Dashboard API (25 endpoints)

Use a test user ID throughout. Pick any string.

```bash
TEST_USER="test_user_001"
```

### 2.1 Full Dashboard
```bash
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER" | python3 -m json.tool
```
**Expected**: JSON with `user_id`, `generated_at`, `mood_history` (empty array), `mood_velocity`, `flagged_moments` (empty), `therapist_notes` (empty), `achievements` (10 items, all `earned: false`).

### 2.2 Mood Check-In
```bash
# Record session start mood
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/mood" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test_session_1", "mood_start": 3}'

# Record session end mood
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/mood" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test_session_1", "mood_end": 4}'

# Check history + velocity
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/mood" | python3 -m json.tool
```
**Expected**: `history` has 1 entry with `mood_start: 3`, `mood_end: 4`. `velocity` says `insufficient_data` (need 2+ sessions).

**Record a second session to see velocity**:
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/mood" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test_session_2", "mood_start": 3, "mood_end": 5}'

curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/mood" | python3 -m json.tool
```
**Expected**: `velocity.trend` = `"improving"`, `velocity.delta` = `1`.

### 2.3 Flagging
```bash
# Add a flag
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/flags" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test_session_1", "severity": "attention", "category": "avoidance_pattern", "description": "Repeatedly chose to avoid confrontation", "user_content": "I dont want to go there"}'

# List flags
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/flags" | python3 -m json.tool
```
**Expected**: One flag with `severity: "attention"`, the description, and a generated `id` like `flag_xxxxx`.

### 2.4 Flag Annotation
```bash
# Get the flag ID from the previous response, then annotate
FLAG_ID="flag_XXXXXXXX"  # Replace with actual ID from above
curl -s -X PUT "http://localhost:8095/api/dashboard/flag/$FLAG_ID/annotate" \
  -H "Content-Type: application/json" \
  -d '{"note": "Consistent avoidance of social situations - monitor in next session"}'
```
**Expected**: `{"annotated": true, "flag_id": "flag_XXXXXXXX"}`

### 2.5 Session Notes
```bash
# Add a note
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/notes" \
  -H "Content-Type: application/json" \
  -d '{"target_type": "session", "target_id": "test_session_1", "note": "Good engagement. Mirror bubbles were explored. Consider moving to Layer 2 next session."}'

# List notes
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/notes" | python3 -m json.tool
```
**Expected**: One note with the text, `target_type: "session"`, and a generated `id`.

### 2.6 Achievements
```bash
# Award an achievement
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/achievements" \
  -H "Content-Type: application/json" \
  -d '{"achievement_id": "first_step", "session_id": "test_session_1"}'

# Try awarding same one again
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/achievements" \
  -H "Content-Type: application/json" \
  -d '{"achievement_id": "first_step", "session_id": "test_session_1"}'

# List all
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/achievements" | python3 -m json.tool
```
**Expected**: First call returns `earned: true` with title "First Step". Second call returns `already_earned: true`. List shows 10 achievements, 1 earned.

### 2.7 Story Recap
```bash
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/recap" | python3 -m json.tool
```
**Expected**: `{"recap": "Welcome back. Your character's adventure continues."}` (generic — no game state yet).

---

## Phase 3: Therapist Controls (7 endpoints)

### 3.1 Get Controls (initial state)
```bash
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/controls" | python3 -m json.tool
```
**Expected**: `paused: 0`, `max_disclosure_layer: 2`, `review_required: 0`, empty strings for context/message.

### 3.2 Pause Game
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/pause" \
  -H "Content-Type: application/json" \
  -d '{"message": "Taking a moment to review your progress. Be right back."}'

# Verify
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/controls" | python3 -m json.tool
```
**Expected**: `paused: 1`, `pause_message` contains the message.

### 3.3 Resume Game
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/resume"

curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/controls" | python3 -m json.tool
```
**Expected**: `paused: 0`, `pause_message: ""`.

### 3.4 Set Disclosure Layer
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/disclosure" \
  -H "Content-Type: application/json" \
  -d '{"max_layer": 3}'
```
**Expected**: `{"max_layer": 3}`

### 3.5 Inject Context
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/inject-context" \
  -H "Content-Type: application/json" \
  -d '{"context": "Focus on trust-building this session. The user responded well to the companion NPC last time. Avoid the antagonist quest for now."}'
```
**Expected**: `{"injected": true}`

### 3.6 Send Therapist Message
```bash
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/therapist-message" \
  -H "Content-Type: application/json" \
  -d '{"message": "Great session today. I noticed real growth in how your character handled that challenge."}'
```
**Expected**: `{"sent": true}`

### 3.7 Audit Log
```bash
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER/control-log" | python3 -m json.tool
```
**Expected**: Array with entries for pause, resume, set_disclosure, inject_context, message — all timestamped.

---

## Phase 4: Game Flow with KG Bridge

This tests the full pipeline: load cartridge, play, KG bridge writes to therapy KG, achievements awarded.

### 4.1 Load a Clinical Cartridge
```bash
curl -s -X POST "http://localhost:8095/api/game/cartridges/load" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "'$TEST_USER'", "cartridge_id": "act_compass_quest"}'
```
**Expected**: Full game config JSON with `title`, `protagonist_name`, `locations`, `npcs`, `quests`, `starting_narrative`. If you see `narrator.voice: "Charon"` the clinical cartridge narrator config is flowing through.

**If 500 error**: The `GameGenerator.generate()` may fail on template generation. Check if the synthesis structure matches what the generator expects.

### 4.2 Start Playing
```bash
curl -s -X POST "http://localhost:8095/api/game/play/start" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "'$TEST_USER'"}'
```
**Expected**: Opening narrative, starting location, available actions.

### 4.3 Take an Action (triggers KG bridge)
```bash
curl -s -X POST "http://localhost:8095/api/game/play/action" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "'$TEST_USER'", "action": "look"}'
```
**Expected**: Narrative response + `available_actions`. May include `new_achievements` if this is the first action (triggers "First Step").

### 4.4 Verify KG Growth
```bash
curl -s "http://localhost:8095/api/therapy/user/$TEST_USER/graph" | python3 -m json.tool
```
**Expected**: React Flow format with `nodes` and `edges` arrays. After gameplay, should have at least a few nodes from the KG bridge.

### 4.5 Check Dashboard After Gameplay
```bash
curl -s "http://localhost:8095/api/dashboard/user/$TEST_USER" | python3 -m json.tool
```
**Expected**: Dashboard now has `achievements` (some earned), possibly `flagged_moments` if avoidance choices were made.

---

## Phase 5: Scene Image and Device Context

### 5.1 Device Context
```bash
curl -s "http://localhost:8095/api/game/device-context" | python3 -m json.tool
```
**Expected**: `available: true`, `battery_pct`, `time_of_day` (dawn/day/dusk/night based on current hour), `adaptations` object with narrative mods.

**If `available: false`**: Device state polling may not have completed yet (30s interval). Wait and retry, or check if `termux-battery-status` works on your device.

### 5.2 Scene Image Generation
```bash
curl -s -X POST "http://localhost:8095/api/game/scene-image" \
  -H "Content-Type: application/json" \
  -d '{"location_name": "The Coral Library", "location_description": "A bioluminescent underwater library where fish drift between shelves", "atmosphere": "peaceful, dreamlike, blue-green glow", "time_of_day": "night", "location_id": "coral_library"}'
```
**Expected**: JSON with `image_base64` (long base64 string), `prompt_used`, `cached: false`. Second call returns `cached: true`.

**If 503**: Gemini API key not found or image generation not available on your model. Check `/storage/emulated/0/Download/perplexity/gemini.txt` exists and has a valid key.

---

## Phase 6: ICD-11 API

### 6.1 Search
```bash
cd /root/aria-personal/backend
python3 -c "
from services.icd11_service import ICD11Service
svc = ICD11Service()
results = svc.search('generalized anxiety', limit=3)
for r in results:
    print(f'{r[\"code\"]} - {r[\"title\"]} (score: {r[\"score\"]})')
"
```
**Expected**: WHO ICD-11 results for anxiety disorders with codes like `6B00`.

### 6.2 Cached Taxonomy
```bash
python3 -c "
from services.icd11_service import ICD11Service
svc = ICD11Service()
disorders = svc.get_disorder_list()
print(f'Total imported: {len(disorders)}')
for d in disorders[:10]:
    print(f'  [{d[\"code\"]}] {d[\"title\"]}')"
```
**Expected**: 156 disorders, top-level showing Chapter 06 categories.

---

## Phase 7: Frontend — Dashboard UI

Open in phone browser: `http://YOUR_IP:3001/dashboard`

### 7.1 Initial State
- [ ] Page loads with "Therapist Dashboard" header in gold
- [ ] User ID input field visible in header
- [ ] 6 tabs visible in tab bar (Overview, Therapy KG, Mood, Flags and Notes, Sessions, Assessments)
- [ ] Empty state message: "Enter a User ID above to load their dashboard"
- [ ] "<- Game" link in top-left navigates back to `/game`

### 7.2 Load User
- [ ] Type `test_user_001` (the user from Phase 2-4) and click Load
- [ ] Loading state shows "Loading dashboard..."
- [ ] Overview tab populates with data

### 7.3 Overview Tab
- [ ] 4 stat cards visible: KG Nodes, Mood Trend, Achievements, Flags
- [ ] Achievements grid shows earned vs unearned (stars vs circles)
- [ ] Mood trend shows arrow emoji + trend text
- [ ] Recent flags section shows any flags with severity badges
- [ ] Story recap section shows text
- [ ] "refresh" link on recap works

### 7.4 Therapy KG Tab
- [ ] Click "Therapy KG" tab
- [ ] React Flow canvas loads (may be empty if no KG data yet)
- [ ] If nodes exist: colored by type (red=concern, green=coping, purple=breakthrough, etc.)
- [ ] Node legend shows all 8 types with color dots
- [ ] Click a node then detail panel shows type, intensity, description
- [ ] Zoom/pan works, minimap visible
- [ ] "Refresh" button reloads graph

### 7.5 Mood Tab
- [ ] Click "Mood" tab
- [ ] Velocity card shows trend (improving/declining/stable/insufficient)
- [ ] Mood scale legend with weather emojis
- [ ] Session history shows mood bars (green=good, red=struggling)
- [ ] Delta indicator (Improved/Declined/Stable) per session

### 7.6 Flags and Notes Tab
- [ ] Click "Flags and Notes" tab
- [ ] Flags section shows severity-colored cards (blue=info, yellow=attention, orange=concern, red=urgent)
- [ ] Click "annotate" on a flag then inline text input appears
- [ ] Type annotation and click Save then annotation shows on the flag
- [ ] Click "+ Add Note" then form appears with target type dropdown and text area
- [ ] Add a note then it appears in the notes list

### 7.7 Sessions Tab
- [ ] Click "Sessions" tab
- [ ] Session history list (if sessions recorded)
- [ ] Choice evolution section (empty until choices submitted)
- [ ] Mirror analytics section (empty until stats submitted)
- [ ] Export button downloads full dashboard as JSON file
- [ ] Click Export then JSON file downloads with all dashboard data

### 7.8 Assessments Tab
- [ ] Click "Assessments" tab
- [ ] 6 scale cards visible (PHQ-9, GAD-7, PCL-5, DASS-21, WHO-5, C-SSRS)
- [ ] PHQ-9 and GAD-7 show blue LOINC code badges
- [ ] Integration status shows which scales are active vs ready
- [ ] Connected data sources shows ICD-11, LOINC, Psychology JSON counts

---

## Phase 8: Frontend — Game with Therapy Features

Open in phone browser: `http://YOUR_IP:3001/game`

### 8.1 Cartridge Picker (Clinical Cartridges)
- [ ] On onboarding screen, cartridge picker loads
- [ ] Should show both story cartridges (Maya, Ren, Ash) and clinical cartridges
- [ ] Load "The Compass Quest" (ACT) — game generates

### 8.2 Gameplay with Achievement Toast
- [ ] After loading a cartridge and starting play, take your first action
- [ ] A gold toast should slide up from the bottom: "First Step - Started your first adventure"
- [ ] Toast auto-dismisses after ~3.5 seconds

**Note**: The AchievementToast and TherapistPauseBanner components are created but need to be wired into GameScreen. If they don't appear, that's the expected "needs wiring" state. The components exist, the backend sends `new_achievements`, but GameScreen doesn't yet render the toast. This is the one remaining integration point.

### 8.3 Therapist Pause (test via curl while game is open)
```bash
# In a terminal while the game page is open:
curl -s -X POST "http://localhost:8095/api/dashboard/user/$TEST_USER/pause" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quick check-in. Take a breath."}'
```
- [ ] If polling is wired: pause banner appears over the game
- [ ] If polling is not yet wired: verify via controls endpoint that pause state is set

**Note**: The TherapistPauseBanner component exists but the GameScreen doesn't yet poll controls. This is a frontend wiring task.

---

## Phase 9: Psychology Data Verification

### 9.1 JSON Validity
```bash
cd /root/aria-personal/backend
python3 -c "
import json, os
d = 'data/psychology'
for f in sorted(os.listdir(d)):
    path = os.path.join(d, f)
    with open(path) as fh:
        data = json.load(fh)
    size = os.path.getsize(path)
    print(f'  OK  {f} ({size:,} bytes)')
print(f'All {len(os.listdir(d))} files valid')
"
```
**Expected**: 11 files, all OK.

### 9.2 Specific Data Spot Checks
```bash
python3 -c "
import json

# Check distortions count
with open('data/psychology/cognitive_distortions.json') as f:
    d = json.load(f)
print(f'Distortions: {len(d[\"distortions\"])} (expect 15)')

# Check scales count
with open('data/psychology/assessment_scales.json') as f:
    s = json.load(f)
print(f'Scales: {len(s[\"scales\"])} (expect 7)')
print(f'PHQ-9 items: {len(s[\"scales\"][\"phq9\"][\"items\"])} (expect 9)')
print(f'PCL-5 items: {len(s[\"scales\"][\"pcl5\"][\"items\"])} (expect 20)')
print(f'DASS-21 items: {len(s[\"scales\"][\"dass21\"][\"items\"])} (expect 21)')
print(f'C-SSRS items: {len(s[\"scales\"][\"cssrs_screen\"][\"items\"])} (expect 6)')

# Check DBT modules
with open('data/psychology/dbt_skills.json') as f:
    d = json.load(f)
print(f'DBT modules: {len(d[\"modules\"])} (expect 4)')

# Check ACT processes
with open('data/psychology/act_processes.json') as f:
    a = json.load(f)
print(f'ACT processes: {len(a[\"hexaflex\"])} (expect 6)')

# Check disorders
with open('data/psychology/disorder_communication.json') as f:
    dc = json.load(f)
print(f'Disorder rules: {len(dc[\"disorders\"])} (expect 10)')

# Check ICD-11
with open('data/psychology/icd11_mental_disorders.json') as f:
    icd = json.load(f)
print(f'ICD-11 entities: {icd[\"_meta\"][\"total_entities\"]} (expect 156)')

# Check cartridges
from data.clinical_cartridges import list_clinical_cartridges
print(f'Clinical cartridges: {len(list_clinical_cartridges())} (expect 5)')
"
```
**Expected**: All counts match expected values.

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Server won't start | Import error in new module | Check traceback — usually a typo in import path |
| Dashboard 500 on load | TherapistDashboardService DB path issue | Check `data/therapist/` directory exists |
| KG tab empty | No therapy KG for this user | Play a game first, or check user ID matches |
| Scene image 503 | Gemini API key missing or wrong model | Check `gemini.txt` file and model availability |
| Device context `available: false` | Device state polling not started | Wait 30s after server start, or check termux-api |
| Clinical cartridge 500 | Generator can't process synthesis | Check if `GameGenerator.generate()` handles the synthesis dict structure |
| Mood velocity `insufficient_data` | Need 2+ sessions with mood_end values | Record a second session's mood |
| Controls not affecting game | Frontend doesn't poll controls yet | Controls work via API — frontend wiring needed |
| Achievement toast not showing | Component not wired into GameScreen | Component exists, needs import + render in GameScreen |

---

## Wiring Tasks (Frontend Integration Remaining)

These components are **built and functional** but need to be imported and rendered in GameScreen:

1. **AchievementToast**: Import in GameScreen, add state for `pendingAchievement`, set it when `playAction` response includes `new_achievements`, render AchievementToast at bottom of GameScreen.

2. **TherapistPauseBanner**: Import in GameScreen, add `useEffect` that polls `GET /api/dashboard/user/{id}/controls` every 10 seconds, render TherapistPauseBanner when `paused === 1`.

3. **MoodCheckIn**: Import in GameScreen, show at session start (before first narrative) and session end (at rest points or exit), posts to dashboard mood endpoint.

4. **Clinical cartridges in picker**: The `GET /api/game/cartridges` response now includes a `clinical` array — the CartridgePicker component in OnboardingScreen needs to render these alongside story cartridges, perhaps with a "Clinical" label/badge.

These are straightforward React wiring tasks — each is ~10-20 lines of changes to existing components.
