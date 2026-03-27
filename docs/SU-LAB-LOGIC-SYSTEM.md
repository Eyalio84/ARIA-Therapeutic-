# SU Lab -- Visual Logic System Reference

**Author**: Eyal Nof (vision, architecture) + Claude Opus 4.6 (implementation)
**Date**: March 25, 2026
**Status**: Production -- 5 working tutorials, 95 voice functions, 8 logic block types
**Replaces**: SU-LAB-VISUAL-LOGIC-ARCHITECTURE.md, LOGIC-PROTOTYPE-IMPLEMENTATION-PLAN.md, SU-LAB-UNIFIED-LOGIC-PLAN.md

---

## 1. Overview

The SU Lab Visual Logic System transforms a voice-controlled canvas into a **visual programming environment** running on Android/mobile. Users build interactive applications by placing objects on a canvas, creating logic blocks, and connecting them with wires. The system supports a Play/Pause mode that separates building from using.

Five end-to-end tutorials demonstrate the system: Calculator, Quiz Game, Traffic Light, Mood Tracker, and Catch Game with collision detection.

**Core principle**: Objects don't know about each other. Logic blocks are pure processors. Wires define all relationships. This is MVC made visual, reactive programming made tangible.

---

## 2. Architecture

### Single Source of Truth

```
LogicGraph (Zustand store, persisted)
  nodes: LogicBlock[]      -- 8 block types
  listeners: ListenerNode[] -- reactive watchers
  wires: Wire[]            -- directional connections
  variables: Record<string, any>
```

### Three Interfaces to the Same Graph

| Interface | Audience | Access |
|-----------|----------|--------|
| Behavior Cards | Non-coders | WHEN/THEN dropdowns in config panel |
| Node Graph (Logic Editor) | Intermediate | Full-screen wire editor |
| Voice Commands | All users | "connect button to counter" |

### Execution Chain

```
User interaction (button tap, slider drag)
  --> executeFromSource(objectId, value, graph, objects, updateObject)
    --> finds all wires FROM this object
    --> for each wire target:
        if target is LogicBlock --> evaluateBlock(block, value)
          --> block computes output
          --> executeFromSource(block.id, result)  // recurse
        if target is Counter --> increment by counterStep, propagate
        if target is regular Object --> updateObject, propagate
```

### Play/Pause Mode

| Build Mode (default) | Play Mode |
|----------------------|-----------|
| Tap to select, drag to move | Objects locked in place |
| Double-tap opens config/text edit | No config, no text edit |
| Selection borders, resize handles | Clean app feel |
| Bottom object chips, debug list | Hidden |
| Logic editor accessible | Blocked |
| Undo/redo visible | Hidden |

Toggle button in top bar: `PLAY` (green) / `BUILD` (gray).

---

## 3. Object Types (12)

| Type | Visual | Key Properties | Wire Output |
|------|--------|---------------|-------------|
| `shape` | Circle/square/triangle | x, y, width, height, color, opacity | Properties only |
| `image` | Background-image container | imageSrc | Properties only |
| `button` | Gradient label, tap fires | buttonLabel, toggleState, style | Oneshot: sends buttonLabel. Toggle: sends 0/1 |
| `text` | Rendered text content | textContent, fontSize, textAlign | Properties only |
| `input` | Text/number entry field | inputValue, inputType, placeholder | inputValue |
| `timer` | Countdown display | timerDuration, timerElapsed, timerRunning | timerElapsed |
| `container` | Parent with children via parentId | containerLayout, containerPadding, containerGap | Properties only |
| `slider` | Track + draggable thumb | sliderMin, sliderMax, sliderValue, sliderStep | sliderValue (fires executeFromSource on drag) |
| `toggle` | iOS-style switch | toggleState, toggleLabel | toggleState (0/1) |
| `progress` | Horizontal fill bar | progressValue, progressColor | progressValue |
| `dropdown` | Expandable options list | dropdownOptions, dropdownSelected | dropdownSelected |
| `counter` | Large number with +/- buttons | counterValue, counterLabel, counterStep | counterValue |

All objects share: id, label, x, y, width, height, opacity, color, hue, shape, zIndex, groupId, animation, animSpeed, orbitTarget, outputValue.

---

## 4. Logic Block Types (8)

| Type | Color | Purpose | Input | Output |
|------|-------|---------|-------|--------|
| `if_else` | Orange | Conditional branch | Any value | thenAction value or elseAction value |
| `compare` | Green | Boolean comparison | Any value | true/false |
| `math` | Blue | Arithmetic (+, -, x, /, %, random) | Number (or reads from object property via mathLeft) | Computed number |
| `delay` | Yellow | setTimeout wrapper | Any value | Same value after N ms |
| `set_variable` | Dark Orange | Store value in named variable | Any value | Stored value |
| `get_variable` | Dark Orange | Read named variable | Any trigger | Variable value |
| `loop` | Orange-Red | Repeat N times or while condition | Any trigger | Loop index (0, 1, 2...) |
| `collision` | Red | Proximity check between two objects | Any trigger | 1 on hit (also repositions objectB randomly) |

