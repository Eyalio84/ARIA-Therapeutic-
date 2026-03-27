# Aria — Voice AI Assistant Reference

**Author**: Eyal Nof
**Date**: March 21-22, 2026
**Status**: Working Prototype — Production Architecture

---

## 1. What Aria IS

Aria is a **real-time bidirectional voice AI assistant** built on Gemini Live's native audio WebSocket API. She is not a chatbot. She is not a text-to-speech wrapper. She is a **live conversational agent** that:

- **Hears** you speak in real-time (16kHz PCM streaming)
- **Understands** intent and maps it to executable functions
- **Acts** on your behalf (navigates UI, executes commands, controls systems)
- **Speaks** back with natural voice (24kHz audio, gapless playback)
- **Remembers** context across sessions (persistent memory)
- **Switches modes** — from immersive storyteller to system assistant on command

Aria is closer to Jarvis than to Alexa. She doesn't wait for wake words. She doesn't process in batches. She streams audio bidirectionally over a persistent WebSocket, maintaining conversational context throughout a session.

---

## 2. Technical Architecture

### 2.1 Core Stack

```
Browser (client)
  ├── MicCapture          16kHz mono PCM, ScriptProcessorNode
  ├── PlaybackScheduler   24kHz gapless Web Audio API scheduling
  ├── GeminiLiveProvider  WebSocket to Gemini Live API (BidiGenerateContent)
  └── AriaCore            Orchestrator: events, functions, state machine

WebSocket (persistent, bidirectional)
  └── wss://generativelanguage.googleapis.com/ws/...BidiGenerateContent

Gemini Live API (server)
  ├── Speech-to-Text      Real-time input transcription
  ├── Language Model       Gemini 2.5 Flash (native audio preview)
  ├── Function Calling     Structured tool execution
  └── Text-to-Speech      Native audio response generation
```

### 2.2 Wire Protocol

The raw WebSocket uses a JSON protocol with `setup` key and **snake_case** field names:

```json
// Connection setup (sent once on ws.open)
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-12-2025",
    "generation_config": {
      "response_modalities": ["AUDIO"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": { "voice_name": "Aoede" }
        }
      }
    },
    "input_audio_transcription": {},
    "system_instruction": { "parts": [{ "text": "..." }] },
    "tools": [{ "function_declarations": [...] }]
  }
}

// Audio streaming (continuous)
{ "realtime_input": { "media_chunks": [{ "mime_type": "audio/pcm;rate=16000", "data": "<base64>" }] } }

// Function response (after executing a tool call)
{ "tool_response": { "function_responses": [{ "id": "...", "name": "...", "response": { "output": "..." } }] } }

// Context injection (silent, no response expected)
{ "client_content": { "turns": [{ "role": "user", "parts": [{ "text": "[CONTEXT UPDATE]..." }] }], "turn_complete": false } }
```

**Critical discovery**: The Google documentation shows `config` with camelCase. The actual working wire format uses `setup` with snake_case. Both the tal-boilerplate (direct browser WS) and AI-LAB VOX (server proxy) implementations confirm this.

### 2.3 Audio Pipeline

**Capture (browser → Gemini)**:
```
Microphone → getUserMedia(16kHz, mono, echo cancellation, noise suppression)
  → AudioContext(16kHz) → ScriptProcessorNode(bufferSize=8192)
  → Float32 → Int16 PCM (little-endian) → base64 encode
  → WebSocket.send({ realtime_input: { media_chunks: [...] } })
```

**Playback (Gemini → browser)**:
```
WebSocket.onmessage → serverContent.modelTurn.parts[].inlineData.data
  → base64 decode → Int16 array → Float32 normalize (/0x8000)
  → AudioBuffer(24kHz) → BufferSource.start(scheduledTime)
  → Gapless playback via timeline scheduling (nextPlayTime += duration)
  → Silence detection (400ms after last chunk → onSpeakingEnd)
```

**Key insight**: The 50ms initial offset (`nextPlayTime = currentTime + 0.05`) prevents audio glitching on the first chunk. Without it, the first few milliseconds of speech get cut off.

### 2.4 Orb State Machine

Aria's visual representation follows a strict state machine:

```
idle → connecting → listening → thinking → speaking → listening
  ↑                    ↑                       ↑          |
  |                    |                       |          |
  └────────────────────┘───────────────────────┘──────────┘
         (on disconnect or error → idle)
```

| State | Visual | Audio | Meaning |
|-------|--------|-------|---------|
| `idle` | Soft pulse | Silent | Not connected |
| `connecting` | Spinning glow | Silent | WebSocket opening, setup sent |
| `listening` | Breathing glow (1s) | Mic active, streaming | Waiting for user speech |
| `thinking` | Spinning glow | Mic active | Processing user input or executing function |
| `speaking` | Bright pulse (0.6s) | Playing audio | Aria is talking |

