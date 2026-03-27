# Aria Game Engine — Session Progression Report
**Author**: Eyal Nof
**Date**: March 21-22, 2026
**Duration**: ~12 hours

---

## Starting Point (Morning, March 21)

- A 1,525-line vanilla JavaScript game.html
- 3 pre-built game cartridges (Maya/Ren/Ash)
- Broken voice orb (wrong WebSocket format)
- No persistence, no React, no observability
- Text-only gameplay

---

## Progression Timeline

### Hour 1-2: Voice Connection Fixed
- **Problem**: WebSocket used `config` key with camelCase
- **Discovery**: Analyzed working tal-boilerplate → key must be `setup` with snake_case
- **Fix**: Blob → `.text()` conversion for browser WebSocket messages
- **Result**: Aria speaks for the first time through the game

### Hour 3: Rich Voice Integration
- Upgraded system prompt: full NPC details, locations, items, quests, companion
- Added 13 voice commands (drawer control, awareness, companion)
- Live context injection via `client_content` silent messages
- Total voice commands: 23

### Hour 4-5: React/Next.js Migration
- Discovered existing React/Next.js frontend in the project
- Migrated 1,525-line vanilla JS to 42 React components
- Created 5 Zustand stores, typed API wrapper, AriaCore integration
- Full-screen immersive `/game` route
- 4 per-game theme presets (default/maya/ren/ash)

### Hour 5-6: Transcript + DevHub
- Clean therapeutic transcript (user/aria/game events only)
- Ported RingBufferLogger (500 entries) + CommandAuditTrail (200 records)
- Built 5-tab DevHub: Logs, Voice, Game State, Commands, Config
- Three-tier logging: Transcript (therapeutic) → DevHub (operational) → Audit (functions)

### Hour 6-7: Game Drawer (Journal)
- Left-side 80% overlay with dimmed backdrop, slide animation
- React Flow map with custom circle nodes (glow/fog states)
- Emoji inventory grid (3 columns, tap to inspect, Use button)
- Quest journal (active/completed)
- Companion panel (emoji avatar, bond hearts)
- Collapsible sections with chevron toggle

### Hour 7-8: Menus + Access Layers
- Burger menu (☰): profile, theme switcher, save, exit
- Aria panel (✨): voice selection, personality sliders, NPC presets, connection status
- 3-layer access model: Player (drawer+burger) → User (aria panel) → Admin (devhub+transcript)
- 5-control top bar: ☰ Title T3 📖 ✨ 📄 </>

### Hour 8-9: Persistence (Unified Snapshots)
- Per-user SQLite at `data/users/{user_id}/game.db`
- 3 tables: saves, transcripts, aria_context
- Unified snapshot system: backend is single source of truth
- Full round-trip verified: inventory, visited locations, quest progress, NPC interactions all preserved
- Auto-save every 5 turns
- Stable user ID via localStorage
- Load Game in burger menu (mid-game resume)

### Hour 9-10: Dual Mode + Slash Commands
- Aria dual mode: Game (storyteller) vs Super User (Jarvis)
- 3 activation methods: `/aria-su` command, voice "super user mode", AriaPanel button
- 14 slash commands: /aria-su, /aria-game, /save, /look, /map, /inventory, /quest, /hint, /recap, /theme, /export, /status, /help
- Visual mode indicator: pulsing "SU" badge, purple send button
- Mode-aware input placeholder

### Hour 10-11: Aria Platform Separation
- Extracted Aria platform layer: `src/lib/aria/` (engine + persona)
- AriaEngine: domain-agnostic voice AI engine (connects any persona to AriaCore)
- PersonaConfig: swappable behavior configs (system prompt + functions + voice + handler)
- SU persona extracted to `src/lib/aria/su/` (removable)
- Game adapter reduced from 750 lines to 280 lines
- Per-cartridge narrator config: Maya=Leda(gentle), Ren=Charon(deep), Ash=Kore(noir)

