# Logic Prototype — Implementation Plan

**Date**: March 23, 2026
**Goal**: First working Visual Logic System in SU Lab
**Scope**: Button → Logic Block → Object (toggle visibility), expandable architecture
**Estimated effort**: ~3-4 hours of focused implementation

---

## 1. What We're Building

The minimum viable logic system where a user can:

1. Tap a button on canvas → open config → tap "Logic" button
2. Full-screen node editor opens showing the button node
3. Tap "+" → add a Logic Block
4. Drag a wire from button's output to logic block's input
5. Double-tap logic block → configure: IF value==1 THEN visible ELSE invisible
6. Drag a wire from logic block's output to a target object
7. Close editor → tap button on canvas → target object toggles visibility

That's the end-to-end flow. Once this works, everything else (WHILE, FOR, listeners, buses) is the same pattern with more condition types.

---

## 2. User Flow — Step by Step with Visuals

### Step 1: Canvas View (existing)

```
┌──────────────────────────────────────────┐
│  LAB  B1 button  (4) DBG  Game  Dash    │
├──────────────────────────────────────────┤
│                                          │
│   ┌────────────────┐                     │
│   │   Square F     │                     │
│   │   (yellow)     │                     │
│   │                │                     │
│   └────────────────┘                     │
│                                          │
│          ┌──────────────┐                │
│          │  Toggle  B1  │                │
│          │   [Tap Me]   │                │
│          └──────────────┘                │
│                                          │
│                                          │
│  B1: (150,400) 100x44 button             │
│  F: (30,100) 180x160 square              │
├──────────────────────────────────────────┤
│  [ F ]  [ B1 ]  [ + ]           (Aria)  │
└──────────────────────────────────────────┘
```

User double-taps B1 → config panel opens.

### Step 2: Config Panel — New "Logic" Button

```
┌────────────────────────────────────┐
│  ● Configure                close  │
├────────────────────────────────────┤
│                                    │
│  NAME                              │
│  ┌──────────────────────────────┐  │
│  │ B1                           │  │
│  └──────────────────────────────┘  │
│                                    │
│  Position    (150, 400)            │
│  Size        100 x 44px           │
│  Type        button                │
│  Style       toggle                │
│                                    │
│  BUTTON LABEL                      │
│  ┌──────────────────────────────┐  │
│  │ Tap Me                       │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  ⚡ Open Logic Editor        │  │
│  │                              │  │
│  │  1 logic block · 1 wire      │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────┐  ┌──────────┐       │
│  │ Duplicate │  │  Delete  │       │
│  └──────────┘  └──────────┘       │
└────────────────────────────────────┘
```

**Key change**: The old button config (target type, target, action, style dropdowns) is **replaced** by a single "Open Logic Editor" button. Below it: a summary of what's wired ("1 logic block · 1 wire" or "No logic configured").

User taps "Open Logic Editor" → full-screen node editor.

### Step 3: Node Editor — Empty State (first time)

```
┌──────────────────────────────────────────┐
│  ← Back              Logic Editor   [+]  │
├──────────────────────────────────────────┤
│                                          │
│                                          │
│                                          │
│   ┌─────────────┐                        │
│   │ 🔘 Button B1│                        │
│   │             │                        │
│   │    ● out    │                        │
│   │   (toggle)  │                        │
│   └─────────────┘                        │
│                                          │
│                                          │
│         Tap [+] to add a                 │
│         Logic Block                      │
│                                          │
│                                          │
│                                          │
│                                          │
│                                    [+]   │
└──────────────────────────────────────────┘
```

The node editor shows the source object (Button B1) automatically. Its output port `● out (toggle)` is visible. No wires yet.

### Step 4: Add Logic Block via [+]

User taps [+] → bottom drawer:

