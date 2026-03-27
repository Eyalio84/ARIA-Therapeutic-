<!-- last-verified: 2026-03-27 -->

# su/ -- SU Lab Visual Logic Canvas

## Manifest

| Field | Value |
|-------|-------|
| **Library** | `src/components/su/` |
| **Purpose** | Voice-controlled visual canvas with logic programming, 12 object types, 8 logic block types, wire-based execution engine, Play/Pause mode, and 5 built-in tutorials |
| **Framework** | React 19 + Next.js 15 + Zustand |
| **Entry point** | `SUShell.tsx` (rendered at `/su` route) |
| **External dependencies** | `store/lab` (state), `lib/logicEngine` (execution), `lib/behaviorSync` (card sync), `lib/recipeRunner` + `lib/recipes/*` (tutorials), `lib/aria/engine` (voice), `store/gameVoice` (orb state), `lib/trainingLogger` (dataset capture) |
| **Component count** | 3 files (SUShell, LogicEditor, ColorPicker) |
| **Design language** | Dark theme, glassmorphism panels, mobile-first touch canvas |

## File Tree

```
su/
  SUShell.tsx       -- Main canvas: 95 voice functions, 12 object renderers, Play/Pause, tutorials (3376 lines)
  LogicEditor.tsx   -- Full-screen node editor: wire drawing, block config, port system (956 lines)
  ColorPicker.tsx   -- Hue slider + 8 preset swatches, used in config panels (81 lines)
```

## Component Index

---

<a id="SUShell"></a>
### SUShell.tsx

**The main SU Lab component. A voice-controlled visual canvas where users place objects, wire logic blocks, and build interactive applications. Handles all user interaction, voice function execution, object rendering, and tutorial playback.**

- **Voice engine**: ~97 voice functions in a single `handleFunction` switch statement. Functions grouped by: typed creation (12), properties (14), logic blocks (11), wiring (4), canvas (5), relations (4), animation (3), device (5), counter/slider/toggle/dropdown/timer commands, project save/load, undo/redo.
- **Object rendering**: `renderShape()` function dispatches to 12 object-type-specific renderers (shape, image, button, text, input, timer, container, slider, toggle, progress, dropdown, counter). Each renderer handles its own interactive behavior (slider thumb drag, counter +/- buttons, toggle tap, dropdown expand).
- **Play/Pause mode**: `playMode` state from store. In build mode: tap to select, drag to move, double-tap for config/text edit, selection borders, resize handles, bottom object bar. In play mode: objects locked, buttons fire wires, sliders slide, no config panels, no selection chrome.
- **Touch/drag system**: `handlePointerDown` (selection + drag start), `handlePointerMove` (object drag + resize handle drag), `handlePointerUp` (cleanup). Grid snap support. Play mode guard at top of handlePointerDown.
- **Tutorial system**: Recipe browser in action drawer (hamburger menu). Clears canvas, then executes recipe steps via `executeStep(step, handleFunction)`. Tutorial runner overlay shows progress bar, narration, explanation, and Next button.
- **Config panel**: Full-screen overlay for selected object. Shows object-specific fields (button label, slider min/max, dropdown options, etc.), behavior cards with WHEN/THEN dropdowns, and "Open Logic Editor" button.
- **Listener polling**: `useEffect` interval that snapshots object properties every 200ms, compares with previous snapshot, and fires `executeFromSource` for any changed properties that have active listeners.
- **Aria voice connection**: Connect/disconnect via the Aria orb button. Voice function calls route through `handleFunction`. Training logger captures every voice-to-function pair.
- **Auth gate**: PIN code entry (default "1234") before canvas access.

- **Connects to:** `store/lab` (all state), `lib/logicEngine` (executeFromSource, hasLogicWires), `lib/behaviorSync` (graphToBehaviors, behaviorToGraph, BEHAVIOR_PRESETS), `lib/recipeRunner` (executeStep, getAvailableRecipes), `lib/recipes` (initRecipes), `lib/aria/engine` (getAriaEngine), `store/gameVoice` (orb state), `lib/trainingLogger` (dataset capture), `./LogicEditor`, `./ColorPicker`

---

<a id="LogicEditor"></a>
### LogicEditor.tsx