### Hour 11-12: Termux API Integration (Phase 1 — Jarvis Upgrade)
- Built `backend/services/termux_service.py` — async wrapper for 25+ termux commands
- Built `backend/services/device_state.py` — cached device state with 30s polling
- Built `backend/routers/termux.py` — 15 API endpoints at `/api/termux/*`
- Added 11 new SU voice functions for device control
- Device-adaptive system prompt (battery/temp/RAM/WiFi affects Aria's behavior)
- All verified: battery, torch, vibrate, notifications, clipboard, volume, WiFi, RAM, CPU temp

---

## Complete Voice Command Registry

### Game Mode (23 commands)

**Core Gameplay (10)**:
| Command | Description |
|---------|------------|
| `move(direction)` | Navigate to a location |
| `look()` | Describe current location |
| `talk(npc_name)` | Talk to an NPC (Aria voices them in character) |
| `take(item)` | Pick up an item |
| `use_item(item)` | Use an item from inventory |
| `choose(choice_id)` | Make a quest choice |
| `quest()` | Show quest status |
| `status()` | Show player stats |
| `inventory()` | List items |
| `save_game()` | Save to SQLite |

**Drawer Control (4)**:
| Command | Description |
|---------|------------|
| `open_journal()` | Open drawer |
| `close_journal()` | Close drawer |
| `show_map()` | Open to map section |
| `show_inventory()` | Open to inventory section |

**Game Awareness (5)**:
| Command | Description |
|---------|------------|
| `where_am_i()` | Atmospheric location description |
| `who_is_here()` | Voice NPCs at current location |
| `what_can_i_do()` | Suggest available actions naturally |
| `hint()` | Gentle atmospheric quest hint |
| `recap()` | Story-so-far summary |

**Companion (3)**:
| Command | Description |
|---------|------------|
| `talk_to_companion()` | Companion reacts in character |
| `how_is_companion()` | Describe companion's mood/bond |
| `switch_to_su()` | Enter Super User mode |

### Super User Mode (23 commands)

**Panel Control (5)**:
| Command | Description |
|---------|------------|
| `open_devhub()` | Open DevHub |
| `open_transcript()` | Open transcript |
| `open_aria_settings()` | Open Aria panel |
| `open_journal()` | Open drawer |
| `open_burger_menu()` | Open settings |

**Configuration (2)**:
| Command | Description |
|---------|------------|
| `switch_theme(theme)` | Change visual theme |
| `save_game()` | Save game state |

**Diagnostics (4)**:
| Command | Description |
|---------|------------|
| `show_game_state()` | Full state dump |
| `show_errors()` | Recent errors from dev log |
| `show_audit_trail()` | Voice command history with timing |
| `export_transcript()` | Export session JSON |

**Device Control (11)** — NEW:
| Command | Termux API | Description |
|---------|-----------|------------|
| `device_status()` | aggregated | Battery %, CPU temp, RAM, WiFi |
| `battery_check()` | `termux-battery-status` | Detailed battery info |
| `toggle_torch(on)` | `termux-torch` | Flashlight on/off |
| `set_volume(stream, value)` | `termux-volume` | Set media/ring/alarm volume |
| `vibrate(duration_ms)` | `termux-vibrate` | Haptic feedback |
| `send_notification(title, content)` | `termux-notification` | Android notification |
| `clipboard_read()` | `termux-clipboard-get` | Read clipboard |
| `clipboard_write(text)` | `termux-clipboard-set` | Write to clipboard |
| `wifi_info()` | `termux-wifi-connectioninfo` | Network details |
| `location_check()` | `termux-location` | GPS coordinates |
| `open_url(url)` | `termux-open-url` | Open in browser |

**Mode (1)**:
| Command | Description |
|---------|------------|
| `switch_to_game()` | Return to game mode |

### Slash Commands (14)

| Command | Mode | Action |
|---------|------|--------|
| `/aria-su` | Game | Enter Super User mode |
| `/aria-game` | SU | Return to Game mode |
| `/save` | Both | Full game save |
| `/look` | Game | Look around |
| `/map` | Game | Open drawer to map |
| `/inventory` | Game | Open drawer to inventory |
| `/quest` | Game | Show quest status |
| `/hint` | Game | Get atmospheric hint |
| `/recap` | Game | Story-so-far summary |
| `/theme [name]` | Both | Switch theme |
| `/export` | Both | Download transcript JSON |
| `/status` | Both | Show player stats |
| `/help` | Both | List available commands |

---

## Total Command Count: 46 voice + 14 slash = 60 commands

---

## Architecture Summary

```
Aria Platform Layer (src/lib/aria/)
├── engine.ts              AriaEngine — domain-agnostic voice AI orchestrator
├── persona.ts             PersonaConfig type + persona registry
└── su/                    Super User persona (extractable)
    ├── suFunctions.ts     23 SU function declarations
    └── suPersona.ts       SU handler + device-adaptive prompt

AriaCore (src/lib/aria-core/)
├── providers/geminiLive.ts    WebSocket to Gemini Live API
├── audio/micCapture.ts        16kHz microphone capture
├── audio/playbackScheduler.ts 24kHz gapless audio playback
├── audio/pcmHelpers.ts        PCM encoding/decoding
└── devhub/                    RingBufferLogger + CommandAuditTrail

Game Layer (src/lib/)
├── gameAriaAdapter.ts     Game persona creator + voice wiring (280 lines)
├── gameApi.ts             Typed API wrapper (15 endpoints)
└── gameDevLogger.ts       Singleton logger instances

Backend (backend/)
├── services/
│   ├── game_generator.py      Interview → GameConfig
│   ├── game_interview.py      Therapeutic interview flow
│   ├── game_runtime.py        Game state engine (PlayerState, actions)
│   ├── persistence.py         Per-user SQLite (saves, transcripts, aria_context)
│   ├── termux_service.py      Async Termux API wrapper (25+ commands)   [NEW]
│   ├── device_state.py        Cached device state with polling           [NEW]
│   └── therapy_service.py     Therapy KG management
├── routers/
│   ├── game.py                15 game API endpoints
│   ├── termux.py              15 Termux API endpoints                    [NEW]
│   └── therapy.py             Therapy endpoints
└── data/
    ├── prebuilt_games.py      3 cartridges with narrator configs
    └── users/{user_id}/game.db  Per-user SQLite database

Frontend (src/components/game/)  — 44 components
├── screens/         5 screen components
├── gameplay/        8 gameplay components
├── onboarding/      5 onboarding components (incl. SaveCard)
├── interview/       5 interview components
├── transcript/      5 transcript components
├── voice/           2 voice components
├── drawer/          7 drawer components
├── menu/            2 menu components (BurgerMenu, AriaPanel)
├── devpanel/        2 DevHub components
├── shared/          2 shared components
└── GameShell.tsx    Screen router + theme provider

Stores — 7 game-specific
├── game.ts          Game state, player stats, screen routing
├── gameVoice.ts     Voice orb state
├── transcript.ts    Therapeutic transcript
├── gameTheme.ts     4 theme presets + CSS variables
├── ariaMode.ts      Game vs SU mode
├── devLog.ts        Dev log store (legacy, replaced by RingBufferLogger)
└── (lib/gameDevLogger.ts — singleton RingBufferLogger + CommandAuditTrail)
```

---

## Per-Game Narrator Config

| Cartridge | Voice | Style | Atmosphere |
|-----------|-------|-------|-----------|
| Maya | Leda (gentle) | "speaks like reading a picture book — simple words, vivid images, pauses for awe" | oceanic, bioluminescent, dreamlike |
| Ren | Charon (deep) | "speaks like a ship's log narrator — technical words mixed with loneliness" | sci-fi, metallic hums, distant static |
| Ash | Kore (clear) | "noir narration — short sentences, dry observations, philosophical asides" | rain-soaked, fog, neon reflections, jazz piano |

---

## Device Control Verified (Termux API)

| Capability | Endpoint | Tested |
|-----------|----------|--------|
| Battery status | GET /api/termux/battery | ✅ 94%, 34.1C, GOOD |
| Device state (aggregated) | GET /api/termux/device-state | ✅ All fields populated |
| Flashlight toggle | POST /api/termux/torch | ✅ On/off confirmed |
| Vibration | POST /api/termux/vibrate | ✅ 200ms vibration felt |
| Android notification | POST /api/termux/notification | ✅ "Aria Jarvis" notification appeared |
| Clipboard read | GET /api/termux/clipboard | ✅ Content returned |
| Volume control | GET /api/termux/volume | ✅ All streams returned |
| WiFi info | GET /api/termux/wifi | ✅ Signal/SSID returned |
| CPU temperature | /sys/class/thermal/zone0 | ✅ 41C direct read |
| RAM | /proc/meminfo | ✅ 810MB / 7358MB |

---

## Key Technical Decisions Made Today

1. **React over Vue** — project already had React/Next.js with AriaCore, React Flow, Zustand
2. **`setup` + snake_case** for Gemini Live raw WebSocket (not `config` + camelCase)
3. **Blob → .text()** for browser WebSocket messages
4. **Three-tier logging** — Transcript (therapeutic) / DevHub (operational) / Audit (functions)
5. **Backend as single source of truth** — unified snapshots for save/load
6. **Per-user SQLite** — clean data separation for future multi-user
7. **Persona system** — AriaEngine runs any PersonaConfig, game/SU/future are all personas
8. **SU is extractable** — delete `su/` folder, game keeps working
9. **Device-adaptive prompt** — Aria changes behavior based on battery/temp/RAM
10. **Per-cartridge narrator** — different Gemini voice + personality per game

---

## Files Created/Modified Today

### New Files (35)
```
Backend:
  backend/services/termux_service.py        Termux API wrapper
  backend/services/device_state.py          Cached device state
  backend/services/persistence.py           Per-user SQLite
  backend/routers/termux.py                 Termux API endpoints
  backend/data/prebuilt_games.py            3 cartridges + narrator configs

Frontend (lib):
  src/lib/aria/engine.ts                    AriaEngine class
  src/lib/aria/persona.ts                   PersonaConfig type
  src/lib/aria/su/suFunctions.ts            23 SU function declarations
  src/lib/aria/su/suPersona.ts              SU handler + device-adaptive prompt
  src/lib/gameAriaAdapter.ts                Game persona creator (rewritten)
  src/lib/gameApi.ts                        Typed API wrapper
  src/lib/gameDevLogger.ts                  Singleton logger instances

Frontend (stores):
  src/store/game.ts                         Game state store
  src/store/gameVoice.ts                    Voice orb state
  src/store/transcript.ts                   Therapeutic transcript
  src/store/gameTheme.ts                    Theme presets
  src/store/ariaMode.ts                     Dual mode state

Frontend (components — 44 .tsx files):
  src/components/game/GameShell.tsx
  src/components/game/screens/*.tsx          (5 screens)
  src/components/game/gameplay/*.tsx          (8 gameplay)
  src/components/game/onboarding/*.tsx        (5 onboarding)
  src/components/game/interview/*.tsx         (5 interview)
  src/components/game/transcript/*.tsx        (5 transcript)
  src/components/game/voice/*.tsx             (2 voice)
  src/components/game/drawer/*.tsx            (7 drawer)
  src/components/game/menu/*.tsx              (2 menu)
  src/components/game/devpanel/*.tsx           (2 devhub)
  src/components/game/shared/*.tsx            (2 shared)
  src/app/game/page.tsx                      Next.js route

Types:
  src/types/game.ts                          19 TypeScript interfaces

Documentation:
  src/components/game/COMPONENTS.md          Living component registry
  context-packets/SESSION-2026-03-21_16-31.md
  context-packets/SESSION-2026-03-21_20-18.md
  docs/ARIA-VOICE-ASSISTANT-REFERENCE.md
  backend/SESSION-2026-03-21-PLAN.md
```

### Modified Files (8)
```
  src/app/globals.css                       Game animations added
  src/app/layout.tsx                        Google Fonts added
  src/lib/aria-core/providers/geminiLive.ts  Blob fix
  backend/routers/game.py                   Unified snapshot endpoints
  backend/serve_game.py                     Termux router + device polling
  backend/templates/game.html               Voice engine (vanilla backup)
  .env.local                                NEXT_PUBLIC_GAME_API added
```
