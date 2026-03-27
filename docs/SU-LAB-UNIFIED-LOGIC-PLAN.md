# SU Lab — Unified Logic System Implementation Plan

**Created**: 2026-03-24
**Updated**: 2026-03-24 (Phase 1 refinements, Component Library addition)
**Goal**: Build enough pieces (objects, logic blocks, listeners, behavior cards) to actually construct small apps/games with SU Lab, then let real usage guide refinement.
**Approach**: Build toolkit → use toolkit → let friction guide next cycle.

### Key Vision Clarification (2026-03-24)

**Everything is composable from primitives.** There are no special "burger menu" or "search bar" object types. Instead:
- A search bar = horizontal shape + text input + button + wiring ("on button tap, read input value")
- A burger menu = button + container (visibility toggled) + text/button items inside
- A popup modal = overlay shape + content container + close button + visibility logic
- A document search = text input + button + logic block that composes a search action

**Components are saved groupings** of primitives + their logic wiring. When loaded, they act as a unit (shared group, moves together) but are **fully decomposable** — every piece is individually editable, removable, rewirable. Components are starting points, not constraints.

### Design Principle: Logic Editor for ALL Objects

The Logic Editor is NOT button-specific. ANY object can be a source node:
- Shape tapped → trigger logic
- Slider value changed → feed into math/compare
- Timer completed → trigger actions
- Input submitted → pass value to logic chain
- Container tapped → toggle children visibility

---

## Architecture: One Graph, Three Interfaces

```
┌──────────────────────────────────────────────────────────┐
│                    LogicGraph (Zustand)                    │
│  The single source of truth for ALL logic/behaviors       │
│  nodes: LogicBlock[] + Listener[]                         │
│  wires: Wire[]                                            │
│  behaviors: Behavior[] (card projections, auto-synced)    │
└──────────────┬──────────────┬──────────────┬─────────────┘
               │              │              │
        ┌──────┴──────┐ ┌────┴────┐ ┌───────┴───────┐
        │  Behavior   │ │  Node   │ │    Voice      │
        │  Cards      │ │  Graph  │ │    Commands   │
        │  (Tier 1-2) │ │(Tier 3) │ │  (all tiers)  │
        │  Dropdowns  │ │ Wires   │ │  Natural lang │
        │  Natural    │ │ Ports   │ │  → any tier   │
        │  language   │ │ Full    │ │               │
        └─────────────┘ └─────────┘ └───────────────┘
```

**Key principle**: Behavior cards and the node graph edit the SAME LogicGraph. Cards are a simplified projection. The graph is the full picture. Voice commands create entries in either.

---

## Voice Function Grouping (Consideration)

Current grouping: SHARED(7) + CANVAS(44) vs SHARED(7) + LOGIC(8)

**Potential alternative**: Group by INTENT rather than by view:
- **Creation**: add_object, add_text, add_button, add_timer, add_slider, add_logic_block
- **Wiring**: connect_wire, add_behavior, disconnect_wire
- **Configuration**: set_color, set_size, configure_logic, set_text
- **Query**: get_state, list_objects, show_logic_state
- **Control**: undo, redo, save_project, load_project

This could improve voice classification accuracy since semantically similar functions cluster together. **To be validated after Phase 3** — need enough pieces to test with.

---

## Phase 1: Fix Gaps (Foundation Polish)

**Goal**: Make existing features work reliably before adding new ones.

### 1A. Text In-Canvas Editing
**Current**: Text objects render content but can only be edited via config panel.
**Change**: Double-tap a text object → inline edit mode (contentEditable or textarea overlay positioned on the object). Tap outside or press Enter → commit. This mirrors how every design tool works (Figma, Canva).

**Files**: `SUShell.tsx` (add double-tap handler for text objects, render edit overlay)
**Store**: No changes needed — already has `textContent`, `fontSize`, `textAlign`

### 1B. Image Picker Fix
**Current**: Config panel has "Choose File" + "Camera" buttons — these already work! But the voice command `set_image` only accepts a URL string.
**Change**:
- The config panel file picker / camera is already functional (lines 1836-1868)
- Fix: add a "Gallery" button that shows recent images (store last 5 data URLs in localStorage)
- Fix: `set_image` voice command should accept "camera" or "gallery" as source argument, not just URL

