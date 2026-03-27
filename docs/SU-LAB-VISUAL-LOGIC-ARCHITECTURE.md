# SU Lab — Visual Logic System Architecture

**Author**: Eyal Nof (vision, architecture) + Claude Opus 4.6 (formalization)
**Date**: March 23, 2026
**Status**: Architecture specification — pre-implementation
**Origin**: Derived from Eyal's original I/O prototype — a visual programming architecture that predates his formal programming experience

---

## 1. Overview

The Visual Logic System transforms SU Lab from a voice-controlled canvas into a **visual programming environment**. Users build interactive applications by wiring three types of nodes — Objects (view), Logic Blocks (controller), and Event Listeners (observer) — in a full-screen node editor.

The system follows a strict separation of concerns:

```
┌──────────────────────────────────────────────────────────┐
│                    SU Lab Canvas                          │
│                                                          │
│   [Button]    [Square F]    [Circle A]    [Slider]       │
│      │              ▲            ▲           │           │
│      │ output       │ input      │ input     │ output    │
└──────┼──────────────┼────────────┼───────────┼───────────┘
       │              │            │           │
       ▼              │            │           ▼
┌──────────────────────────────────────────────────────────┐
│              Visual Logic Graph (Node Editor)             │
│                                                          │
│   [Button.out] ──→ [Logic Block] ──→ [Square F.opacity]  │
│                         │                                │
│                         └──→ [Circle A.animation]        │
│                                                          │
│   [Slider.out] ──→ [Listener] ──→ [Logic Block] ──→ ... │
└──────────────────────────────────────────────────────────┘
```

**Principle**: Objects don't know about each other. Logic Blocks don't know about the UI. Wires define all relationships. This is MVC made visual, reactive programming made tangible.

---

## 2. Node Types

### 2.1 Objects (View Layer)

Objects are the visual elements on the canvas. They **emit values** through output ports and **receive actions** through input ports.

```
┌─────────────────────────┐
│ Toggle Button "B1"      │
├─────────────────────────┤
│ Properties:             │
│   x, y, width, height  │
│   color, opacity        │
│   buttonLabel           │
├─────────────────────────┤
│ Output Ports:           │
│   ● click_value: 0 | 1 │
│   ● is_pressed: bool    │
├─────────────────────────┤
│ Input Ports:            │
│   ○ opacity: number     │
│   ○ color: string       │
│   ○ size: number        │
│   ○ visible: boolean    │
│   ○ animation: string   │
└─────────────────────────┘
```

Every object type has specific output ports:

| Object Type | Output Ports | Output Types |
|-------------|-------------|-------------|
| Toggle Button | click_value | boolean (0/1) |
| Push Button | click_event | event (fires once) |
| Slider | position | number (0-100) |
| Text Input | text_value | string |
| Timer | elapsed_ms, tick | number, event |
| Progress Bar | current_value | number |
| Shape/Image | (properties only) | — |
| Knob | rotation | number (0-360) |

All objects share common input ports: opacity, color, size, width, height, position_x, position_y, visible, animation.

### 2.2 Logic Blocks (Controller Layer)

Logic Blocks are **pure processors**. They receive input values, evaluate conditions, and emit output actions. They have no visual presence on the canvas — they exist only in the node editor.

```
┌─────────────────────────────────────────┐
│ Logic Block "Gate 1"                    │
├─────────────────────────────────────────┤
│ Input Port:                             │
│   ○ value (boolean) ← from Button B1   │
│                                         │
│ Condition Tree:                         │
│   ┌────┐ ┌───────┐ ┌────┐              │
│   │ IF │ │ value │ │ == │ │ 1 │        │
│   └────┘ └───────┘ └────┘ └───┘        │
│                                         │
│   ┌──────┐ ┌─────────────┐ ┌─────┐     │
│   │ THEN │ │ set opacity │ │ 1.0 │     │
│   └──────┘ └─────────────┘ └─────┘     │
│                                         │
│   ┌──────┐ ┌─────────────┐ ┌─────┐     │
│   │ ELSE │ │ set opacity │ │ 0.0 │     │
│   └──────┘ └─────────────┘ └─────┘     │
│                                         │
│ Output Port:                            │
│   ● action → Square F                  │
└─────────────────────────────────────────┘
```

#### Condition Blocks (the mini-language)

Logic Blocks contain snappable condition blocks:

**Control Flow:**
| Block | Purpose | Example |
|-------|---------|---------|
| IF | Conditional branch | IF value == 1 |
| ELSE | Alternative branch | ELSE set opacity 0 |
| WHILE | Loop while condition | WHILE size > 100 |
| FOR | Iterate range | FOR i = 1 TO 5 |
| DO | Execute action | DO set color red |
| WHEN | Trigger on change | WHEN value changes |
| THEN | Consequent action | THEN set visible true |