### LogicBlock Data Model

```typescript
interface LogicBlock {
  id: string
  label: string
  x: number; y: number
  blockType: LogicBlockType
  condition: Condition | null
  // Math
  mathOp?: "add" | "subtract" | "multiply" | "divide" | "modulo" | "random"
  mathLeft?: ValueRef    // reads from object property
  mathRight?: ValueRef
  // Delay
  delayMs?: number
  // Variable
  variableName?: string
  variableValue?: ValueRef
  // Loop
  loopType?: "repeat" | "while"
  loopCount?: number
  // Collision
  collisionObjectA?: string  // object ID
  collisionObjectB?: string  // object ID
  collisionThreshold?: number // pixels
}
```

### ValueRef System

```typescript
type ValueRef =
  | { type: "input" }                                        // wire input value
  | { type: "constant"; value: number | string | boolean }   // literal
  | { type: "property"; objectId: string; property: string } // live read
  | { type: "variable"; name: string }                       // graph variable
```

### Condition System

```typescript
interface Condition {
  type: "if_else"
  test: { left: ValueRef; operator: CompareOp; right: ValueRef }
  thenAction: { property: string; value: ValueRef }
  elseAction: { property: string; value: ValueRef } | null
  compound?: { logic: "and" | "or"; extra: Array<{ left: ValueRef; operator: CompareOp; right: ValueRef }> }
}
```

---

## 5. Wire System

### Wire Data Model

```typescript
interface Wire {
  id: string
  fromNodeId: string  // object ID or logic block ID
  fromPort: string    // "out" (default)
  toNodeId: string    // logic block ID or object ID
  toPort: string      // "in" (default), or property name like "opacity", "textContent", "x", "y"
}
```

### Special Port Behaviors

| Port | Target Type | Behavior |
|------|------------|----------|
| `counterValue` | Counter | Increment by counterStep (not set) |
| `counterIncrement` | Counter | Increment by counterStep |
| `opacity` | Any object | Set opacity directly |
| `textContent` | Text object | Set displayed text |
| `hue` | Any object | Set color hue (recalculates HSL) |
| `x`, `y` | Any object | Set position |
| `progressValue` | Progress bar | Set fill percentage |
| `in` | Logic block | Passes value to evaluateBlock |

### Object Propagation

After ANY object property is set via a wire, `executeFromSource` fires from that object. This enables reactive chains -- e.g., after Player.y changes, a collision block wired from Player triggers automatically.

---

## 6. Execution Engine

### executeFromSource (entry point)

```
For each wire FROM sourceId:
  if target is a LogicBlock --> evaluateBlock(block, value)
  if target is a Counter --> increment, propagate
  if target is regular Object --> set property, propagate from object
```

### evaluateBlock (block evaluation)

Each block type computes an output value, then calls `executeFromSource(block.id, result)` to propagate. This ensures downstream logic blocks are properly **evaluated**, not skipped.

**Critical fix (March 25, 2026)**: The original code called `executeFromSource(wire.toNodeId, result)` which propagated FROM the target block without evaluating it. This caused the math block's raw output to flow directly to objects, skipping all IF/ELSE conditions. The fix: each block calls `executeFromSource(block.id, result)` which routes through the standard wire handling, properly evaluating any downstream logic blocks.

### Collision Block Evaluation

```
1. Read objectA and objectB positions from objects array
2. Compute center-to-center distance (|ax - bx| and |ay - by|)
3. If both < threshold:
   a. Reposition objectB to random position
   b. executeFromSource(block.id, 1) -- propagates "hit" signal
```

### Counter Increment Semantics

When a wire targets a counter's `counterValue` or `counterIncrement` port, the counter always increments by `counterStep` (default 1). It never sets the raw wire value. After incrementing, the new value propagates through the counter's output wires.

### Cycle Prevention

MAX_DEPTH = 20. Each recursive call to executeFromSource increments depth. Exceeding 20 halts propagation silently.

---

## 7. Tutorial System

### Recipe Runner

Recipes are ordered lists of steps. Each step has a title, narration, explanation, and an array of `{ fn, args }` actions executed via `handleFunction()`. Actions run sequentially with 400ms delays (500ms after creation actions).