**Files**: `SUShell.tsx` (enhance image config section, update set_image handler)

### 1C. Grouping Visual Indicator
**Current**: `groupId` exists on LabObject, `group_objects`/`ungroup_objects` voice commands exist, but no visual feedback on canvas.
**Change**: Objects with same `groupId` get a shared dashed border overlay (a positioned div behind the group). Group label shown above the bounding box.

**Files**: `SUShell.tsx` (add group overlay rendering in canvas)
**Store**: No changes — `groupId` already exists

### 1D. Undo Consistency Audit
**Current**: Some voice handlers call `_pushSnapshot()` but the guard at line 232 only skips undo/redo/get_state/list. Some operations inside handlers (like `updateObject`) don't push because the caller is expected to. This is correct but fragile.
**Change**: Audit all voice handlers. Ensure every mutating handler either:
  a) Is covered by the guard at line 232 (the default _pushSnapshot before switch), OR
  b) Has a comment explaining why it's skipped

**Files**: `SUShell.tsx` (audit + add missing snapshots if any)

---

## Phase 2: New Canvas Objects

**Goal**: Enough interactive objects to build real UIs.

### New ObjectType additions to the union:

```typescript
export type ObjectType =
  | "shape" | "image" | "button" | "text" | "input" | "timer"  // existing
  | "slider" | "toggle" | "progress" | "dropdown" | "counter"  // new
  | "container"                                                  // new (Phase 2B)
```

### 2A. Core Interactive Objects (5 new types)

**Slider**
- Visual: Horizontal track with draggable thumb
- Properties: `sliderMin` (default 0), `sliderMax` (default 100), `sliderValue` (default 50), `sliderStep` (default 1)
- Output ports: `value` (number)
- Input ports: `set_value` (number)
- Config: min/max/step fields
- Voice: `add_slider`, `set_slider_range`, `set_slider_value`

**Toggle (Switch)**
- Visual: iOS-style toggle switch
- Properties: `toggleState` (boolean, default false), `toggleLabel` (string)
- Output ports: `is_on` (boolean)
- Input ports: `set_on` (boolean)
- Config: label, default state
- Voice: `add_toggle`, `set_toggle`

**Progress Bar**
- Visual: Horizontal filled bar with percentage
- Properties: `progressValue` (0-100), `progressColor` (string)
- Output ports: `value` (number)
- Input ports: `set_progress` (number)
- Config: color, show percentage toggle
- Voice: `add_progress`, `set_progress`

**Dropdown (Select)**
- Visual: Tappable box showing selected value, expands to show options
- Properties: `dropdownOptions` (string[]), `dropdownSelected` (string)
- Output ports: `selected` (string), `index` (number)
- Input ports: `set_selected` (string)
- Config: options list editor (add/remove/reorder)
- Voice: `add_dropdown`, `set_options`, `select_option`

**Counter (Score Display)**
- Visual: Large number with optional label, +/- buttons
- Properties: `counterValue` (number, default 0), `counterLabel` (string), `counterStep` (default 1)
- Output ports: `value` (number)
- Input ports: `set_count` (number), `increment` (event), `decrement` (event)
- Config: label, step, initial value
- Voice: `add_counter`, `increment_counter`, `decrement_counter`, `reset_counter`

**Files to modify**:
- `store/lab.ts`: Add new fields to `LabObject` interface, new ObjectType values, default values in `addObject`
- `SUShell.tsx`: Add rendering for each new type in canvas, add config panel sections, add voice handlers
- `LogicEditor.tsx`: Update `getOutputPorts()` and `getInputPorts()` for new types

### 2B. Container Object

**Container/Group** — the critical missing piece for layouts:
- Visual: Dashed border rectangle, children render inside it
- Properties: `children` (string[] of object IDs), `layout` ("free" | "vertical" | "horizontal"), `padding` (number), `gap` (number)
- When objects are dragged into a container's bounds, they become children
- Children positions become relative to container
- Moving container moves all children
- Voice: `add_container`, `set_layout`

This is architecturally the biggest change because it introduces parent-child relationships into what is currently a flat object list. Implementation approach:
- Add `parentId: string | null` to LabObject (instead of a children array on container — simpler)
- Rendering: containers render first (lower z), children render inside with offset
- Drag: if object has parentId, coords are relative to parent

