<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# templates/ — Start Here

> Read this first. Jump to [templates.md](templates.md) or [templates.ctx](templates.ctx) only for the component you need.

| Component | What it is | templates.md | templates.ctx |
|---|---|---|---|
| **game.html** | Self-contained single-page therapeutic narrative game client -- handles onboarding, interview, game play, voice interaction via Gemini Live, and session transcript logging. All HTML, CSS, and JS in one file. | [game.html](templates.md#game.html) | game_html subgraph |
| **Onboarding** | Landing screen with vibe selection cards, depth selector, and demo cartridge picker | [game.html](templates.md#game.html) | onboarding node |
| **Interview** | Guided question flow with progress bar, mirror bubbles for therapeutic reflection, and exit ramps | [game.html](templates.md#game.html) | interview node |
| **Game Player** | Core gameplay screen: narrative rendering, map nodes, stats bar, quest choices, action chips, and text command input | [game.html](templates.md#game.html) | game node |
| **Voice Engine** | Gemini Live WebSocket IIFE module: mic capture at 16kHz, PCM audio playback at 24kHz, function-calling for game actions, orb state machine | [game.html](templates.md#game.html) | voiceEngine node |
| **Transcript Engine** | In-memory session logger with color-coded panel UI, JSON export, and clear functionality | [game.html](templates.md#game.html) | transcriptEngine node |
| **Rest Overlay** | Pause overlay offering continue or save-and-quit during game rest points | [game.html](templates.md#game.html) | restOverlay node |