### 2.5 Message Handling

Gemini sends messages as **Blobs** in the browser (not strings). The handler must normalize:

```typescript
ws.onmessage = async (event) => {
  let raw = event.data
  if (raw instanceof Blob) raw = await raw.text()  // Critical fix
  const msg = JSON.parse(raw)

  if (msg.setupComplete) → start mic, set state to listening
  if (msg.serverContent?.inputTranscription) → user speech text
  if (msg.serverContent?.outputTranscription) → Aria speech text
  if (msg.serverContent?.modelTurn?.parts[].inlineData) → audio chunk
  if (msg.serverContent?.turnComplete) → return to listening
  if (msg.toolCall?.functionCalls) → execute functions, send responses
}
```

---

## 3. AriaCore — The Modular Voice Engine

AriaCore is a TypeScript library (`src/lib/aria-core/`) that abstracts voice AI into swappable components:

```
AriaCore (orchestrator)
├── providers/
│   ├── base.ts               Event pub/sub, reconnect logic
│   ├── geminiLive.ts          Gemini Live WebSocket implementation
│   └── types.ts               Wire format types
├── audio/
│   ├── micCapture.ts          getUserMedia + ScriptProcessor
│   ├── playbackScheduler.ts   Web Audio API timeline scheduling
│   └── pcmHelpers.ts          Float32 ↔ Int16 ↔ base64
├── devhub/
│   ├── logger.ts              RingBufferLogger (500 entries)
│   └── auditTrail.ts          CommandAuditTrail (200 records)
└── types/
    ├── provider.ts            FunctionDeclaration, FunctionCall, ProviderEvent
    ├── state.ts               AriaStatus, state transitions
    └── audio.ts               AudioConstraints
```

**Provider-agnostic**: The `AriaProvider` interface can be implemented for any voice backend — Gemini Live, OpenAI Realtime, Claude + Kokoro, or a custom WebSocket. The game adapter doesn't know or care which provider is running.

**Event-driven**: All provider communication uses a pub/sub pattern:
```typescript
type ProviderEvent =
  | { type: "ready" }
  | { type: "audio"; data: string }
  | { type: "text"; text: string }
  | { type: "inputTranscription"; text: string }
  | { type: "toolCall"; calls: FunctionCall[] }
  | { type: "error"; message: string }
  | { type: "disconnected"; code: number; reason: string }
```

---

## 4. Function Calling — How Aria Acts

### 4.1 Architecture

Aria doesn't just talk — she executes. Every voice command maps to a typed function declaration that Gemini can call:

```typescript
interface FunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
}
```

When a user says "look around", Gemini matches it to `{ name: "look" }` and sends:
```json
{ "toolCall": { "functionCalls": [{ "id": "fc-123", "name": "look", "args": {} }] } }
```

The adapter executes the function, gets a result, and sends it back:
```json
{ "tool_response": { "function_responses": [{ "id": "fc-123", "name": "look", "response": { "output": "{\"narrative\": \"The room stretches before you...\"}" } }] } }
```

Gemini then narrates the result atmospherically in voice.

### 4.2 Two Command Categories

**API Commands** — Hit the backend, modify game state:
```
move(direction)    → POST /api/game/play/action → changes location
look()             → POST /api/game/play/action → describes scene
talk(npc_name)     → POST /api/game/play/action → NPC dialogue
take(item)         → POST /api/game/play/action → picks up item
use_item(item)     → POST /api/game/play/action → uses item
choose(choice_id)  → POST /api/game/play/action → quest choice
quest()            → POST /api/game/play/action → quest status
status()           → POST /api/game/play/action → player stats
inventory()        → POST /api/game/play/action → list items
save_game()        → POST /api/game/save-full   → persists to SQLite
```

**Client Commands** — Execute locally, no server round-trip:
```
where_am_i()       → reads game store, returns rich location context
who_is_here()      → reads NPC data, returns personalities + dialogue styles
what_can_i_do()    → reads available actions, returns natural suggestions
hint()             → reads quest + location, returns atmospheric nudge
recap()            → reads transcript + map, returns story summary
talk_to_companion()→ reads companion data, returns in-character response
how_is_companion() → reads bond level, returns narrative description
open_journal()     → toggles drawer UI open
close_journal()    → toggles drawer UI closed
show_map()         → opens drawer to map section
show_inventory()   → opens drawer to inventory section
switch_to_su()     → switches to Super User mode (reconnects with new prompt)
switch_to_game()   → switches back to Game mode (reconnects with game prompt)
```