**Files**: `store/lab.ts`, `SUShell.tsx`

### 2C. Component Library (Save/Load Reusable Compositions)

**Components are saved fragments** — a subset of objects + their logic wiring, saved as named JSON.

**Save as Component**:
- Select a group or container → "Save as Component" button in config
- Saves: objects in group, their wires, their logic blocks, metadata (name, description, thumbnail)
- Stored in localStorage under `su_component_library`

**Component Library Browser**:
- Appears in the creation drawer alongside Shape, Image, Button, etc.
- Shows saved components with name + object count preview
- "Insert" loads the fragment: new IDs, shared groupId, offset positions

**Insert Component**:
- All objects get new IDs (avoid conflicts)
- All wires get remapped to new IDs
- Objects get a shared `groupId` so they move as a unit
- Positions offset to canvas center

**Decompose**:
- Ungroup the component → individual objects, all wiring intact
- Edit any piece, delete any piece, add new pieces
- Essentially: the component is gone, replaced by its parts — but the logic graph connections survive

**Built-in Starter Components** (future, after Phase 6 testing):
- Search Bar: input + button + wiring
- Burger Menu: button + toggle container + item list
- Modal Popup: overlay shape + content container + close button
- Toggle Panel: button + visibility-toggled container
- Counter Display: counter + increment/decrement buttons

**Files**: `store/lab.ts` (component CRUD), `SUShell.tsx` (library browser in creation drawer, save button in config)

---

## ☎️ PAUSE — Phone Test Phase 1+2

Test on device:
- [ ] Tap selected text to edit inline
- [ ] Image gallery + camera viewfinder flow
- [ ] Group visual indicators
- [ ] Each new object type: create, configure, interact
- [ ] Container: drag objects in/out, move container
- [ ] Undo/redo across all new operations
- [ ] All new voice commands

---

## Phase 3: Logic System Expansion

**Goal**: Enough logic primitives to express real application behavior.

### 3A. New Logic Block Types

Current LogicBlock only supports IF/ELSE with a single condition. Expand:

```typescript
// Expand Condition type
export type ConditionType = "if_else" | "compare" | "math" | "delay" | "loop" | "set_variable" | "get_variable"

export interface Condition {
  type: ConditionType
  // IF/ELSE (existing)
  test?: { left: ValueRef; operator: CompareOp; right: ValueRef }
  thenAction?: LogicAction
  elseAction?: LogicAction | null
  // MATH
  mathOp?: "add" | "subtract" | "multiply" | "divide" | "modulo" | "random"
  mathLeft?: ValueRef
  mathRight?: ValueRef
  // DELAY
  delayMs?: number
  // LOOP
  loopType?: "repeat" | "while"
  loopCount?: ValueRef
  loopCondition?: { left: ValueRef; operator: CompareOp; right: ValueRef }
  // VARIABLE
  variableName?: string
  variableValue?: ValueRef
}
```

**Compare Block** (dedicated, cleaner than embedding in IF)
- Inputs: A (any), B (any)
- Output: result (boolean)
- Config: operator dropdown (==, !=, >, <, >=, <=, contains)
- Color: green (boolean output)

**Math Block**
- Inputs: A (number), B (number)
- Output: result (number)
- Config: operation dropdown (+, -, ×, ÷, %, random between)
- Color: blue (number output)

**Delay Block**
- Input: trigger (event)
- Output: trigger (event, fires after delay)
- Config: milliseconds slider (100-10000)
- Color: yellow (temporal)

**Set Variable / Get Variable**
- Variables stored in LogicGraph: `variables: Record<string, any>`
- Set: input value → stores in named variable
- Get: outputs current value of named variable
- Config: variable name (text input), dropdown of existing vars
- Color: dark orange (like Scratch)

**Loop Block** (Tier 3 — advanced)
- Repeat N times: counter input, body wires, completed wire
- While condition: condition input, body wires, completed wire
- Color: orange (control flow)
- Cycle prevention: existing MAX_DEPTH=20 handles this

### 3B. Logic Editor Node Colors

Apply consistent color scheme (inspired by Scratch + Unreal research):