**Full-screen node editor for visual wire programming. Displays objects as source/target nodes with typed ports, logic blocks as configurable processors, listeners as cyan watchers, and wires as SVG Bezier curves connecting ports.**

- **Port system**: `getOutputPorts(obj)` and `getInputPorts(obj)` return typed port definitions per object type. Ports are color-coded: green (boolean), blue (number), orange (string), gray (any).
- **Node rendering**: Three node types: `renderObjectNode` (source/target canvas objects with ports), `renderLogicBlockNode` (logic blocks with condition summary and color-coded by type), and listener nodes (cyan, shows watched property).
- **Wire drawing**: SVG path elements with cubic Bezier curves. `renderWires()` computes port positions from node positions and renders curved connections. Temporary wire follows pointer during drag-to-connect.
- **Wire creation**: `handlePortDown` starts drag from output port. `handleEditorPointerMove` updates temp wire endpoint. `handleEditorPointerUp` finds nearest compatible input port and creates wire via `addWire()`.
- **Tabbed add drawer**: Bottom sheet with "Blocks" and "Objects" tabs. Blocks tab: IF/ELSE, Compare, Math, Delay, Set Var, Get Var, Loop. Objects tab: all canvas objects as tappable targets.
- **Block config panel**: `renderConfigPanel()` — full-screen condition editor for IF/ELSE blocks. Shows input summary, output summary, condition dropdowns (left value, operator, right value), then/else action dropdowns (property, value), compound condition support (AND/OR), and natural language preview via `describeCondition()`.
- **Node dragging**: Nodes are draggable within the editor. `handleNodeDown` captures offset, pointer move updates position, pointer up releases.

- **Connects to:** `store/lab` (logicGraph CRUD, objects, addWire, deleteWire, updateLogicBlock, addListener, deleteListener), `lib/logicEngine` (describeCondition, describeBlock)

---

<a id="ColorPicker"></a>
### ColorPicker.tsx

**Pure presentational hue picker with a gradient slider (0-360) and 8 color preset buttons (Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink). No state, no side effects.**

- **Connects to:** Nothing external. Receives `hue` and `onChange` props from SUShell config panel.

---

## External Dependencies Summary

### Stores

| Store | Purpose |
|-------|---------|
| `store/lab` (useLabStore) | All canvas state: 12 object types, LogicGraph (nodes, listeners, wires, variables), selection, canvas settings, presets, playMode, undo history |
| `store/gameVoice` (`useGameVoiceStore`) | Aria voice orb state: connected, status, connecting |

### Libraries

| Library | Purpose |
|---------|---------|
| `lib/logicEngine` | Execution engine: `executeFromSource`, `evaluateBlock`, `hasLogicWires`, `describeCondition`, `describeBlock`. 8 block types including collision. |
| `lib/behaviorSync` | Bidirectional sync between Behavior cards and LogicGraph. `graphToBehaviors`, `behaviorToGraph`, `removeBehaviorFromGraph`, `BEHAVIOR_PRESETS`. |
| `lib/recipeRunner` | Tutorial step execution: `executeStep`, `getAvailableRecipes`, `registerRecipe`. Recipe/RunnerState types. |
| `lib/recipes` | 5 built-in tutorials: calculator, quiz, trafficLight, moodTracker, catchGame. `initRecipes()` registers all. |
| `lib/aria/engine` | `getAriaEngine()` — singleton Aria voice engine with connect/disconnect/function calling. |
| `lib/trainingLogger` | Auto-captures voice-to-function pairs for FunctionGemma fine-tuning dataset. |
| `lib/aria/persona` | `PersonaConfig` type for Aria personality configuration. |

### Backend API

| Endpoint | Method | Router | Purpose |
|----------|--------|--------|---------|
| `/api/termux/torch` | POST | termux | Toggle device flashlight on/off |
| `/api/termux/battery` | GET | termux | Read battery level |
| `/api/termux/notification` | POST | termux | Send device notification (title, content) |
| `/api/termux/volume` | POST | termux | Set music stream volume |
| `/api/termux/camera/photo` | POST | termux | Take photo and return as base64 data URL |
| `/api/termux/${bc.targetLabel}` | POST | termux | Dynamic behavior-card device actions |
| `/api/game/voice-config` | GET | game | Fetch Aria voice engine API key and connection config |