**Key insight**: Client commands return an `instruction` field that tells Gemini **how** to narrate the data — "voice each NPC differently", "be poetic not mechanical", "speak AS the companion". This is a prompt-within-a-response technique.

### 4.3 Command Audit Trail

Every function call is recorded with timing:

```typescript
interface AuditRecord {
  id: string
  timestamp: number
  commandName: string
  args: Record<string, unknown>
  contextId: string
  resultType: "silent" | "speak" | "dispatch" | "error"
  durationMs: number
  responseText?: string
  errorMessage?: string
}
```

Ring buffer of 200 records. Queryable by command name or error status. Visible in DevHub Commands tab.

---

## 5. Dual Mode — Game vs Super User

### 5.1 The Concept

Aria has two personalities that can be switched at runtime:

**Game Mode** (default): Aria is the storyteller. She narrates, voices NPCs, describes sensations. She doesn't know she's an AI. She IS the world. 23 game function declarations.

**Super User Mode**: Aria breaks character. She becomes Jarvis — a system-aware assistant that can navigate the app, open panels, show diagnostics, change settings, export data. 12 SU function declarations.

### 5.2 Mode Switching

Three activation methods:

| Method | To SU | To Game |
|--------|-------|---------|
| Chat slash command | `/aria-su` | `/aria-game` |
| Voice | "Aria, super user mode" | "Aria, back to game" |
| Function call | `switch_to_su()` | `switch_to_game()` |

**What happens on switch**: The adapter disconnects, rebuilds the system prompt for the new mode, swaps the function declarations, and reconnects. The mic restarts. The orb transitions through `connecting → listening`. From the user's perspective, Aria "changes personality" in about 2 seconds.

### 5.3 Super User System Prompt

```
You are Aria in SUPER USER mode. You are no longer the storyteller — you are a system assistant.
You are aware of the full application: DevHub, transcript, persistence, themes, stores, voice config.
Speak clearly and directly. No atmospheric narration. You are Jarvis.

SYSTEM STATE:
Game loaded: "Maya and the Abyssal" — Maya
Turn: 12 | Courage: 6 | Trust: 4 | Items: 3
Locations discovered: 4 / 8
Voice: connected
Theme: maya
Transcript entries: 47
Dev log entries: 128
Audit records: 23

AVAILABLE PANELS:
- DevHub: logs, voice events, game state, command audit, config
- Transcript: therapeutic session log
- Aria Settings: voice, persona, NPC presets
- Journal: map, inventory, quests, companion
- Burger Menu: theme, profile, save/exit
```

### 5.4 SU Function Declarations

```
open_devhub()        → opens DevHub panel
open_transcript()    → opens transcript panel
open_aria_settings() → opens Aria config panel
open_journal()       → opens drawer
open_burger_menu()   → opens settings menu
switch_theme(theme)  → changes visual theme
export_transcript()  → exports session JSON
show_game_state()    → returns full state summary
show_errors()        → returns recent errors from dev log
show_audit_trail()   → returns recent command executions
save_game()          → saves to SQLite
switch_to_game()     → returns to game mode
```

---

## 6. SU Lab — Voice-Controlled Composition Engine

The SU Lab (`/su`) is a voice-controlled visual canvas with a complete logic programming system. It serves three purposes simultaneously:

1. **Creative tool** — design layouts, wireframes, interactive apps, games
2. **Therapeutic tool** — creative expression, externalization, guided exercises
3. **Dataset factory** — every voice-to-function pair auto-captured for FunctionGemma fine-tuning

**Key capabilities added March 25, 2026**: 12 object types, 8 logic block types, collision detection, Play/Pause mode, 5 end-to-end tutorials, ~95 voice functions. See `docs/SU-LAB-LOGIC-SYSTEM.md` for full logic system reference.

### 6.1 Object Types (12)

| Type | Visual | Key Properties |
|------|--------|---------------|
| **Shape** | Circle/square/triangle | color, opacity, animation |
| **Image** | Background-image container | imageSrc |
| **Button** | Gradient label, tap fires wires | buttonLabel, style (oneshot/toggle) |
| **Text** | Rendered text content | textContent, fontSize |
| **Input** | Text/number entry field | inputValue, inputType |
| **Timer** | Countdown display | timerDuration, timerElapsed |
| **Container** | Parent with children | containerLayout (free/vertical/horizontal) |
| **Slider** | Track + draggable thumb | sliderMin, sliderMax, sliderValue |
| **Toggle** | iOS-style switch | toggleState |
| **Progress** | Horizontal fill bar | progressValue |
| **Dropdown** | Expandable options list | dropdownOptions, dropdownSelected |
| **Counter** | Large number with +/- | counterValue, counterStep |