| Block Type | Color | Hex |
|------------|-------|-----|
| IF/ELSE | Orange | #f97316 |
| Compare | Green | #22c55e |
| Math | Blue | #3b82f6 |
| Delay | Yellow | #eab308 |
| Variable | Dark Orange | #c2410c |
| Loop | Orange-Red | #ea580c |
| Listener | Cyan | #06b6d4 |

### 3C. Compound Conditions (AND/OR)

Extend the test expression to support compound:

```typescript
interface CompoundTest {
  logic: "and" | "or"
  conditions: Array<{ left: ValueRef; operator: CompareOp; right: ValueRef }>
}
```

IF block can use either a single test or a CompoundTest. UI: "Add condition" button that appends to the array, with AND/OR toggle.

### 3D. Enhanced Port System

Current ports are hardcoded per object type. Make them dynamic:

```typescript
function getOutputPorts(obj: LabObject): PortDef[] {
  switch (obj.objectType) {
    case "button": return [
      { name: "click", type: "event", direction: "out" },
      { name: "toggle_state", type: "boolean", direction: "out" },
    ]
    case "slider": return [
      { name: "value", type: "number", direction: "out" },
      { name: "changed", type: "event", direction: "out" },
    ]
    case "toggle": return [
      { name: "is_on", type: "boolean", direction: "out" },
      { name: "changed", type: "event", direction: "out" },
    ]
    case "input": return [
      { name: "value", type: "string", direction: "out" },
      { name: "submitted", type: "event", direction: "out" },
    ]
    case "timer": return [
      { name: "remaining", type: "number", direction: "out" },
      { name: "tick", type: "event", direction: "out" },
      { name: "completed", type: "event", direction: "out" },
    ]
    case "counter": return [
      { name: "value", type: "number", direction: "out" },
      { name: "changed", type: "event", direction: "out" },
    ]
    case "dropdown": return [
      { name: "selected", type: "string", direction: "out" },
      { name: "index", type: "number", direction: "out" },
      { name: "changed", type: "event", direction: "out" },
    ]
    // shapes, text, image — property outputs
    default: return [
      { name: "value", type: "any", direction: "out" },
    ]
  }
}
```

Add "event" as a port type (purple, fires once then done — different from continuous values).

**Files to modify**:
- `store/lab.ts`: Expand Condition type, add variables to LogicGraph
- `lib/logicEngine.ts`: Add evaluation for new block types (math, delay, variable, loop)
- `LogicEditor.tsx`: New block renderers, color scheme, compound condition UI, enhanced port system
- `SUShell.tsx`: Voice commands for new block types

---

## ☎️ PAUSE — Phone Test Phase 3

Test on device:
- [ ] Create Math block, wire Slider → Math(×2) → Progress Bar
- [ ] Create Compare block, wire Input → Compare(>10) → IF/ELSE → Toggle
- [ ] Delay block: Button tap → Delay(1000ms) → set color
- [ ] Variables: Set var on Button tap, Get var on another Button tap
- [ ] Compound conditions: IF (A > 5 AND B < 10) THEN...
- [ ] All new voice commands for logic blocks
- [ ] Complex chain: Slider → Math → Compare → IF/ELSE → multiple targets

---

## Phase 4: Listeners (Reactive System)

**Goal**: Objects can react to property changes without explicit button presses.

### 4A. Listener Node Type

```typescript
export interface ListenerNode {
  id: string
  label: string
  x: number
  y: number
  // What to watch
  watchObjectId: string
  watchProperty: string  // "value", "opacity", "color", "timerRunning", etc.
  // When to fire
  triggerType: "on_change" | "on_threshold" | "on_interval"
  // Threshold config (only for on_threshold)
  thresholdOperator?: CompareOp
  thresholdValue?: number | string
  // Interval config (only for on_interval)
  intervalMs?: number
}
```

**Visual**: Cyan-colored node with an "eye" icon. Shows what it's watching.
**Ports**:
- Output: `current_value`, `previous_value`, `fired` (event)

**Trigger types**:
- `on_change`: Fires whenever the watched property changes to any new value
- `on_threshold`: Fires when property crosses a threshold (e.g., slider > 50)
- `on_interval`: Fires every N ms with current value (polling)

### 4B. Listener Integration