```
┌──────────────────────────────────────────┐
│            Add to Logic Graph            │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │  ┌──────────┐  ┌──────────┐       │  │
│  │  │   ⬡      │  │   ⚡     │       │  │
│  │  │  Logic   │  │ Listener │       │  │
│  │  │  Block   │  │  (later) │       │  │
│  │  └──────────┘  └──────────┘       │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Listener is grayed out (Phase C). User taps "Logic Block" → a new node appears on the canvas:

### Step 5: Logic Block Added — Ready for Wiring

```
┌──────────────────────────────────────────┐
│  ← Back              Logic Editor   [+]  │
├──────────────────────────────────────────┤
│                                          │
│   ┌─────────────┐    ┌─────────────┐    │
│   │ 🔘 Button B1│    │ ⬡ Logic 1   │    │
│   │             │    │             │    │
│   │    ● out ───────→ ○ in        │    │
│   │   (toggle)  │    │             │    │
│   └─────────────┘    │   ● out ────────→ ?
│                      │  (action)   │    │
│                      └─────────────┘    │
│                                          │
│                                          │
│   Objects on canvas:                     │
│   ┌──────┐ ┌──────┐ ┌──────┐           │
│   │  A   │ │  C   │ │  F   │  ...      │
│   └──────┘ └──────┘ └──────┘           │
│                                          │
│                                    [+]   │
└──────────────────────────────────────────┘
```

**Wire creation**: User drags from `● out` on Button B1 to `○ in` on Logic 1. The wire appears as a curved line. Color-coded green (boolean).

**Target selection**: Logic 1's `● out` needs a target. User drags from Logic 1's `● out` to one of the canvas objects listed at the bottom (or drags to an object node if already on the editor).

The object bar at the bottom shows all canvas objects as tappable targets. Tap "F" → Square F appears as a node:

### Step 6: Fully Wired — Before Logic Configuration

```
┌──────────────────────────────────────────┐
│  ← Back              Logic Editor   [+]  │
├──────────────────────────────────────────┤
│                                          │
│   ┌─────────────┐    ┌─────────────┐    │
│   │ 🔘 Button B1│    │ ⬡ Logic 1   │    │
│   │             │    │  (no config) │    │
│   │    ● out ══════→ ○ in        │    │
│   │   (toggle)  │    │             │    │
│   └─────────────┘    │   ● out ═══════╗ │
│                      │             │  ║ │
│                      └─────────────┘  ║ │
│                                       ║ │
│                      ┌─────────────┐  ║ │
│                      │ ■ Square F  │  ║ │
│                      │             │  ║ │
│                      │ ○ opacity ←════╝ │
│                      │ ○ color     │    │
│                      │ ○ visible   │    │
│                      │ ○ animation │    │
│                      └─────────────┘    │
│                                    [+]   │
└──────────────────────────────────────────┘
```

Three nodes wired: Button B1 → Logic 1 → Square F (opacity port).

Logic 1 shows "(no config)" — needs configuration. User double-taps Logic 1.

### Step 7: Logic Block Config Panel

```
┌──────────────────────────────────────────┐
│  ← Back to Graph      Logic 1    [Save]  │
├──────────────────────────────────────────┤
│                                          │
│  INPUT                                   │
│  ● value (boolean) from Button B1        │
│                                          │
│  OUTPUT                                  │
│  → Square F . opacity                    │
│                                          │
│  ─────────────────────────────────       │
│                                          │
│  CONDITION                               │
│                                          │
│  ┌──────┐  ┌────────┐  ┌────┐  ┌────┐   │
│  │  IF  │  │ value  │  │ == │  │  1 │   │
│  └──────┘  └────────┘  └────┘  └────┘   │
│                                          │
│  ┌──────┐  set ┌─────────┐  to ┌─────┐  │
│  │ THEN │      │ opacity │     │ 1.0 │  │
│  └──────┘      └─────────┘     └─────┘  │
│                                          │
│  ┌──────┐  set ┌─────────┐  to ┌─────┐  │
│  │ ELSE │      │ opacity │     │ 0.0 │  │
│  └──────┘      └─────────┘     └─────┘  │
│                                          │
│  ─────────────────────────────────       │
│                                          │
│  [+ Add Condition]                       │
│                                          │
│  ─────────────────────────────────       │
│  Preview:                                │
│  "When B1 is ON → F visible"             │
│  "When B1 is OFF → F invisible"          │
└──────────────────────────────────────────┘
```

**Context-aware elements**:
- "INPUT: value (boolean)" — knows it's connected to a toggle button, shows boolean options
- "OUTPUT: Square F . opacity" — knows the target and property
- The IF condition defaults to `value == 1` (most common for boolean)
- THEN/ELSE actions default to the connected property (opacity) with sensible values
- "Preview" at the bottom shows a human-readable summary

**The condition blocks are tappable dropdowns**:
- Tap `IF` → can't change (it's the base condition type for MVP)
- Tap `value` → dropdown: value (from input), constant, property (of another object)
- Tap `==` → dropdown: ==, !=, >, <, >=, <=
- Tap `1` → number input or boolean toggle (context-aware: shows 0/1 for boolean)
- Tap `opacity` in THEN → dropdown of target's properties: opacity, color, size, visible, animation
- Tap `1.0` → number input (range depends on property: 0-1 for opacity, 0-360 for hue, etc.)

User configures, taps [Save] → returns to node editor.

### Step 8: Configured — Ready to Use

```
┌──────────────────────────────────────────┐
│  ← Back              Logic Editor   [+]  │
├──────────────────────────────────────────┤
│                                          │
│   ┌─────────────┐    ┌─────────────┐    │
│   │ 🔘 Button B1│    │ ⬡ Logic 1   │    │
│   │             │    │ IF val==1   │    │
│   │    ● out ══════→ ○ THEN: 1.0  │    │
│   │   (toggle)  │    │  ELSE: 0.0  │    │
│   └─────────────┘    │   ● out ═══════╗ │
│                      └─────────────┘  ║ │
│                                       ║ │
│                      ┌─────────────┐  ║ │
│                      │ ■ Square F  │  ║ │
│                      │ ○ opacity ←════╝ │
│                      └─────────────┘    │
│                                          │
│  ✓ Logic configured                      │
│  "B1 ON → F visible, B1 OFF → F hidden" │
│                                    [+]   │
└──────────────────────────────────────────┘
```

Logic 1 now shows a summary of its condition. The status bar confirms the logic is configured.

User taps "← Back" → returns to canvas.

### Step 9: Canvas — It Works

User taps Button B1 on the canvas:
- Button emits value = 1 (toggle ON)
- Execution engine finds wire: B1.out → Logic 1.in
- Logic 1 evaluates: IF 1 == 1 → THEN → set opacity 1.0
- Engine finds wire: Logic 1.out → Square F.opacity
- Square F opacity set to 1.0 → React re-renders → Square F visible

User taps Button B1 again:
- Button emits value = 0 (toggle OFF)
- Logic 1 evaluates: IF 0 == 1 → ELSE → set opacity 0.0
- Square F opacity set to 0.0 → invisible

**It works.**

---

## 3. Data Model

### New Types

```typescript
// ── Logic Graph (lives in useLabStore) ──

