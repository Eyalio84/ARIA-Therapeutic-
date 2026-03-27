<!-- last-verified: 2026-03-25 -->

# templates/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `backend/templates/` |
| **Purpose** | Self-contained HTML game client for Aria's therapeutic narrative game engine. Renders onboarding, interview, game play, voice interaction, and session transcript in a single-page app served by the backend. |
| **Framework / stack** | Vanilla HTML + CSS + JavaScript (no build step, no framework). Connects to backend REST API and Gemini Live WebSocket. |
| **Entry point** | `game.html` |
| **External dependencies** | Backend REST API (`/api/game/*`), Gemini Live WebSocket API (voice), Google Fonts (Instrument Serif, DM Sans, JetBrains Mono) |
| **Component/file count** | 1 file, 1525 lines |
| **Design language** | "Obsidian Command Center" -- dark, warm, gold-accent theme with glass-morphism. Mobile-first (480px max-width), game-first UX. |

## File Tree

```
templates/
  game.html          # Single-page therapeutic narrative game client (HTML + CSS + JS)
```

## Component / Module Index

---

<a id="game.html"></a>
### game.html

**Self-contained single-page application that drives the full Aria therapeutic narrative game experience: onboarding vibe selection, guided interview, game world generation, interactive text adventure with voice, and session transcript logging.**

Because the file is large (1525 lines), the major sections are listed below:

**CSS (lines 9-365)**
- Custom properties defining the Obsidian dark theme (gold, teal, rose palette)
- Styles for five screens: onboarding, interview, generating, game, transcript panel
- Voice orb states (idle, connecting, listening, thinking, speaking) with keyframe animations
- Rest overlay, cartridge picker, mirror bubble, map nodes, stats bar, action chips
- Responsive border treatment above 480px

**HTML Structure (lines 367-510)**
- `#onboarding` screen: brand bar, hero text, vibe cards (build_cool / your_way / explore_together), depth selector (quick / standard / deep), begin button, cartridge demo cards
- `#interview` screen: progress bar, phase tag, Aria question display, mirror bubble with expand/close, conversation trail, text input with send button, exit ramp
- `#generating` screen: spinner with "Crafting your world" message
- `#game` screen: top bar with title and turn count, map node strip, stats bar (Courage / Trust / Items), narrative area, quest choices, actions bar, text input
- `#transcriptPanel`: full-screen overlay with color-coded log (Player / Aria / Game / System), export JSON and clear buttons
- Voice orb (fixed-position floating mic button) and voice status label
- `#restOverlay`: pause overlay with continue/save options

**JavaScript — State & DOM Helpers (lines 512-552)**
- `state` object: userId, vibe, depth, currentScreen, gameConfig, playerState
- `createTextNode()`: safe DOM element factory
- `setNarrative()`: parses `**bold**` markdown into styled spans, appends to container

**JavaScript — Onboarding & Cartridges (lines 554-626)**
- `selectVibe()` / `selectDepth()`: toggle selection, update state
- `loadCartridges()`: fetches `/api/game/cartridges`, renders cartridge cards
- `loadCartridge(id)`: POSTs to `/api/game/cartridges/load`, launches game on success

**JavaScript — Interview Flow (lines 628-735)**
- `startInterview()`: POSTs to `/api/game/interview/start` with userId, depth, vibe
- `displayQuestion()`: routes responses to mirror bubble or question display, handles completion
- `submitAnswer()`: POSTs to `/api/game/interview/answer`
- `showMirrorBubble()` / `closeMirror()` / `expandMirror()`: therapeutic reflection UI with optional deeper exploration via `/api/game/interview/expand_mirror`

**JavaScript — Game Player (lines 737-884)**
- `onInterviewComplete()`: POSTs synthesis to `/api/game/generate`, launches game
- `launchGame()`: POSTs to `/api/game/play/start`, initializes game screen
- `handleGameAction()`: processes server response -- renders narrative, updates map/stats/choices/actions, triggers mirror moments and rest points
- `gameAction()`: POSTs to `/api/game/play/action` with action + target
- `renderMap()` / `renderActions()`: build map node strip and action chip bar
- `submitGameCommand()`: parses typed text commands into action + target
- `saveAndRest()`: POSTs to `/api/game/play/save`, returns to onboarding

**JavaScript — Transcript Engine (lines 901-981)**
- `logTranscript()`: appends typed/timestamped entries to in-memory array and DOM
- `renderTranscriptEntry()`: creates color-coded DOM elements per entry type
- `toggleTranscript()` / `exportTranscript()` / `clearTranscript()`: panel controls, JSON blob download

**JavaScript — Gemini Live Voice Engine (lines 983-1515)**
- IIFE module `voice` exposing `connect()`, `disconnect()`, `updateContext()`
- PCM helpers: `floatTo16BitPCM`, `arrayBufferToBase64`, `base64ToInt16`, `encodeChunk` -- convert between Float32, Int16, and Base64 for audio streaming
- `setOrbState()`: state machine driving orb CSS class and status text
- `buildSystemPrompt()`: assembles full game context (world, protagonist, companion, NPCs, locations, items, quests, live DOM stats) into a system instruction for Gemini
- `sendGameContext()`: pushes incremental state updates to Gemini mid-session
- `gameFunctions[]`: 10 function declarations (move, look, talk, take, use_item, choose, quest, status, inventory, save_game) sent as tools to Gemini
- `handleFunctionCall()`: dispatches Gemini tool calls to `/api/game/play/action` or `/api/game/play/save`, returns JSON for Gemini to narrate
- `scheduleAudioChunk()`: Web Audio API playback scheduler for streamed PCM audio
- `startMic()` / `stopMic()`: 16kHz mono mic capture via ScriptProcessor, streams Base64 PCM over WebSocket
- `connect()`: fetches API key from `/api/game/voice-config`, opens WebSocket to `generativelanguage.googleapis.com`, sends setup message with system prompt + tools + voice config (Aoede), handles audio/transcription/tool-call messages
- `disconnect()`: tears down mic, WebSocket, resets state
- `showScreen()`: screen switcher toggling `.active` class

**Connects to:**
- Backend API: `/api/game/cartridges`, `/api/game/cartridges/load`, `/api/game/interview/start`, `/api/game/interview/answer`, `/api/game/interview/expand_mirror`, `/api/game/generate`, `/api/game/play/start`, `/api/game/play/action`, `/api/game/play/save`, `/api/game/voice-config`
- Gemini Live WebSocket: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Google Fonts: Instrument Serif, DM Sans, JetBrains Mono

## External Dependencies Summary

### APIs

| API | Purpose |
|---|---|
| Backend REST (`/api/game/*`) | Serves cartridges, runs interview flow, generates game worlds, processes game actions, saves state |
| Gemini Live WebSocket | Real-time bidirectional voice: streams mic audio to Gemini, receives spoken audio + transcriptions + tool calls |
| `/api/game/voice-config` | Provides Gemini API key and model name to the client |
| Google Fonts | Loads Instrument Serif (Aria voice), DM Sans (UI), JetBrains Mono (game/code) |

### Browser APIs

| API | Purpose |
|---|---|
| Web Audio API (AudioContext) | Playback of streamed PCM audio chunks from Gemini at 24kHz |
| MediaDevices.getUserMedia | Mic capture at 16kHz mono for voice input |
| WebSocket | Persistent bidirectional connection to Gemini Live |
| Blob / URL.createObjectURL | JSON transcript export download |