Add to LogicGraph:
```typescript
export interface LogicGraph {
  nodes: LogicBlock[]
  listeners: ListenerNode[]
  wires: Wire[]
  variables: Record<string, any>
}
```

The execution engine watches for property changes via a `useEffect` in SUShell that compares previous/current objects. When a listened property changes, it fires the listener's output wires through the same `executeFromSource` pipeline.

### 4C. Listener Voice Commands

```
"add a listener on Slider A's value"  → add_listener({ object: "A", property: "value" })
"watch when Counter B reaches 10"     → add_listener({ object: "B", property: "value", trigger: "threshold", op: ">=" value: 10 })
"remove listener on Timer C"          → delete_listener({ object: "C" })
```

**Files**:
- `store/lab.ts`: Add ListenerNode type, listeners array to LogicGraph
- `lib/logicEngine.ts`: Add listener evaluation, property change detection
- `LogicEditor.tsx`: Listener node rendering (cyan), config panel
- `SUShell.tsx`: Listener voice commands, property change watcher useEffect

---

## ☎️ PAUSE — Phone Test Phase 4

Test on device:
- [ ] Listener on Slider value → changes Progress Bar in real-time
- [ ] Threshold listener: when Counter > 10, change background color
- [ ] on_change listener: when Dropdown selection changes, update Text
- [ ] Chain: Listener → Logic Block → multiple targets
- [ ] Remove/reconfigure listeners
- [ ] Voice commands for listeners

---

## Phase 5: Behavior Cards (The Accessibility Layer)

**Goal**: Non-coders can create interactions without seeing the node graph.

### 5A. Behavior Data Model

```typescript
export interface Behavior {
  id: string
  // What triggers this behavior
  trigger: {
    type: "tap" | "change" | "threshold" | "timer_end" | "app_start"
    sourceObjectId: string
    property?: string        // for "change" / "threshold"
    operator?: CompareOp     // for "threshold"
    value?: any              // for "threshold"
  }
  // Optional condition
  condition?: {
    left: ValueRef
    operator: CompareOp
    right: ValueRef
  } | null
  // What happens
  actions: Array<{
    targetObjectId: string
    property: string
    value: ValueRef
  }>
  // Metadata
  label: string              // Auto-generated: "When Button tapped, set Square color"
  createdVia: "card" | "graph" | "voice"
}
```

### 5B. Behavior ↔ LogicGraph Sync

**Card → Graph**: When user creates/edits a behavior card:
1. Create source wire from trigger object
2. Create LogicBlock if condition exists
3. Create action wires to target objects
4. Tag the generated nodes/wires with `behaviorId` so they can be tracked

**Graph → Card**: When user edits the graph directly:
- Simple patterns (single source → optional logic → single/multiple targets) auto-generate a card representation
- Complex patterns (chained blocks, loops, variables) show as "Advanced behavior — open in Logic Editor" with a summary string from `describeCondition()`

**Conflict resolution**: If a behavior card can't represent what's in the graph (user added complexity manually), the card becomes read-only with an "Edit in Graph" button. The card never hides or overwrites graph complexity.

### 5C. Behavior Card UI

Located in each object's config panel, new "Behaviors" tab:

```
┌─ Behaviors on [Square B] ─────────────────┐
│                                            │
│ ┌─ When Button A tapped ──────────────┐   │
│ │ WHEN  [Button A ▼] is [tapped ▼]    │   │
│ │ THEN  [set color ▼] to [red ▼]      │   │
│ │                          [Edit] [×]  │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ ┌─ When Slider C changes ─────────────┐   │
│ │ WHEN  [Slider C ▼] [changes ▼]      │   │
│ │ THEN  [set opacity ▼] to [value ▼]  │   │
│ │                          [Edit] [×]  │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ ┌─ Advanced (edited in graph) ────────┐   │
│ │ IF input == 1 THEN set color...     │   │
│ │ 2 blocks · 3 wires  [Open Graph]    │   │
│ └──────────────────────────────────────┘   │
│                                            │
│ [ + Add Behavior ]                         │
│                                            │
│ ┌──────────────────────────────────────┐   │
│ │     Open Logic Editor (Advanced)     │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### 5D. Preset Behaviors (One-Tap Templates)

When adding a behavior, offer presets:
- **"Make it a toggle"** → adds: When [this] tapped, IF visible THEN hide ELSE show
- **"Make it a counter"** → adds: When [this] tapped, increment counter
- **"Link to slider"** → adds: When [Slider] changes, set [this] opacity to value
- **"Color from dropdown"** → adds: When [Dropdown] changes, set [this] color to selected
- **"Timer trigger"** → adds: When [Timer] completes, set [this] animation to bounce

### 5E. Behavior Voice Commands

New function group — BEHAVIOR functions (loaded in all contexts):
```
"when button A is tapped, set square B's color to red"
  → create_behavior({ trigger: {type:"tap", source:"A"}, action: {target:"B", property:"color", value:"red"} })