### 6.1b Logic Block Types (8)

| Type | Purpose | Example |
|------|---------|---------|
| **if_else** | Conditional branch | IF input == 0 THEN opacity 1 ELSE 0.2 |
| **compare** | Boolean comparison | value > 10 --> true/false |
| **math** | Arithmetic | Player.y - 20 (reads live property) |
| **delay** | setTimeout wrapper | Wait 1000ms then propagate |
| **set_variable** | Store named value | $score = input |
| **get_variable** | Read named value | output $score |
| **loop** | Repeat N times | FOR i = 0 to 4, propagate i |
| **collision** | Proximity check | Player near Target? Reposition + signal |

### 6.1c Play/Pause Mode

Toggle in top bar switches between Build (edit objects, configure, wire) and Play (interact with buttons/sliders/counters, objects locked in place, no config panels).

### 6.1d Tutorial System

5 built-in tutorials executed by the Recipe Runner: Calculator, Quiz Game, Traffic Light, Mood Tracker, Catch Game. Each creates objects, wires logic, and produces a working interactive application.

### 6.2 Canvas Controls

| Command | Function | What It Does |
|---------|----------|-------------|
| "zoom to 1.2" | `zoom_canvas(level)` | CSS transform scale, center-origin, 0.5-2x range |
| "background dark blue" | `set_background(color)` | Sets canvas background color |
| "hide grid" | `toggle_grid(visible)` | Shows/hides SVG grid overlay |
| "clear everything" | `clear_canvas()` | Removes all objects, starts fresh |
| "enable snapping" | `snap_to_grid(enabled)` | Objects snap to 20px grid on drag |

### 6.3 Object Relationships

| Command | Function | What It Does |
|---------|----------|-------------|
| "align left" | `align_objects(axis)` | All objects snap to same x/y |
| "bring to front" | `set_layer(position)` | z-index manipulation |
| "group A and B" | `group_objects(labels)` | Shared groupId, drag together, purple dot indicator |
| "ungroup" | `ungroup_objects()` | Removes groupId from all members |
| "space them out" | `distribute_evenly(axis)` | Even gaps between objects |
| "export as css" | `export_layout(format)` | Generates JSON/CSS/HTML to clipboard |

### 6.4 Animations

| Command | Function | CSS Keyframe |
|---------|----------|-------------|
| "make it spin" | `animate(type, speed)` | `lab-spin` — rotate 360deg |
| "make it bounce" | `animate(type, speed)` | `lab-bounce` — translateY -20px |
| "make it pulse" | `animate(type, speed)` | `lab-pulse` — scale 1→1.15 |
| "orbit around A" | `orbit(target, speed)` | `lab-orbit` — CSS offset-path circle |
| "stop" | `stop_animation()` | Clears animation |

### 6.5 Shape Edit Mode

`edit_shape` / `done_editing` commands toggle 8 purple drag handles:
- **4 corners** (NW, NE, SW, SE) — resize both width and height
- **4 sides** (N, S, E, W) — stretch one axis independently

Objects with `width !== height` show as ovals (circles) or rectangles (squares).

### 6.6 Complete Function Inventory (~95 voice functions)

| Category | Count | Functions |
|----------|-------|-----------|
| Typed Creation | 12 | add_object, add_image, add_button, add_text, add_input, add_timer, add_slider, add_toggle, add_progress, add_dropdown, add_counter, add_container |
| Object CRUD | 6 | duplicate_object, delete_object, list_objects, get_state, reset_objects, clear_canvas |
| Properties | 14 | set_size, set_color, set_opacity, move_object, set_position, transform_shape, set_width, set_height, select_object, rename_object, set_text, set_image, take_photo, set_placeholder |
| Logic Blocks | 11 | add_logic_block, add_compare_block, add_math_block, add_delay_block, add_loop_block, set_variable, get_variable, add_collision_block, configure_logic, configure_math, delete_logic_block |
| Wiring | 4 | connect_wire, disconnect_wire, add_canvas_object, show_logic_state |
| Listeners | 2 | add_listener, delete_listener |
| Counter | 3 | increment_counter, decrement_counter, reset_counter |
| Container | 3 | set_layout, add_to_container, remove_from_container |
| Slider/Toggle/Dropdown | 5 | set_slider_value, set_toggle, set_progress, set_options, select_option |
| Timer | 3 | start_timer, stop_timer, reset_timer |
| Behaviors | 2 | create_behavior, list_behaviors |
| Canvas | 5 | zoom_canvas, set_background, toggle_grid, snap_to_grid, set_layer |
| Relations | 4 | align_objects, group_objects, ungroup_objects, distribute_evenly |
| Animation | 3 | animate, stop_animation, orbit |
| Config/Nav | 6 | open_config, close_config, edit_shape, done_editing, open_logic_editor, close_logic_editor |
| Project | 5 | save_preset, load_preset, save_project, load_project, export_layout |
| Device | 5 | toggle_torch, check_battery, send_notification, set_volume, clipboard_copy |
| Undo | 2 | undo, redo |