```typescript
interface RecipeStep {
  step: number
  title: string
  aria_says: string       // narration text
  actions: RecipeAction[] // { fn: string, args: Record<string, any> }
  explain: string         // educational context
  pause?: boolean         // wait for user "Next"
}
```

The tutorial browser (hamburger menu --> Tutorials) clears the canvas before starting.

### 5 Tutorials

| Tutorial | Difficulty | Objects | Logic | Key Pattern |
|----------|-----------|---------|-------|-------------|
| Calculator | Beginner | 2 inputs, 4 buttons, 1 text, 1 counter | Math block (from property refs) | read-compute-write: math reads Input.inputValue, computes, writes to display |
| Quiz Game | Beginner | 1 text, 3 buttons, 1 counter, 1 text | Counter increment, text wire | Oneshot buttons send label text; only correct answer wired to counter |
| Traffic Light | Intermediate | 3 circles, 1 text, 1 button, 1 counter | Modulo math, 6 IF/ELSE blocks | State machine: counter mod 3 drives light opacities + status text |
| Mood Tracker | Intermediate | 1 slider, 2 texts, 1 progress, 1 circle | 2 math blocks (x10, x12), 4 IF/ELSE | Fan-out: one slider drives progress (scaled), orb hue (scaled), mood word (waterfall) |
| Catch Game | Intermediate | 2 circles, 4 buttons, 1 counter | 4 math blocks (position), 1 collision | Movement: button --> math(Player.y - 20) --> Player.y; collision auto-detects proximity |

### Patterns Learned from Tutorials

- **Modulo state machine**: Counter --> Math(mod N) --> N IF/ELSE blocks --> targets. Used in traffic light.
- **Waterfall override**: Multiple IF blocks check overlapping ranges (<=10, <=7, <=5, <=3), wired broadest-first. Last match wins. Used in mood tracker.
- **Read-compute-write**: Math block reads live property (mathLeft: {type:"property"}), computes, writes result. Used in calculator and catch game movement.
- **Text-only IF**: IF blocks with thenAction but NO elseAction -- only fires when condition matches. Used for status text in traffic light.
- **Fan-out**: One source (slider) feeds multiple pipelines through separate math blocks. Used in mood tracker.

---

## 8. Voice Function Inventory (~95 functions)

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
| Slider/Toggle/Progress/Dropdown | 5 | set_slider_value, set_toggle, set_progress, set_options, select_option |
| Timer | 3 | start_timer, stop_timer, reset_timer |
| Behaviors | 2 | create_behavior, list_behaviors |
| Canvas | 5 | zoom_canvas, set_background, toggle_grid, snap_to_grid, set_layer |
| Relations | 4 | align_objects, group_objects, ungroup_objects, distribute_evenly |
| Animation | 3 | animate, stop_animation, orbit |
| Config/Nav | 5 | open_config, close_config, edit_shape, done_editing, open_logic_editor, close_logic_editor |
| Project | 4 | save_preset, load_preset, save_project, load_project, export_layout |
| Device | 5 | toggle_torch, check_battery, send_notification, set_volume, clipboard_copy |
| Undo | 2 | undo, redo |

---

## 9. Lessons Learned (March 25, 2026 Debugging Session)

### Button Output Semantics
Oneshot buttons should send their `buttonLabel` text on every tap (impulse signal). Toggle buttons send 0/1. The old code sent toggle 0/1 for ALL buttons, making quiz answers meaningless.

### Counter Increment vs Set
Any wire to a counter's `counterValue` or `counterIncrement` port ALWAYS increments by `counterStep`. The raw wire value is ignored. Without this, quiz score would be set to "56" (the button label) instead of incrementing by 1.

### Logic Block Chaining Bug
`evaluateBlock` must call `executeFromSource(block.id, result)` -- not `executeFromSource(target.id, result)`. The old pattern propagated FROM the target block without evaluating it, causing the traffic light to send raw modulo values (0, 1, 2) directly to opacity instead of routing through IF/ELSE conditions.

### Slider Propagation
The slider's canvas drag handler updated `sliderValue` in the store but never called `executeFromSource`. Sliders appeared to change but their wires never fired. Fixed by adding `executeFromSource` after every slider value update.

### Object Propagation
After any object property is set via wire, `executeFromSource` must fire from that object. Without this, the catch game's collision block never triggered -- Player's position changed but nothing checked for collisions.

### Color Handling
`set_color("black")` produced red because "black" wasn't in COLOR_MAP and `parseInt("black") || 0` gave hue 0. Fixed by special-casing black (`hsl(0,0%,10%)`), white (`hsl(0,0%,90%)`), and gray (`hsl(0,0%,40%)`).

### Recipe Completeness
Tutorials that say "add IF/ELSE blocks yourself" don't work as tutorials. Every recipe must wire the complete experience end-to-end. "Do it yourself" is a design doc, not a tutorial.