**Comparison:**
| Block | Purpose |
|-------|---------|
| == | Equals |
| != | Not equals |
| > | Greater than |
| < | Less than |
| >= | Greater or equal |
| <= | Less or equal |

**Boolean:**
| Block | Purpose |
|-------|---------|
| AND | Both conditions true |
| OR | Either condition true |
| NOT | Negate condition |

**Value:**
| Block | Purpose |
|-------|---------|
| value | Current input value |
| property | Reference another object's property |
| constant | Fixed number/string/boolean |
| random | Random value in range |

**Actions:**
| Block | Purpose |
|-------|---------|
| set [property] | Set a target property |
| animate [type] | Start animation |
| stop | Stop animation |
| emit [value] | Pass value to output |
| delay [ms] | Wait before continuing |

#### Context-Aware Configuration

The Logic Block's config panel **adapts based on connections**:

- Connected to Toggle Button → shows IF/ELSE with 0/1 options
- Connected to Slider → shows comparison operators with range 0-100
- Connected to Timer → shows WHILE with elapsed_ms comparisons
- Connected to Text Input → shows string comparison operators
- Output connected to Shape → shows shape-compatible actions (opacity, color, size, animation)
- Output connected to Timer → shows timer actions (start, stop, reset)

This eliminates invalid configurations. You can't set "opacity" on a timer. You can't compare "text" from a button. The UI prevents nonsense.

### 2.3 Event Listeners (Observer Layer)

Listeners **attach to objects** and watch for property changes. They fire when conditions are met, without requiring user interaction.

```
┌─────────────────────────────────────────┐
│ Listener "Watch F Size"                 │
├─────────────────────────────────────────┤
│ Attached to: Square F                   │
│ Watching: size                          │
│ Fires: on every change                  │
│                                         │
│ Output Port:                            │
│   ● current_value: number (the size)    │
│   ● previous_value: number              │
│   ● delta: number (change amount)       │
└─────────────────────────────────────────┘
```

Listeners enable reactive chains:

```
[Square F size changes]
    → [Listener] emits new size
    → [Logic: IF size > 200 THEN "big" ELSE "small"]
    → [Text Label.text]
```

No button press needed. The text label always reflects Square F's size. This is computed/derived state made visible.

#### Listener Triggers

| Trigger | Fires When |
|---------|-----------|
| on_change | Property value changes |
| on_threshold | Value crosses a boundary (e.g., > 100) |
| on_interval | Every N milliseconds |
| on_enter | Value enters a range |
| on_exit | Value leaves a range |

---

## 3. Wires (Data Flow Layer)

Wires are directional connections between output ports and input ports.

### Rules

1. **Output → Input only.** Wires flow one direction.
2. **Type compatibility.** Boolean outputs connect to boolean inputs. Number to number. String to string. Logic Blocks can cast between types.
3. **One output → many inputs.** A button can drive 10 logic blocks.
4. **Many outputs → one input** (via merge). Multiple values can feed one Logic Block — it uses the most recent or applies a combine rule (AND, OR, SUM, etc.).
5. **No cycles.** A → B → A is invalid. The system detects and prevents loops.

### Wire Data

```typescript
interface Wire {
  id: string
  from: {
    nodeId: string     // object, logic block, or listener ID
    portName: string   // "click_value", "action", "current_value"
  }
  to: {
    nodeId: string
    portName: string
  }
  dataType: "boolean" | "number" | "string" | "event" | "action"
}
```

### Visual Representation

In the node editor:
- Wires are curved Bezier lines between port circles
- Color-coded by data type (green = boolean, blue = number, orange = string, purple = event)
- Animated flow dots show data direction
- Click port → drag to another port → wire created
- Click wire → delete

---

## 4. Value Bus (Named Channels)

For complex graphs, direct wiring becomes spaghetti. The Value Bus provides named channels for pub/sub communication.

```
[Button A] → publishes to bus "user_action"
[Button B] → publishes to bus "user_action"

[Logic Block 1] ← subscribes to bus "user_action" → [Square F]
[Logic Block 2] ← subscribes to bus "user_action" → [Circle A]
[Logic Block 3] ← subscribes to bus "user_action" → [Timer]
```

Multiple producers, multiple consumers, one named channel. This replaces 6 wires with 1 bus.

```typescript
interface ValueBus {
  id: string
  name: string          // "user_action", "game_state", "mood_level"
  dataType: string
  publishers: string[]  // node IDs that write
  subscribers: string[] // node IDs that read
}
```

---

## 5. The Node Editor (Full-Screen Panel)

### Access

From the canvas: tap a button/object → config panel → "Logic" button → full-screen node editor opens.