interface LogicGraph {
  nodes: LogicNode[]
  wires: Wire[]
}

type LogicNode = LogicBlock  // for MVP. Later: EventListener, ValueBus

interface LogicBlock {
  id: string
  label: string
  x: number              // position in node editor
  y: number
  condition: Condition
}

interface Condition {
  type: "if_else"         // MVP only supports IF/ELSE
  test: {
    left: ValueRef
    operator: "==" | "!=" | ">" | "<" | ">=" | "<="
    right: ValueRef
  }
  thenAction: Action
  elseAction: Action | null
}

type ValueRef =
  | { type: "input" }                          // value from input wire
  | { type: "constant"; value: number | string | boolean }
  | { type: "property"; objectId: string; property: string }

interface Action {
  property: string        // target property to set: "opacity", "color", "visible", etc.
  value: ValueRef
}

interface Wire {
  id: string
  fromNodeId: string      // object ID or logic block ID
  fromPort: string        // "out", "then_out", etc.
  toNodeId: string        // logic block ID or object ID
  toPort: string          // "in", "opacity", "color", etc.
}
```

### Store Changes

```typescript
// Added to useLabStore
interface LabStore {
  // ... existing fields
  logicGraph: LogicGraph

  // Logic CRUD
  addLogicBlock: () => string
  deleteLogicBlock: (id: string) => void
  updateLogicBlock: (id: string, updates: Partial<LogicBlock>) => void

  // Wire CRUD
  addWire: (wire: Omit<Wire, "id">) => string
  deleteWire: (id: string) => void

  // Execution
  executeLogic: (sourceObjectId: string, outputValue: any) => void
}
```

### Object Changes

```typescript
// Added to LabObject
interface LabObject {
  // ... existing fields

