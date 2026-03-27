# Phase 3 Research: Visual/Game AI Features for Aria

## The Three "I Didn't Know That Was Possible" Discoveries

### 1. Battery State as Narrative Mechanic
Your phone at 12% → "The realm is flickering. Aria says: 'We must hurry. The light is fading...'"
Charging your phone = your character resting and recovering.
**Implementation: 10 lines of code. Zero friction. Viral potential.**

### 2. Voice Tone Interpretation (Not Just Transcription)
Gemini Live audio mode doesn't just transcribe — it infers emotional charge, hesitation, confidence from the audio waveform. Aria responds to HOW you say something. A nervous "I'll face the dragon..." gets a different response than a confident one.
**No consumer game has done this. Completely novel.**

### 3. Physical NFC Cards as Cartridge Launchers
A $0.30 NFC sticker on a handmade card, tapped to phone, instantly loads an Aria adventure.
"Aria Adventure Packs" become physical products. No app store needed.
**Physical-digital hybrid without AR hardware.**

---

## Priority Features for Phase 3

### Easy Wins (hours, not days)

| Feature | What | Complexity | Impact |
|---------|------|-----------|--------|
| **Battery narrative** | Battery % drives game urgency | 10 lines | Viral, unique |
| **Time-of-day tone** | Night=dark narrative, morning=hopeful | Easy | Immersive |
| **Ambient light tone** | Dark room=ominous, bright=lighter | Easy | Zero friction |
| **Accelerometer gestures** | Shake to dodge, tilt to balance | Easy | Physical engagement |

### Medium (1-3 days each)

| Feature | What | Complexity | Impact |
|---------|------|-----------|--------|
| **Inline image generation** | Gemini generates scene illustration per location | Medium | Visually transformative |
| **Photo-to-game-item** | Camera → Gemini Vision → "You found an ancient artifact" | Medium | Deeply personal |
| **Player behavior profiling** | Track choices → narrative adapts to psychology | Medium | True personalization |
| **NFC physical tokens** | Tap NFC sticker → triggers game event | Medium | Physical-digital hybrid |
| **Voice tone awareness** | Gemini Live detects emotion in voice | Medium | Unprecedented |

### Hard (1-2 weeks, high value)

| Feature | What | Complexity | Impact |
|---------|------|-----------|--------|
| **World-state KG** | Full persistent world via knowledge graph | Hard | True game engine |
| **Character portrait evolution** | Gemini inpainting — character visually ages/changes | Hard | Emotional attachment |
| **Mood journaling + tracking** | Post-session check-in → semantic mood timeline | Medium | Clinical value |
| **Constitutional AI guardrails** | Safety layer for therapeutic content | Medium | Required for clinical |
| **IFS inner voices gameplay** | Dialogue with inner "parts" as game characters | Hard | Breakthrough therapeutic |

---

## Novel Game Mechanics

### Camera-to-Narrative
"Take a photo of where you are." → Gemini Vision analyzes → Aria weaves real environment into game.
Dark room + Ash's noir = Aria describes rain on your actual window.

### Photo-to-Character
Player draws character on paper → takes photo → Gemini describes → Imagen generates portrait.
Children draw their hero, Aria brings them to life.

### Emotion Detection (Front Camera)
MediaPipe Face Mesh (on-device) → detect "frustrated", "bored", "amused" → Aria adjusts pacing.
Privacy-sensitive: requires explicit consent, process locally, store nothing.

### Bluetooth Beacons as Room Triggers
$5-15 BLE beacons in different rooms → game scene changes when player moves physically.
Bedroom = sanctuary scene. Kitchen = tavern. Living room = grand hall.

---

## Therapeutic Gaming Innovations

### Somatic Check-Ins
After high-tension scenes: "Take a breath. Where do you feel the tension?"
Player voices body sensations, Aria responds narratively.
Differentiates Aria from entertainment → clinical tool.

### IFS Inner Voices
"There's a voice in your character that says they don't deserve happiness. Do you want to speak with it?"
Player dialogues with inner "parts" as game NPCs. Genuine IFS protocol gamification.

### Constitutional Guardrails
Secondary AI pass checking: "Never suggest self-harm metaphors", "Always offer a hope route", "Adjust for player age."
Configurable by therapist in dashboard. Required for clinical deployment.

### Mood Journaling
Post-session: "How are you feeling as you leave this world?"
Response embedded with MiniLM → cosine distance from "hopeful" anchor → semantic mood timeline.
Therapist dashboard shows trajectory over weeks.

---

## Recommended Phase 3 Implementation Order

**Week 1 (easy wins)**:
1. Battery state → game urgency narrative (10 lines)
2. Time-of-day + ambient light → tone shifts
3. Accelerometer shake → game event
4. Per-scene image generation via Gemini

**Week 2 (medium)**:
5. Photo-to-game-item via camera + Gemini Vision
6. Player behavior profile accumulation
7. Voice tone awareness (Gemini Live audio mode)
8. NFC token system

**Week 3+ (hard, high-value)**:
9. World-state KG persistence
10. Constitutional narrative guardrails
11. Mood journaling + therapist dashboard data
12. Character portrait evolution