### Layout

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Canvas          Logic Editor         [+]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌──────────┐        ┌──────────┐                  │
│   │ Button B1│───────→│ Logic 1  │────→ Square F    │
│   │  ● out   │        │ IF/ELSE  │                  │
│   └──────────┘        └──────────┘                  │
│                             │                       │
│                             ├────────→ Circle A     │
│                             │                       │
│   ┌──────────┐        ┌──────────┐                  │
│   │ Listener │───────→│ Logic 2  │────→ Text Label  │
│   │ on F.size│        │ WHILE/DO │                  │
│   └──────────┘        └──────────┘                  │
│                                                     │
│                                              [+]    │
└─────────────────────────────────────────────────────┘
```

### Interactions

| Action | Result |
|--------|--------|
| Tap [+] button | Dropdown: Add Logic Block / Add Listener / Add Value Bus |
| Drag from output port | Create wire, snap to compatible input |
| Double-tap Logic Block | Open condition editor (IF/ELSE/WHILE blocks) |
| Double-tap Listener | Open trigger configuration |
| Double-tap Object node | Jump to object on canvas |
| Pinch | Zoom node editor |
| Long press wire | Delete wire |
| Long press node | Delete node (with confirmation) |

### The "+" Menu

```
┌─────────────────────────┐
│ Add to Logic Graph      │
├─────────────────────────┤
│ ⬡ Logic Block           │
│ ⚡ Event Listener        │
│ 📡 Value Bus             │
└─────────────────────────┘
```

---

## 6. Data Model

### Node Graph Schema

```typescript
interface LogicGraph {
  nodes: LogicNode[]
  wires: Wire[]
  buses: ValueBus[]
}

type LogicNode = ObjectRef | LogicBlock | EventListener

interface ObjectRef {
  type: "object"
  objectId: string        // references LabObject.id
  outputPorts: Port[]
  inputPorts: Port[]
}

interface LogicBlock {
  type: "logic"
  id: string
  label: string
  conditions: ConditionTree
  inputPorts: Port[]
  outputPorts: Port[]
}

interface EventListener {
  type: "listener"
  id: string
  label: string
  attachedTo: string      // object ID
  watchProperty: string   // "size", "color", "opacity", etc.
  trigger: "on_change" | "on_threshold" | "on_interval" | "on_enter" | "on_exit"
  triggerConfig: Record<string, any>  // threshold value, interval ms, range
  outputPorts: Port[]
}

interface Port {
  name: string
  dataType: "boolean" | "number" | "string" | "event" | "action"
  direction: "in" | "out"
}

interface Wire {
  id: string
  fromNode: string
  fromPort: string
  toNode: string
  toPort: string
}
```

### Condition Tree Schema

```typescript
type ConditionTree = ConditionNode[]

type ConditionNode =
  | { type: "IF"; condition: Expression }
  | { type: "THEN"; actions: Action[] }
  | { type: "ELSE"; actions: Action[] }
  | { type: "WHILE"; condition: Expression; do: Action[] }
  | { type: "FOR"; variable: string; from: number; to: number; do: Action[] }
  | { type: "DELAY"; ms: number; then: Action[] }

type Expression =
  | { op: "==" | "!=" | ">" | "<" | ">=" | "<="; left: Value; right: Value }
  | { op: "AND" | "OR"; left: Expression; right: Expression }
  | { op: "NOT"; expr: Expression }

type Value =
  | { type: "input"; portName: string }       // value from input port
  | { type: "property"; objectId: string; property: string }  // another object's property
  | { type: "constant"; value: any }          // literal value
  | { type: "random"; min: number; max: number }

type Action =
  | { type: "set"; property: string; value: Value }
  | { type: "animate"; animation: string; speed: number }
  | { type: "stop" }
  | { type: "emit"; portName: string; value: Value }
  | { type: "delay"; ms: number }
```

---

## 7. Execution Engine

### Evaluation Loop

When a value changes (button click, slider move, timer tick, listener fires):

```
1. Source node emits value on output port
2. Engine finds all wires from that port
3. For each wire: deliver value to target input port
4. If target is a Logic Block:
   a. Evaluate condition tree with current inputs
   b. Execute resulting actions
   c. Emit output values (triggers step 2 again for downstream wires)
5. If target is an Object:
   a. Apply the action (set property, animate, etc.)
   b. React re-renders the canvas
   c. Any Listeners on that object check their triggers