  // Output ports (what this object emits)
  outputValue: any          // current output value (0/1 for toggle, number for slider, etc.)
}
```

The existing `buttonConfig` is **kept for backward compatibility** but the config panel shows the Logic Editor button instead of inline dropdowns. When logic blocks exist for a button, the execution engine uses them instead of `buttonConfig`.

---

## 4. New Components

### Component Tree

```
SUShell.tsx (existing, modified)
├── renderShape() — modified: button tap calls executeLogic()
├── ConfigPanel — modified: shows "Open Logic Editor" for buttons
│
├── LogicEditor.tsx (NEW — full-screen panel)
│   ├── LogicEditorHeader — back button, title, [+] button
│   ├── NodeCanvas — pannable/zoomable area
│   │   ├── ObjectNode — renders an object reference (ports, label)
│   │   ├── LogicBlockNode — renders a logic block (ports, summary)
│   │   └── WireRenderer — SVG curved lines between ports
│   ├── ObjectBar — bottom bar showing all canvas objects as targets
│   └── AddNodeDrawer — bottom sheet: Logic Block / Listener (grayed)
│
├── LogicBlockConfig.tsx (NEW — condition editor)
│   ├── InputSummary — shows what's connected as input
│   ├── OutputSummary — shows target object and property
│   ├── ConditionEditor — IF/THEN/ELSE with tappable blocks
│   │   ├── ValueSelector — dropdown for value source
│   │   ├── OperatorSelector — dropdown for ==, !=, >, <, etc.
│   │   ├── PropertySelector — dropdown for target property
│   │   └── ValueInput — number/string/boolean input
│   └── PreviewSummary — human-readable condition description
│
└── logicEngine.ts (NEW — execution logic)
    ├── executeFromSource() — trace wires, evaluate conditions, apply actions
    ├── evaluateCondition() — resolve ValueRefs, compare
    └── applyAction() — set object property via store
```

### File List

| File | Type | Purpose |
|------|------|---------|
| `src/components/su/LogicEditor.tsx` | New | Full-screen node editor with wires |
| `src/components/su/LogicBlockConfig.tsx` | New | Condition editor (IF/THEN/ELSE) |
| `src/lib/logicEngine.ts` | New | Execution engine (evaluate + apply) |
| `src/store/lab.ts` | Modified | Add LogicGraph, CRUD methods, executeLogic |
| `src/components/su/SUShell.tsx` | Modified | Button tap → executeLogic, config panel "Logic" button |

---

## 5. Node Editor — Rendering Details

### Node Rendering

Each node is a draggable div in the editor:

```
Object Node (source):                Object Node (target):
┌─────────────────────┐              ┌─────────────────────┐
│ 🔘 Button B1        │              │ ■ Square F          │
│                     │              │                     │
│          ● out ─────               │ ○ opacity     ←────
│        (boolean)    │              │ ○ color             │
└─────────────────────┘              │ ○ visible           │
                                     │ ○ size              │
                                     │ ○ animation         │
                                     └─────────────────────┘

Logic Block Node:
┌─────────────────────┐
│ ⬡ Logic 1           │
│ IF val==1            │
│ THEN: opacity 1.0    │
│ ELSE: opacity 0.0    │
│                     │
│ ○ in          ● out │
└─────────────────────┘
```

**Port circles**:
- `●` (filled) = output port
- `○` (hollow) = input port
- Green = boolean
- Blue = number
- Orange = string

### Wire Rendering

Wires are SVG `<path>` elements with cubic Bezier curves:

```
● ──────────╮
            │
            ╰──────── ○
```

Calculated as:
```typescript
const dx = endX - startX
const path = `M ${startX} ${startY} C ${startX + dx/2} ${startY}, ${endX - dx/2} ${endY}, ${endX} ${endY}`
```

Color matches the data type. Animated dots flow along the path when data is being transmitted (optional, nice to have).

### Port Interaction

**Creating a wire**:
1. User touches and holds an output port `●`
2. A temporary wire follows the finger
3. User drags to a compatible input port `○`
4. Release → wire snaps into place
5. Incompatible ports (wrong type) show red and reject

**Deleting a wire**:
1. Long press on a wire
2. Wire highlights red
3. Confirm delete (or just release to cancel)

### Dragging Nodes

Nodes are draggable within the editor canvas. Touch and drag on the node header moves it. Wires follow (recalculate Bezier endpoints).

---

## 6. Execution Engine

### The Core Loop

```typescript
// src/lib/logicEngine.ts

