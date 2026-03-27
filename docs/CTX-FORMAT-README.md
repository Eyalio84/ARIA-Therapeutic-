# .ctx — Context Maps for AI-Assisted Development

> A file format for encoding software architecture in a way that LLMs understand instantly.

---

## The Problem

Every new AI coding session starts blind. The model doesn't know your architecture, your dependencies, or how your components connect. You either:

1. **Spend 10-20 messages explaining your codebase** — expensive, error-prone, different every time
2. **Let the AI read source files** — slow, token-heavy, and it still misses the big picture
3. **Write a README** — prose is for humans, not machines. An LLM reads 500 words of architecture description and reconstructs a less accurate model than one built from structured data

None of these scale. Every session pays the same onboarding cost.

## The Solution

A `.ctx` file is a **structured architecture map** that an LLM can read in one pass and immediately understand:
- What components exist
- What each one does (1 sentence)
- How they connect (direct calls vs reactive subscriptions)
- How they group into layers and subsystems
- Where to look for more detail

```
# src/ — Context Map
# format: ctx/1.0
# last-verified: 2026-03-26
# edges: -> call/render | ~> subscribe/read | => HTTP API call

## app/ — Routes
  layout     : Root HTML, fonts, metadata [root] @entry
    -> home
  home       : Home page — TabBar + tabs [screen]
    -> TabBar, ChatPanel

## components/ — UI
  ChatPanel  : Chat orchestrator [component]
    -> VoiceOrb, ChatInput
    ~> chatStore
  VoiceOrb   : 5-state voice button [component]
    ~> chatStore

## store/ — State
  chatStore  : Messages, voice status [store]

## External
  geminiAPI  : Gemini Live API [ext]
```

An LLM reads this and knows: `layout` renders `home`, which renders `TabBar` and `ChatPanel`. `ChatPanel` renders `VoiceOrb` and `ChatInput`, and subscribes to `chatStore`. The voice system connects to an external Gemini API. Full architecture, zero explanation, one file read.

---

## How It Works

### The 3-File System

Every documented folder gets 3 files:

| File | Consumer | Purpose |
|---|---|---|
| `start-here.md` | Human (primary) | Routing — "what's in this folder, where do I look?" |
| `{folder}.md` | Human + AI | Reference — "what does each component do?" |
| `{folder}.ctx` | AI (primary) | Architecture — "how does everything connect?" |

### Lazy-Loading Hierarchy

Files link to children, never inline their content:

```
project/
  start-here.md           ← "src/ has 188 files, see src/start-here.md"
  project.ctx             ← src/ is one collapsed node with -> src/src.ctx
  src/
    start-here.md         ← "components/ has 86 files, see components/start-here.md"
    src.ctx               ← components/ is a group with -> components/components.ctx
    components/
      start-here.md       ← component table with links to components.md
      components.ctx       ← full component graph with inline edges
      components.md        ← prose descriptions per component
```

An AI session starts at the root, reads `project.ctx` to understand the high-level architecture, then drills into `src/src.ctx` only if it needs frontend details, then into `components/components.ctx` only if it needs component-level relationships. Context loaded on demand, never duplicated.

### Staleness Protection

Every `.ctx` file has a `# last-verified: YYYY-MM-DD` header. A hook checks this date against file modification timestamps on every read. If source code changed since the docs were last verified, the AI session gets a warning:

```
STALENESS WARNING: src.ctx last verified 2026-03-20, but source files
modified since. Run: python3 scripts/check-doc-staleness.py --folder src
```

This prevents the critical failure mode: an AI session confidently acting on a stale architecture graph.

---

## .ctx Syntax at a Glance

### Header
```
# folder/ — Title
# format: ctx/1.0
# last-verified: 2026-03-26
# edges: -> call/render | ~> subscribe/read | => HTTP API call
```

### Groups
```
## layer/ — Description
  ### sublayer/ (file count)
```

### Nodes
```
  ComponentName : What it does in 1 sentence [type]
```

Type tags: `[root]` `[screen]` `[component]` `[lib]` `[store]` `[service]` `[router]` `[config]` `[ext]` `[dir]` `[type]` `[data]` `[test]` `[doc]` `[backend]`

### Edges (inline under source node)
```
  ChatPanel : Chat orchestrator [component]
    -> VoiceOrb, ChatInput          # direct: renders these
    ~> chatStore                     # reactive: subscribes to this
    => ariaRouter                    # HTTP: calls backend API
```

- `->` = direct dependency (call, render, import)
- `~>` = reactive dependency (subscribe, read, observe)
- `=>` = HTTP API call (frontend to backend router)

### Backend Counterpart Pattern

When a frontend component calls backend APIs (`fetch('/api/...')`), its docs must include:
- `start-here.md` — a `## Backend Counterpart` table linking to relevant backend router docs
- `{folder}.ctx` — `=>` edges from calling components + a `## Backend` section with `[backend]` nodes
- `{folder}.md` — a `### Backend API` table listing endpoints, methods, routers, and purposes

This pattern ensures an AI session always knows which backend files are relevant when working on frontend code.

### Collapse (for large groups)
```
  ... (9) : tab, ariaMode, gameVoice, transcript, devLog, products, kg, sdk [store]
```

### Cross-file drill-down
```
  ### game/ (46) -> components/game/game.ctx
```

---

## Why Not Mermaid?

The `.ctx` format evolved from Mermaid. The project originally used `.mmd` files — not as diagrams, but as AI context injection. Mermaid worked because LLMs are pre-trained on it, but it carries rendering baggage that wastes tokens:

| Mermaid overhead | Tokens wasted |
|---|---|
| `classDef root fill:#7c3aed,stroke:#a78bfa,color:#fff` (x7 styles) | ~200 |
| `class Node1,Node2 styleName` (x8 assignments) | ~80 |
| `["<b>Name</b><br/>description"]` HTML in every node (x40 nodes) | ~140 |
| `subgraph name["label"]` + `end` (x15 groups) | ~80 |
| Total per file | ~500 tokens |

`.ctx` achieves **45-61% token reduction** over equivalent Mermaid while preserving all architectural information. On a project with 20 documented folders, that's ~10,000 tokens saved per full context load.

---

## Origin

This format and system were created by a developer who built a custom architecture notation before knowing Mermaid existed, switched to Mermaid for LLM compatibility, then outgrew Mermaid when the rendering overhead became measurable waste. The `.ctx` format is the third iteration — purpose-built for the only consumer that matters: the AI session that needs to understand your codebase in one file read.

The lazy-loading hierarchy, staleness enforcement, anchor-based cross-referencing, and the three-tier documentation pattern (routing / reference / architecture) were arrived at intuitively and later formalized. The system was designed from the consumer's perspective — "what does an AI session need to navigate this codebase efficiently?" — not from existing documentation standards.

---

## Full Specification

See [CTX-FORMAT-SPEC.md](CTX-FORMAT-SPEC.md) for the complete formal specification including grammar, validation rules, migration guide from Mermaid, and design rationale.