"add a behavior: when slider C changes, set progress D to its value"
  → create_behavior({ trigger: {type:"change", source:"C"}, action: {target:"D", property:"progressValue", value:"input"} })

"remove the tap behavior on button A"
  → delete_behavior({ source: "A", trigger: "tap" })
```

**Files**:
- `store/lab.ts`: Add Behavior type, behaviors array, CRUD actions, sync logic
- `SUShell.tsx`: Behavior card UI in config panel, preset behaviors, voice commands
- `lib/logicEngine.ts`: No changes — behaviors compile down to existing LogicGraph primitives
- New file: `lib/behaviorSync.ts` — bidirectional sync between Behavior[] and LogicGraph

---

## ☎️ PAUSE — Phone Test Phase 5

Test on device:
- [ ] Create behavior card: "When Button tapped, set Square color to red"
- [ ] Open Logic Editor — see the auto-generated wires from that card
- [ ] Edit in Logic Editor — card updates or shows "Advanced"
- [ ] Use preset: "Make it a toggle" — verify it works
- [ ] Create behavior via voice command
- [ ] Multiple behaviors on one object
- [ ] Delete behavior from card — verify wires removed from graph

---

## Phase 6: Build & Learn (The Real Test)

**Goal**: Build 3-5 small apps with the toolkit, document every friction point.

### Test App 1: Simple Calculator
- 2 Input fields (number type)
- 4 Buttons (+, -, ×, ÷)
- 1 Text display (result)
- Logic: Button tap → Math block (Input A [op] Input B) → set Text

### Test App 2: Quiz Game
- Text object (question)
- 3 Buttons (answer choices)
- Counter (score)
- Logic: Correct button → increment counter, wrong → show "Try again" text

### Test App 3: Traffic Light
- 3 Circles (red/yellow/green, stacked in container)
- 1 Button (next)
- Logic: Button tap → cycle through states using variable + compare + IF/ELSE

### Test App 4: Mood Tracker (Therapeutic)
- Slider (mood 1-10)
- Text (mood label: "Great!", "Okay", "Rough")
- Progress bar (weekly average)
- Timer (breathing exercise)
- Logic: Slider → Compare → IF chains for label, Listener on timer complete

### Test App 5: Simple Platformer-ish
- Shape (player, controlled by buttons)
- 4 Buttons (up/down/left/right)
- Container (play area with boundary)
- Shapes (obstacles)
- Logic: Button → move player, Listener on position → collision detection

### Document:
- Every time you think "I can't do X" — that's a gap
- Every time something takes 5+ taps when it should take 1 — that's UX friction
- Every time you forget how to do something — that's a discoverability problem
- Every time the voice command doesn't parse — that's a classification gap

---

## Summary: File Change Map

| Phase | Files Modified | Files Created |
|-------|---------------|---------------|
| 1 | SUShell.tsx, (minor) store/lab.ts | — |
| 2 | store/lab.ts, SUShell.tsx, LogicEditor.tsx | — |
| 3 | store/lab.ts, logicEngine.ts, LogicEditor.tsx, SUShell.tsx | — |
| 4 | store/lab.ts, logicEngine.ts, LogicEditor.tsx, SUShell.tsx | — |
| 5 | store/lab.ts, SUShell.tsx | lib/behaviorSync.ts |
| 6 | (based on findings) | (test project JSON files) |

**Total new object types**: 6 (slider, toggle, progress, dropdown, counter, container)
**Total new logic block types**: 5 (compare, math, delay, variable, loop)
**Total new node types**: 1 (listener)
**New concept**: Behaviors (accessible card layer over LogicGraph)
