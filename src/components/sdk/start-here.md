<!-- last-verified: 2026-03-25 -->
> Parent: [../start-here.md](../start-here.md)

# SDK — Start Here

> Read this first. Jump to [sdk.md](sdk.md) or [sdk.ctx](sdk.ctx) only for the component you need.

| Component | What it is | sdk.md | sdk.ctx |
|---|---|---|---|
| **SdkDashboard** | Layout shell. 2-column grid with NaiSearchPanel + IntrospectionTester (left), PersonaVisualizer (right), and full-width KgExplorer below. No state of its own. | [SdkDashboard](sdk.md#SdkDashboard) | `SdkDashboard` node |
| **NaiSearchPanel** | Knowledge graph search UI. Text input with Enter/button submit, intent classification badge, retrieval method tags, alpha/beta/gamma/delta weight display, and scored result cards with 4-bar score decomposition (emb/text/graph/intent). | [NaiSearchPanel](sdk.md#NaiSearchPanel) | `NaiSearchPanel` node |
| **PersonaVisualizer** | 4D persona state dashboard. Four gauge bars (X-Emotional, Y-Relational, Z-Linguistic, T-Temporal) with journey stage dots, memory tags, and derived metrics (Intensity, Stability, Authenticity). | [PersonaVisualizer](sdk.md#PersonaVisualizer) | `PersonaVisualizer` node |
| **IntrospectionTester** | Response validator. Textarea for pasting text, Validate button, good/bad example loaders, score display with pass/warn/block recommendation, and severity-coded deviation list. | [IntrospectionTester](sdk.md#IntrospectionTester) | `IntrospectionTester` node |
| **KgExplorer** | Interactive ReactFlow graph viewer. Toolbar with type filter buttons, node count, export to JSON. Custom `KgNode` renderer with type badges, handles, and click-to-edit. MiniMap + Controls. | [KgExplorer](sdk.md#KgExplorer) | `KgExplorer` node |