### 6.7 Training Data Pipeline

Every voice→function pair is auto-captured by `trainingLogger` for fine-tuning FunctionGemma 270M:

```
User speaks → Gemini calls function → logger.capture(utterance, name, args) → localStorage
                                                                              ↓
                                                         Export JSONL → HuggingFace AutoTrain
                                                                              ↓
                                                         Fine-tuned GGUF → local inference
```

- **Auto-capture**: `src/lib/trainingLogger.ts` — singleton, max 500 examples, Export JSONL button in debug drawer
- **Dataset generator**: `data/finetune/generate_dataset.py` — 45 functions × 10-12 utterances = 1,448 examples
- **Format**: FunctionGemma native (`<start_function_call>call:name{args}<end_function_call>`)
- **Subset variants**: Each example generated with 5, 15, or all functions declared
- **Negative examples**: 60 non-function-call examples (10-15% of dataset)

### 6.8 Local Inference Pipeline (FunctionGemma)

Goal: Replace Gemini Live function calling with local FunctionGemma 270M for zero-cost offline operation.

```
Voice → STT → text → FunctionGemma 270M (local, ~50ms) → function call → SU Lab
                              ↑                                              ↓
                     242MB Q4 GGUF on phone                          Kokoro TTS (141MB)
```

| Component | File | Purpose |
|-----------|------|---------|
| Download | `scripts/download_functiongemma.py` | Pulls GGUF from HuggingFace |
| Engine | `scripts/functiongemma_inference.py` | 3 modes: REPL, single query, HTTP server |
| Backend | `serve_game.py` | `/api/functiongemma/infer`, `/status`, `/unload` |
| Frontend | `src/lib/localAria.ts` | `localInfer()`, `localStatus()`, `localUnload()` |

---

## 7. Slash Commands

The game input field recognizes `/` prefixed commands:

| Command | Mode | Action |
|---------|------|--------|
| `/aria-su` | Game | Enter Super User mode |
| `/aria-game` | SU | Return to Game mode |
| `/save` | Both | Full game save (backend snapshot) |
| `/look` | Game | Look around current location |
| `/map` | Game | Open drawer to map |
| `/inventory` | Game | Open drawer to inventory |
| `/quest` | Game | Show quest status |
| `/hint` | Game | Get atmospheric hint |
| `/recap` | Game | Story-so-far summary |
| `/theme [name]` | Both | Switch theme (default/maya/ren/ash) |
| `/export` | Both | Download transcript JSON |
| `/status` | Both | Show player stats |
| `/help` | Both | List available commands for current mode |

---

## 8. Context Persistence — Aria Remembers

### 7.1 Session Memory

On voice disconnect, the adapter builds a context summary from the transcript:

```
Maya is at turn 12. Locations visited: Coral Library, Abyssal Rift, Proving Ground.
Courage: 6, Trust: 4, Items: 3. Player said things like: "look around", "talk to the guide",
"I want to explore deeper". Recent events: found the torn map; met the guide; chose to seek help.
Mirror moments: "You notice how Maya always chooses to help others first."
```

This summary is saved to SQLite (`aria_context` table) and stored in `sessionStorage` for within-tab reconnects.

### 7.2 Context Injection

On next voice connect, the summary is injected into the system prompt:

```
PREVIOUS SESSION (Aria remembers):
Maya explored the coral library and moved to the rift. She picked up a torn map.
She chose to seek help rather than investigate alone. Her courage grew.
```

Aria can reference what happened before without being explicitly told.

### 7.3 Live Context Updates

During gameplay, every action sends a silent context update to Aria via `client_content`:

```json
{
  "client_content": {
    "turns": [{ "role": "user", "parts": [{ "text": "[GAME STATE UPDATE — do not respond]\nLocation: Abyssal Rift\nCourage: 6 Trust: 4\nWhat happened: You picked up the torn map." }] }],
    "turn_complete": false
  }
}
```

The `turn_complete: false` tells Gemini to absorb the information without generating a response.

---

## 9. Observability — The DevHub

### 8.1 Three-Tier Logging