function executeFromSource(
  sourceId: string,
  outputValue: any,
  graph: LogicGraph,
  objects: LabObject[],
  updateObject: (id: string, updates: Partial<LabObject>) => void,
  depth: number = 0
) {
  // Prevent infinite loops
  if (depth > 20) return

  // Find all wires FROM this source
  const outWires = graph.wires.filter(w => w.fromNodeId === sourceId)

  for (const wire of outWires) {
    const targetNode = graph.nodes.find(n => n.id === wire.toNodeId)
    const targetObject = objects.find(o => o.id === wire.toNodeId)

    if (targetNode && targetNode.type === "logic") {
      // Evaluate logic block
      const result = evaluateCondition(targetNode.condition, outputValue, objects)
      if (result.action) {
        // Find output wires from this logic block
        const actionWires = graph.wires.filter(w => w.fromNodeId === targetNode.id)
        for (const aw of actionWires) {
          // Apply action to target object
          const resolved = resolveValue(result.action.value, outputValue, objects)
          updateObject(aw.toNodeId, { [result.action.property]: resolved })
        }
      }
    } else if (targetObject) {
      // Direct wire to object (no logic block) — set property directly
      updateObject(targetObject.id, { [wire.toPort]: outputValue })
    }
  }
}

function evaluateCondition(
  condition: Condition,
  inputValue: any,
  objects: LabObject[]
): { action: Action | null } {
  const left = resolveValue(condition.test.left, inputValue, objects)
  const right = resolveValue(condition.test.right, inputValue, objects)

  let result = false
  switch (condition.test.operator) {
    case "==": result = left == right; break
    case "!=": result = left != right; break
    case ">":  result = left > right; break
    case "<":  result = left < right; break
    case ">=": result = left >= right; break
    case "<=": result = left <= right; break
  }

  return {
    action: result ? condition.thenAction : condition.elseAction ?? null
  }
}

function resolveValue(ref: ValueRef, inputValue: any, objects: LabObject[]): any {
  switch (ref.type) {
    case "input": return inputValue
    case "constant": return ref.value
    case "property":
      const obj = objects.find(o => o.id === ref.objectId)
      return obj ? (obj as any)[ref.property] : null
  }
}
```

### Integration with Button Tap

In SUShell's button tap handler:

```typescript
// BEFORE (hardcoded):
case "toggle_visibility":
  updateObject(targetObj.id, { opacity: targetObj.opacity > 0 ? 0 : 1 })