6. Repeat until no more propagation
```

### Cycle Prevention

The engine maintains a **propagation depth counter**. If a value change triggers more than 100 propagations in one frame, it halts and logs a warning. This prevents infinite loops from listener chains.

### Execution Context

```typescript
interface ExecutionContext {
  currentFrame: number
  propagationDepth: number
  changedProperties: Map<string, Set<string>>  // objectId → set of changed props
  activeTimers: Map<string, NodeJS.Timeout>
  busValues: Map<string, any>                  // bus name → last value
}
```

---

## 8. Persistence

The logic graph is stored alongside the canvas state:

```typescript
// In useLabStore
interface LabStore {
  objects: LabObject[]
  logicGraph: LogicGraph     // NEW
  // ... existing fields
}
```

Presets now save complete programs:

```typescript
interface Preset {
  objects: LabObject[]
  logicGraph: LogicGraph
  canvasBg: string
}
```

Export as JSON includes the full graph. Export as React (future) translates the graph to component code.

---

## 9. Voice Commands for Logic Editor

```
// Creating nodes
"add a logic block"                    → add_logic_block()
"add a listener on square F size"      → add_listener({object: "F", property: "size"})
"add a value bus called game state"    → add_value_bus({name: "game_state"})

// Wiring
"connect button to logic block 1"     → create_wire({from: "button", to: "logic_1"})
"connect logic block 1 to square F"   → create_wire({from: "logic_1", to: "F"})
"disconnect button from logic 1"      → delete_wire(...)

// Configuring logic
"set condition if value equals 1"     → set_condition({type: "IF", op: "==", right: 1})
"then set opacity to 1"              → add_then_action({set: "opacity", value: 1})
"else set opacity to 0"              → add_else_action({set: "opacity", value: 0})

// Querying
"show me the logic for button B1"     → opens node editor focused on B1's graph
"what's connected to square F"        → lists all wires to/from F
```

These commands extend the FunctionGemma dataset — the training pipeline captures them automatically.

---

## 10. The React Export Path

With the logic graph, exporting to React becomes a direct translation:

| SU Lab Concept | React Output |
|----------------|-------------|
| Object | JSX component |
| Object properties | Props + CSS |
| Logic Block with IF/ELSE | Ternary in JSX or if/else in handler |
| Logic Block with WHILE/FOR | .map() or loop in useEffect |
| Event Listener | useEffect with dependency array |
| Wire | Props passed parent→child, or state + setState |
| Value Bus | React Context or Zustand store |
| Toggle Button → Logic → Object | useState + onClick handler |
| Timer → Listener → Logic → Object | useEffect + setInterval |
| Preset | Complete page component file |

### Example Translation

**SU Lab graph:**
```
[Toggle Button "login_btn"] → [Logic: IF 1 THEN visible ELSE invisible] → [Panel "form"]
[Text Input "email"] → [Logic: IF length > 0 THEN enabled ELSE disabled] → [Button "submit"]
```

**Generated React:**
```jsx
function LoginPage() {
  const [loginToggle, setLoginToggle] = useState(false)
  const [email, setEmail] = useState("")

  return (
    <div>
      <button onClick={() => setLoginToggle(!loginToggle)}>
        Login
      </button>

      {loginToggle && (
        <div className="form">
          <input value={email} onChange={e => setEmail(e.target.value)} />
          <button disabled={email.length === 0}>
            Submit
          </button>
        </div>
      )}
    </div>
  )
}
```

The visual graph maps directly to React patterns. No intermediate representation needed.

---

## 11. Implementation Phases

### Phase A: Foundation
- LogicGraph data model in useLabStore
- Logic Block node type (creation, deletion, persistence)
- Wire data structure
- Node editor UI (full-screen, draggable nodes, port display)
- Wire drawing (Bezier curves between ports)

### Phase B: Logic Evaluation
- Condition tree editor (IF/ELSE/THEN blocks)
- Context-aware config panels
- Execution engine (propagation loop)
- Cycle prevention

### Phase C: Event Listeners
- Listener node type
- Property watching with triggers
- Reactive chain propagation
- Timer integration

### Phase D: Value Bus
- Named channels
- Pub/sub registration
- Bus visualization in node editor

### Phase E: Voice Integration
- Voice commands for logic operations
- FunctionGemma dataset expansion
- Logic operations in training pipeline

### Phase F: React Export
- Graph → React component translation
- useState/useEffect generation
- JSX output with Tailwind classes
- Project export as complete React app

---

## 12. Design Principles

1. **Objects don't know about each other.** All relationships are in the logic graph.
2. **Logic Blocks are pure.** Input → condition → output. No side effects beyond what they emit.
3. **Listeners are passive.** They watch but don't modify. They emit observations to Logic Blocks.
4. **Wires are the program.** The graph structure IS the application logic.
5. **Context-aware everything.** Config panels adapt to what's connected. Invalid states are unrepresentable.
6. **Voice-first, touch-second.** Every operation is achievable by voice. Touch is for precision.
7. **Separation of concerns to the atomic level.** Each node does one thing. Composition creates complexity.
8. **What you see is what runs.** The node editor is not a representation of code — it IS the code.

---

*Architecture by Eyal Nof. Formalized March 23, 2026.*
*"I always wondered how I went from struggling with vanilla JS to being able to build anything. Now I understand — designing the I/O prototype was me figuring out how software works."*