---

## 10. Future Roadmap

### Near-Term (from today's insights)

| Feature | Rationale |
|---------|-----------|
| Audit all interactive objects for wire propagation | Input, timer, toggle, dropdown may have the same bug as slider -- value changes but executeFromSource not called |
| Timer completion event | When timer reaches 0, fire through output wires. Enables "breathing timer done --> show message" |
| Boundary checking blocks | IF x < 0 THEN set x = 0. Essential for catch game and any position-based app |
| Random position block | Reusable block (not collision-internal). "Randomize Target position within bounds" |
| Recipe auto-play-mode | Automatically enter Play mode when tutorial completes step 9/10 |
| Text input wire propagation | Type in input field --> value flows through wires to logic blocks |

### Medium-Term (from original architecture plans)

| Feature | Description |
|---------|-------------|
| Component Library | Save/load reusable object+wire compositions as named JSON. Insert with new IDs. Decomposable. Built-in starters: search bar, modal, toggle panel. |
| Value Bus | Named pub/sub channels to reduce wire spaghetti. Multiple producers, multiple consumers, one named channel. |
| Enhanced Port System | Typed ports (boolean, number, string, event) with compatibility checking. Color-coded in Logic Editor. |
| Context-Aware Config | Logic block config adapts to connected types: boolean input shows 0/1, slider shows range comparison. |
| Wire Animation | Animated flow dots on wires showing data direction. Color-coded by data type. |
| Undo in Logic Editor | Currently undo works on canvas but not within Logic Editor interactions. |

### Long-Term (from original vision)

| Feature | Description |
|---------|-------------|
| React Export | Walk LogicGraph, generate JSX + useState + useEffect. Objects become components, wires become props/state, IF/ELSE becomes ternary, listeners become useEffect. |
| FunctionGemma Training | Expand training dataset with logic commands. Fine-tune on connect_wire, configure_logic, add_math_block patterns. |
| Custom Block Types | User-defined logic blocks with custom evaluation functions. |
| FOR Loops | Iterate over a range, executing body wires for each value. |
| Multi-Output Logic Blocks | Single block producing different values on different output ports. |
| Intent-Based Voice Grouping | Group functions by intent (creation, wiring, configuration, query) instead of by view (canvas vs logic). May improve voice classification accuracy. |

---

## 11. Design Principles

1. **Objects don't know about each other.** All relationships exist in the LogicGraph as wires.
2. **Logic blocks are pure.** Input value --> condition --> output value. No side effects beyond what they emit through wires.
3. **Listeners are passive.** They watch but don't modify. They emit observations that flow through wires to logic blocks.
4. **Wires are the program.** The graph structure IS the application logic.
5. **What you see is what runs.** The node editor and behavior cards are not representations of code -- they ARE the code.
6. **Voice-first, touch-second.** Every operation is achievable by voice. Touch provides precision.
7. **Composability from primitives.** No special "search bar" or "burger menu" types. A search bar = input + button + wiring. Components are saved compositions of primitives.
8. **Tutorials must be complete.** Every tutorial must work end-to-end without requiring the user to add missing pieces.

---

## 12. File Map

| File | Lines | Purpose |
|------|-------|---------|
| `src/store/lab.ts` | ~650 | Data model: 12 object types, LogicGraph, CRUD, undo, persistence |
| `src/components/su/SUShell.tsx` | ~3200 | Canvas rendering, 95 voice functions, Play/Pause mode, tutorial UI |
| `src/components/su/LogicEditor.tsx` | ~600 | Node editor: wiring, blocks, config |
| `src/lib/logicEngine.ts` | ~330 | Execution engine: executeFromSource, evaluateBlock, 8 block types |
| `src/lib/recipeRunner.ts` | ~110 | Tutorial runner: step execution, delays |
| `src/lib/recipes/calculator.ts` | ~125 | Calculator tutorial |
| `src/lib/recipes/quiz.ts` | ~125 | Quiz game tutorial |
| `src/lib/recipes/trafficLight.ts` | ~155 | Traffic light tutorial |
| `src/lib/recipes/moodTracker.ts` | ~120 | Mood tracker tutorial |
| `src/lib/recipes/catchGame.ts` | ~135 | Catch game tutorial with collision |
| `src/lib/recipes/index.ts` | ~17 | Recipe registry |
| `src/lib/behaviorSync.ts` | ~320 | Bidirectional behavior card <-> LogicGraph sync |

---

*Architecture by Eyal Nof. Implementation March 23-25, 2026.*
*"Objects don't know about each other. Logic blocks don't know about the UI. Wires define all relationships."*