// AFTER (logic engine):
const handleBtnTap = () => {
  // Toggle the button's output value
  const newVal = bc.toggleState ? 0 : 1
  updateObject(obj.id, { buttonConfig: { ...bc, toggleState: !bc.toggleState } })

  // Check if this button has logic wires
  const hasLogic = logicGraph.wires.some(w => w.fromNodeId === obj.id)

  if (hasLogic) {
    // Use logic engine
    executeFromSource(obj.id, newVal, logicGraph, objects, updateObject)
  } else if (bc.targetLabel) {
    // Fallback to legacy buttonConfig behavior
    // ... existing code
  }
}
```

This preserves backward compatibility. Old buttons with `buttonConfig` still work. New buttons with logic wires use the engine.

---

## 7. What's In Scope (MVP) vs. Out of Scope

### In Scope — The Prototype

| Feature | Description |
|---------|------------|
| LogicGraph in store | Data model with persistence |
| Logic Block CRUD | Create, delete, configure IF/ELSE |
| Wire CRUD | Create by dragging ports, delete by long press |
| Node Editor UI | Full-screen panel with draggable nodes |
| Object nodes | Source (output ports) and target (input ports) |
| Logic Block nodes | Display condition summary, output port |
| Wire rendering | SVG Bezier curves between ports |
| Logic Block config | IF/THEN/ELSE with tappable dropdowns |
| Context-aware config | Adapts to boolean/number/string inputs |
| Execution engine | Evaluate IF/ELSE, apply action to target |
| Button integration | Tap → executeLogic instead of hardcoded action |
| Object bar in editor | Quick-add canvas objects as target nodes |
| "+" drawer | Add Logic Block (Listener grayed out) |
| Persist in presets | Logic graph saves/loads with presets |

### Out of Scope — Later Phases

| Feature | Phase |
|---------|-------|
| WHILE / FOR loops | B |
| Multiple conditions (AND/OR chains) | B |
| Event Listeners | C |
| Value Bus | D |
| Voice commands for logic | E |
| React export | F |
| Undo in logic editor | B |
| Wire animation dots | Nice to have |
| Multi-output logic blocks | B |
| Delay/timer actions | C |

---

## 8. Implementation Order

### Step 1: Data Model (store changes)
- Add `LogicGraph`, `LogicBlock`, `Wire`, `Condition` types to `lab.ts`
- Add `logicGraph` to store state with CRUD methods
- Add to `partialize` for persistence
- Add `outputValue` to LabObject

### Step 2: Execution Engine
- Create `src/lib/logicEngine.ts`
- Implement `executeFromSource`, `evaluateCondition`, `resolveValue`
- Unit-testable without UI

### Step 3: Node Editor Shell
- Create `src/components/su/LogicEditor.tsx`
- Full-screen overlay with back button and [+]
- Render source object node (from which button opened it)
- Object bar at bottom (list all canvas objects)

### Step 4: Node Rendering
- Object nodes with output/input ports
- Logic Block nodes with summary text
- Draggable nodes (pointer events)
- Port circles with type colors

### Step 5: Wire System
- SVG wire rendering between ports
- Drag-from-port interaction (temporary wire follows finger)
- Snap to compatible port on release
- Store wire in logicGraph

### Step 6: Logic Block Config
- Create `src/components/su/LogicBlockConfig.tsx`
- Double-tap logic block → condition editor opens
- IF/THEN/ELSE with tappable value/operator/property selectors
- Context-aware: dropdowns populated from connected types
- Preview summary at bottom

### Step 7: Integration
- Modify SUShell: config panel shows "Open Logic Editor" for buttons
- Modify button tap handler: check for logic wires, use engine
- Modify add node drawer: [+] in logic editor
- Test end-to-end: Button → Logic → Square F toggle

### Step 8: Polish
- Wire colors by type
- Logic block summary in node
- Status text in editor ("✓ Logic configured")
- Handle edge cases (delete object that's wired, delete logic block)

---

## 9. Success Criteria — "Working Prototype"

The prototype is complete when:

1. ✅ A button on the canvas can be connected to a logic block via the node editor
2. ✅ The logic block can be configured with IF/ELSE condition
3. ✅ The logic block can target any object on the canvas
4. ✅ Tapping the button on the canvas executes the logic and the target object changes
5. ✅ Multiple objects can be targeted from one logic block (one button → logic → multiple targets)
6. ✅ The logic graph persists across page refreshes
7. ✅ Old buttons without logic still work (backward compatibility)
8. ✅ The node editor is visually clear — you can see the data flow

**Stretch goals** (if time allows):
- One button connected to 2 different logic blocks targeting 2 different objects
- Logic block referencing another object's property (IF Square_F.size > 100)
- Delete wire / delete logic block with cleanup

---

## 10. What This Unlocks

Once the prototype works, every future feature follows the same pattern:

| Add this... | By doing... |
|-------------|------------|
| WHILE loop | New condition type in LogicBlock, evaluation loop in engine |
| FOR loop | Same pattern, iterate N times |
| Event Listener | New node type, attaches to object, fires on property change |
| Slider control | New object type with number output port |
| Timer | New object type with tick event output |
| Value Bus | New node type, pub/sub in engine |
| AND/OR | Compound condition in test expression |
| Delay | Action type with setTimeout wrapper |
| Voice commands | New FunctionGemma declarations + handlers |
| React export | Walk the graph, generate JSX + useState + handlers |

The architecture doesn't change. The pattern is always: **Node → Wire → Logic → Wire → Node**. More node types, more condition types, more action types. Same execution engine.

---

*"Separation of concerns to the atomic level. Micro-service architecture to the atomic level."*
*— Eyal Nof, describing the Visual Logic System*