| Tier | Audience | Storage | Content |
|------|----------|---------|---------|
| **Transcript** | Therapist/analyst | Zustand store + SQLite | User speech, Aria speech, game events, mirror moments |
| **Dev Logger** | Developer/admin | RingBufferLogger (500 entries) | WebSocket events, store mutations, function calls, errors |
| **Command Audit** | Developer | CommandAuditTrail (200 records) | Function name, args, result type, duration, response |

### 8.2 DevHub Panel

5-tab portal-mounted panel (z:99999):

| Tab | Source | Content |
|-----|--------|---------|
| **Logs** | `devLogger.getAll()` | Unified stream with level + source filters |
| **Voice** | `devLogger.getBySource("voice")` | Connection status, WebSocket events |
| **Game** | `useGameStore` + devLogger | Live state: location, stats, map, recent ops |
| **Cmds** | `commandAudit.getAll()` | Audit trail with timing |
| **Config** | All stores | Voice model, theme, game context, function count |

### 8.3 Store Instrumentation

Game store mutations are instrumented at the store level (not the component level):

```typescript
setScreen: (screen) => {
  set({ currentScreen: screen })
  devLogger.log("game", "info", "setScreen", screen)  // ← after mutation
}

handleGameAction: (action) => {
  devLogger.log("game", "info", "handleGameAction",
    `${action.action_type}: ${action.narrative?.slice(0, 60)}`,
    action.state_changes)  // ← structured data
  set((s) => { ... })
}
```

This means every state change is captured regardless of what triggered it.

---

## 10. Voice Selection

Gemini Live supports multiple voices:

| Voice | Character | Best For |
|-------|-----------|----------|
| **Aoede** | Warm, storytelling | Default narrator, companion |
| **Kore** | Clear, articulate | System assistant, instructions |
| **Puck** | Playful, energetic | Young characters, humor |
| **Charon** | Deep, atmospheric | Dark themes, noir |
| **Fenrir** | Bold, dramatic | Action, confrontation |
| **Leda** | Gentle, soothing | Therapeutic, calming |

Currently hardcoded to Aoede. The AriaPanel has voice selection UI (6 options) — wiring the actual voice switch on reconnect is a planned feature.

---

## 11. System Prompt Engineering

### 10.1 Game Mode Prompt Structure

```
Identity block     → "You are Aria — the living voice of this adventure"
Game context       → title, protagonist, tone, theme
Companion          → name, description, behavior instructions
NPCs               → name, role, personality, dialogue style, location (for voice acting)
Locations          → name, id, atmosphere, exits
Items              → name, id, description, location
Quests             → title, id, description
Live state         → current stats, turn, choices
Previous session   → context summary from last session (if available)
Voice rules        → behavior instructions (always use functions, never reference tools, etc.)
```

### 10.2 Key Prompt Techniques

**"ALWAYS use functions"** — Prevents Aria from just describing what would happen instead of actually executing. "I'll move you there" → calls `move("explore")`.

**"NEVER reference functions by name"** — Prevents "I'll call the look function" and instead produces "Let me take a look around..."

**"Voice NPCs differently"** — "Speak AS them, not about them" — Aria changes delivery for each NPC based on their `dialogue_style` field.

**Instruction field in function responses** — The response JSON includes an `instruction` field:
```json
{
  "narrative": "There are 2 characters here.",
  "npcs": [...],
  "instruction": "Voice each NPC differently. Speak AS them briefly — a greeting in their personality."
}
```
This is a prompt-within-a-response: the function declaration says WHEN to call, the response instruction says HOW to present.

---

## 12. Progression Timeline

### Day 1 Morning — Broken Voice
- Voice orb existed but didn't connect
- WebSocket format wrong (`config` key instead of `setup`, camelCase instead of snake_case)
- Blob messages not handled (browser WebSocket default)

### Day 1 Mid-Morning — First Words
- Fixed wire format by analyzing working tal-boilerplate implementation
- Fixed Blob → `.text()` conversion
- Aria speaks for the first time through the game

### Day 1 Afternoon — Rich Voice
- Upgraded system prompt: full NPC details, locations, items, quests
- Added 13 new voice commands (drawer control, game awareness, companion)
- Live context injection via `client_content`
- Voice-controlled UI (open journal, show map, etc.)

### Day 1 Evening — React Migration
- Migrated 1,525-line vanilla JS to 42 React components
- 5 Zustand stores, typed API wrapper, AriaCore integration
- Production voice engine replacing the vanilla IIFE

### Day 1 Night — Full Platform
- DevHub with 5 tabs, ring buffer, command audit trail
- Left-side drawer (React Flow map, emoji inventory, quest journal, companion)
- Burger menu + Aria config panel
- SQLite persistence with unified snapshots
- Dual mode (Game vs Super User)
- Slash commands (14 commands)
- Auto-save every 5 turns
- Session memory (survives reconnects via sessionStorage)

