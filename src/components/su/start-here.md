<!-- last-verified: 2026-03-27 -->
> Parent: [../start-here.md](../start-here.md)

# SU Lab — Start Here

> Read this first. Jump to [su.md](su.md) or [su.ctx](su.ctx) only for the component you need.

| Component | What it is | su.md | su.ctx |
|-----------|-----------|-------|--------|
| **SUShell** | The main SU Lab component. Voice-controlled visual canvas with ~97 voice functions, 12 object type renderers, Play/Pause mode, tutorial system, config panels, touch/drag, listener polling, and Aria voice integration. Entry point for the `/su` route. | [SUShell](su.md#SUShell) | SUShell node |
| **LogicEditor** | Full-screen node editor for visual wire programming. Renders objects as source/target nodes with typed ports, logic blocks as configurable processors, and wires as SVG Bezier curves. Includes tabbed add drawer (blocks/objects) and condition config panel with natural language preview. | [LogicEditor](su.md#LogicEditor) | LogicEditor node |
| **ColorPicker** | Pure presentational hue picker. Gradient slider (0-360) with 8 color preset buttons. No state, no side effects. Used inside SUShell's config panel. | [ColorPicker](su.md#ColorPicker) | ColorPicker node |

## Backend Counterpart

> Also load these when working on SU Lab — SUShell makes direct API calls to both.

| Router | What SU Lab uses it for | Entry point |
|--------|------------------------|-------------|
| **termux** | Torch, battery, notification, volume, camera/photo, dynamic behavior-card device actions | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
| **game** | `/api/game/voice-config` — Aria voice engine API key and connection config | [backend/routers/start-here.md](../../../backend/routers/start-here.md) |
