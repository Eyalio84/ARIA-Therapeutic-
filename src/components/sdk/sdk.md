<!-- last-verified: 2026-03-25 -->

# sdk/ — Component Reference

## SdkDashboard

**File:** `SdkDashboard.tsx` (25 lines)
**Exports:** `SdkDashboard` (named)
**Route:** Rendered inside `TabContainer` when `activeTab === "sdk"`

### What it does
Pure layout shell. Arranges the 4 SDK panels in a responsive grid — no state, no logic.

### Layout
- Top row: 2-column grid (NaiSearchPanel + IntrospectionTester left, PersonaVisualizer right)
- Bottom row: full-width KgExplorer

### Dependencies
- Imports: `NaiSearchPanel`, `PersonaVisualizer`, `IntrospectionTester`, `KgExplorer`

---

## NaiSearchPanel

**File:** `NaiSearchPanel.tsx` (121 lines)
**Exports:** `NaiSearchPanel` (named)
**Store:** `useSdkStore` — `naiResults`, `naiIntent`, `naiMethods`, `naiWeights`, `naiTotal`, `isSearching`, `searchNai`

### What it does
Search interface for the NAI (Neural Associative Index) knowledge graph. Submits a natural language query and displays scored results with intent classification and retrieval method breakdown.

### Key features
- Text input with Enter-to-search and button submit
- Intent badge (8 types: exact_match, goal_based, exploratory, comparison, debugging, workflow, capability_check, semantic)
- Method tags showing which retrieval methods were used
- Weight display (alpha, beta, gamma, delta)
- Result cards with: name, node_type badge, description, price/stock, composite score
- 4-bar score decomposition per result (embedding, text, graph, intent)

### Visual config
- `INTENT_COLORS` — 8 intent types mapped to Tailwind color classes
- `TYPE_COLORS` — 7 node types (product, material, category, etc.) mapped to colors

---

## PersonaVisualizer

**File:** `PersonaVisualizer.tsx` (110 lines)
**Exports:** `PersonaVisualizer` (named)
**Store:** `useSdkStore` — `personaState`

### What it does
Visualizes the 4D persona state computed from search interactions. Shows emotional, relational, linguistic, and temporal dimensions with gauge bars and derived metrics.

### Dimensions
| Axis | Label | Gauge color | Key fields |
|---|---|---|---|
| X | Emotional | violet | `value`, `mood`, `reason` |
| Y | Relational | blue | `intensity`, `activated`, `target`, `relation_type` |
| Z | Linguistic | emerald | `distinctiveness`, `dialect` (immutable) |
| T | Temporal | amber | `step`, `momentum.stage`, `memory[]` |

### Sub-components (internal)
- **GaugeBar** — labeled horizontal progress bar with value display and optional children
- **MiniGauge** — centered metric circle with color coding (green >= 0.7, amber >= 0.4, red < 0.4)

### Derived metrics
- Intensity, Stability, Authenticity — shown as MiniGauge trio

### Empty state
Shows "Run a search to compute persona state" when `personaState` is null.

---

## IntrospectionTester

**File:** `IntrospectionTester.tsx` (95 lines)
**Exports:** `IntrospectionTester` (named)
**Store:** `useSdkStore` — `introspectionResult`, `isValidating`, `validateText`

### What it does
Validates a text response against the current 4D persona state. Shows whether a response is consistent with the persona's emotional, relational, linguistic, and temporal dimensions.

### Key features
- Textarea for pasting text to validate
- "Load bad example" / "Load good example" buttons for quick testing
- Score display (0.000–1.000) with color coding
- Recommendation badge: pass (emerald), warn (amber), block (red)
- Valid/Invalid indicator
- Deviation list with severity badges (critical/warning) and type/detail

### Visual config
- `REC_STYLES` — pass/warn/block mapped to color classes
- `SEVERITY_STYLES` — critical/warning mapped to color classes

---

## KgExplorer

**File:** `KgExplorer.tsx` (137 lines)
**Exports:** `KgExplorer` (named)
**Store:** `useKgStore` — `nodes`, `edges`, `isLoading`, `fetchGraph`, `kgStats`, `addEdge`, `setEditingEdge`, `exportGraph`

### What it does
Interactive knowledge graph viewer using ReactFlow. Renders nodes as custom cards with type badges, supports filtering by node type, connecting nodes via drag, and exporting the graph as JSON.

### Key features
- Toolbar: type filter buttons, node/edge count, Export button
- Custom `KgNode` component with `Handle` ports (top target, bottom source)
- Click node to select/edit, drag between nodes to create edges
- MiniMap with type-based node coloring
- Fetches graph data on mount via `fetchGraph()`
- Export downloads as `jewelry-kg-export.json`

### Sub-components (internal)
- **KgNode** — custom ReactFlow node renderer. Shows type badge (colored by `NODE_COLORS`), label, optional price. Click dispatches `setSelectedNode` + `setEditingNode`.

### Dependencies
- `@xyflow/react` — ReactFlow, Background, Controls, MiniMap, Handle, Position
- `@/store/kg` — `useKgStore`, `NODE_COLORS`