### Day 3 (March 25) -- Logic Engine + Tutorials + Play Mode
- Fixed logic engine: evaluateBlock chaining bug (blocks were skipped)
- Fixed button output: oneshot sends label, toggle sends 0/1
- Fixed counter increment: always increments, never sets raw value
- Fixed slider propagation: executeFromSource on drag
- Added object propagation: all wire-set properties propagate
- Added collision detection block type
- Added Play/Pause mode (build vs runtime)
- Added named logic blocks (label parameter)
- Fixed black/white/gray color handling
- Rewrote all 5 tutorials end-to-end (Calculator, Quiz, Traffic Light, Mood Tracker, Catch Game)
- Added pixel-perfect rounding

### Total Voice Commands: 23 (Game) + ~95 (SU) + 12 (SU panel) = ~130

---

## 13. What Makes Aria Different

### From a Chatbot
- **Real-time audio**, not text-to-speech on top of chat
- **Bidirectional streaming**, not request-response
- **Function execution**, not just conversation
- **State awareness**, not stateless
- **Mode switching**, not single personality

### From Alexa/Siri
- **No wake word** — always listening when connected
- **Contextual** — knows your game state, location, inventory, quest
- **Creative** — narrates stories, voices characters, generates atmosphere
- **Persistent memory** — remembers across sessions
- **Dual mode** — switches between creative and technical
- **Open architecture** — swap providers, add functions, modify prompts

### From a Game NPC
- **Not scripted** — generates responses from context
- **Controls the game** — executes real actions via function calling
- **Observes everything** — tracks state changes, logs to DevHub
- **Breaks the fourth wall on command** — Super User mode

---

## 14. Architecture for Reuse

Aria's voice infrastructure is **application-agnostic**. The game is one implementation. The same stack supports:

### Smart Home
```
System prompt: "You are the house. You control lights, temperature, security."
Functions: set_temperature(room, degrees), lock_door(door_id), play_music(query)
```

### Development Assistant
```
System prompt: "You are a coding assistant. You can read files, run tests, deploy."
Functions: read_file(path), run_command(cmd), search_code(pattern), git_status()
```

### Personal Assistant
```
System prompt: "You are a personal AI. You manage calendar, email, reminders."
Functions: create_event(title, time), send_email(to, subject), set_reminder(text, when)
```

### Medical Intake
```
System prompt: "You are a medical intake assistant. Gather symptoms, history."
Functions: log_symptom(description, severity), check_interaction(drug_a, drug_b)
```

The pattern is always the same:
1. Define a system prompt (who is Aria)
2. Define function declarations (what can Aria do)
3. Implement function handlers (how Aria does it)
4. Connect AriaCore (the voice pipeline)

---

## 15. Technical Specifications

| Spec | Value |
|------|-------|
| **Voice Model** | gemini-2.5-flash-native-audio-preview-12-2025 |
| **Input Audio** | 16kHz, 16-bit PCM, mono, base64 encoded |
| **Output Audio** | 24kHz, 16-bit PCM, mono, base64 encoded |
| **Buffer Size** | 8192 samples per capture chunk |
| **Playback Offset** | 50ms initial scheduling offset |
| **Silence Detection** | 400ms after last audio chunk |
| **WebSocket Protocol** | BidiGenerateContent (v1beta) |
| **Setup Key** | `setup` (NOT `config`) |
| **Field Naming** | snake_case (NOT camelCase) |
| **Ring Buffer** | 500 log entries, O(1) memory |
| **Audit Trail** | 200 command records |
| **Session Memory** | sessionStorage + SQLite aria_context table |
| **Function Declarations** | 23 (game) + ~95 (SU canvas) + 12 (SU panel) = ~130 total |
| **Available Voices** | Aoede, Kore, Puck, Charon, Fenrir, Leda |

---

## 16. File Map

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/aria-core/providers/geminiLive.ts` | 194 | WebSocket connection, message handling |
| `src/lib/aria-core/audio/micCapture.ts` | 66 | Microphone capture |
| `src/lib/aria-core/audio/playbackScheduler.ts` | 74 | Gapless audio playback |
| `src/lib/aria-core/audio/pcmHelpers.ts` | 46 | PCM encoding/decoding |
| `src/lib/aria-core/providers/base.ts` | 79 | Event pub/sub, reconnect |
| `src/lib/aria-core/providers/types.ts` | 106 | Wire format types |
| `src/lib/aria-core/devhub/logger.ts` | 96 | RingBufferLogger class |
| `src/lib/aria-core/devhub/auditTrail.ts` | 65 | CommandAuditTrail class |
| `src/lib/gameAriaAdapter.ts` | ~750 | Game voice adapter (prompts, functions, mode switch) |
| `src/lib/gameDevLogger.ts` | 28 | Singleton logger + audit instances |
| `src/store/gameVoice.ts` | 22 | Voice orb state |
| `src/store/ariaMode.ts` | 16 | Game vs SU mode |
| `src/components/game/voice/GameVoiceOrb.tsx` | 38 | Voice activation orb |
| `src/components/game/voice/VoiceStatus.tsx` | 22 | Status text display |
| `src/components/game/devpanel/DevHub.tsx` | 280 | 5-tab observability panel |
| **SU Lab** | | |
| `src/components/su/SUShell.tsx` | ~3200 | SU Lab: canvas, ~95 functions, 12 object types, play/pause, tutorials |
| `src/components/su/LogicEditor.tsx` | ~600 | Node editor: wiring, blocks, tabbed drawer, config |
| `src/components/su/ColorPicker.tsx` | ~70 | Hue slider + 8 preset swatches |
| `src/store/lab.ts` | ~650 | Lab state: 12 objects, LogicGraph, 8 block types, playMode |
| `src/lib/logicEngine.ts` | ~330 | Execution engine: executeFromSource, evaluateBlock, collision |
| `src/lib/recipeRunner.ts` | ~110 | Tutorial runner: step execution, delays |
| `src/lib/recipes/*.ts` | ~680 | 5 tutorials: calculator, quiz, traffic light, mood tracker, catch game |
| `src/lib/behaviorSync.ts` | ~320 | Bidirectional behavior card to LogicGraph sync |
| `src/lib/trainingLogger.ts` | ~110 | Auto-capture voice→function pairs for FunctionGemma |
| `src/lib/localAria.ts` | ~50 | Frontend client for local FunctionGemma inference |
| `scripts/functiongemma_inference.py` | ~290 | Local inference engine: REPL, HTTP server, parser |
| `scripts/download_functiongemma.py` | ~90 | Download fine-tuned GGUF from HuggingFace |
| `data/finetune/generate_dataset.py` | ~480 | Dataset generator: 1,448 FunctionGemma examples |

---

## 17. Known Limitations

1. **Single voice per session** — changing voice requires disconnect/reconnect
2. **No interruption handling** — if user speaks while Aria is speaking, audio overlaps
3. **No voice activity detection** — mic streams continuously (bandwidth)
4. **API key exposed in browser** — acceptable for local dev, needs server proxy for production
5. **No speaker diarization** — can't distinguish multiple speakers
6. **Context window** — Gemini Live sessions have token limits; long sessions may lose early context
7. **Latency** — function calls add 200-500ms (API round-trip) on top of voice latency
8. **No offline mode** — requires internet for Gemini API

---

## 18. What's Next (Independent of Therapy)

### Immediate (Voice)
- Wire voice selection to actually change `voice_name` on reconnect
- Implement personality sliders (modify system prompt dynamically)
- Add NPC voice presets (different `voice_name` per character)
- Implement text fallback when voice unavailable

### Immediate (SU Lab -- from March 25 session insights)
- Audit all interactive objects for wire propagation (input, timer, toggle, dropdown may have the same bug slider had)
- Timer completion event: fire through output wires when timer reaches 0
- Boundary checking blocks: IF x < 0 THEN set x = 0 (essential for games)
- Random position block: reusable, not just collision-internal
- Recipe auto-play-mode: enter Play mode when tutorial completes
- Text input wire propagation: typing fires value through wires

### Medium-term
- Component Library: save/load reusable object+wire compositions as named JSON
- Value Bus: named pub/sub channels to reduce wire spaghetti
- Enhanced typed port system with compatibility checking
- Context-aware config panels (adapts to connected types)
- Wire animation dots (show data flow direction visually)
- Server-side WebSocket proxy (hide API key)
- Multi-provider support (OpenAI Realtime as alternative)
- Voice activity detection (stop streaming silence)
- Interruption handling (user speaks, stop Aria audio)

### Long-term
- React export: walk LogicGraph, generate JSX + useState + useEffect
- FunctionGemma training on logic commands (connect_wire, configure_logic)
- Custom user-defined logic block types
- FOR loops, multi-output blocks
- Multi-user simultaneous sessions
- Custom voice training (fine-tuned voice models)
- Emotion detection from voice (prosody analysis)
- Ambient audio mixing (background music + Aria voice)
- Wake word activation ("Hey Aria")
- Cross-device continuity (start on phone, continue on desktop)

---

*This document describes Aria as built by Eyal Nof, March 2026. The voice infrastructure is application-agnostic — the game is one use case. The architecture, function calling pattern, mode switching, and observability layer transfer to any domain.*
