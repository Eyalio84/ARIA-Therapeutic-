# /ctx — Lazy-Loading Context Management System with Structural Contextual Embeddings

> Give any AI coding session instant architectural understanding of your codebase. Navigate by structure, search by meaning, analyze impact before you refactor.

**Author:** Eyal Nof
**Built on:** Android / Termux / Claude Code
**Dependencies:** Python 3 (standard library only). No GPU. No external models. Runs on a phone.

---

## What This Is

A complete context management and architectural search system for AI-assisted development. It solves the problem that every new AI session starts blind — it doesn't know your architecture, your dependencies, or how your components connect.

The system has two layers:

**Layer 1 — Structured Context (the .ctx format)**
Every documented folder gets 3 files: `start-here.md` (navigation), `{folder}.ctx` (architecture graph), `{folder}.md` (detailed reference). AI sessions read these instead of scanning source files. 43-61% token reduction over Mermaid-based alternatives.

**Layer 2 — Structural Contextual Embeddings (search + impact)**
The .ctx files are parsed into a SQLite knowledge graph. Each node gets a 50-dimensional vector encoding its text AND its graph neighborhood — what it connects to, how it connects, and what its neighbors do. This enables semantic + graph search that surfaces architecturally connected components text search cannot find.

Together: structured navigation for when you know where you're going, intelligent search for when you don't.

---

## What's In This Package

```
ctx-skill/
  SKILL.md                    — The /ctx Claude Code skill (6 modes)
  CTX-FORMAT-SPEC.md          — Formal .ctx v1.0 specification
  CTX-FORMAT-README.md        — Publication-facing .ctx format overview
  LAZY-LOADING-CONTEXT-SYSTEM.md — Full user guide (beginner-friendly)
  ctx-to-kg.py                — KG builder + embedding generator + search + impact analysis
  generate_basic_ctx.py       — Heuristic .ctx generator (no AI, import parsing only)
  doc-staleness-hook.sh       — PreToolUse hook: warns when docs are stale
  pre-commit-ctx-check.sh     — Git hook: warns when source changes without doc updates
```

## Installation

### As a Claude Code Skill

Copy `SKILL.md` to `.claude/skills/ctx/SKILL.md` in your project. Then:

```
/ctx -new     # scaffold on a new project
/ctx -doc     # document an existing codebase
/ctx          # interactive context loader + search
```

### The Full Toolkit

1. Copy all files from this folder to your project
2. Run `python3 ctx-to-kg.py --root .` to build the KG and embeddings
3. Install hooks:
   - `doc-staleness-hook.sh` → `.claude/settings.local.json` (PreToolUse on Read)
   - `pre-commit-ctx-check.sh` → `.git/hooks/pre-commit`

---

## The /ctx Skill — 6 Modes

| Mode | What it does |
|------|-------------|
| `/ctx` or `/ctx -menu` | Interactive context loader with search fallback |
| `/ctx -search "query"` | Semantic + graph architectural search |
| `/ctx -search --impact ComponentName` | Impact analysis: what depends on this? |
| `/ctx -new` | Scaffold the 3-file system on an empty project |
| `/ctx -doc [--dry-run]` | Bulk-generate docs for an existing codebase |
| `/ctx -update [path] [--dry-run]` | Incrementally patch stale docs |

---

## Structural Contextual Embeddings — The Key Innovation

### What makes this different

Standard code search tools (grep, GitHub search, Sourcegraph) find **text matches**. They answer "which files contain this word?"

This system finds **architectural neighborhoods**. It answers "what components are structurally related to this concept?" — including components that don't share any keywords with your query but are connected through the dependency graph.

### How it works

1. `.ctx` files are parsed into a SQLite knowledge graph (nodes = components, edges = dependencies)
2. Each node gets a 50-dimensional embedding encoding:
   - Its own text (name + description) — weight 1.0
   - Its type tag (component, store, service, etc.) — weight 2.0
   - Its graph neighborhood (connected nodes' text) — weight 0.3-0.7
3. Queries use hybrid scoring: **text × 1.0 + embedding similarity × 0.6 + graph traversal × 0.8**

No neural networks. No GPU. No external embedding models. Hash-based feature extraction + random projection. Runs in milliseconds on a phone.

### Why "structural contextual"?

Standard "contextual embeddings" (BERT, 2018) means token vectors that change based on **surrounding text**. What we have here is different: component vectors that change based on **graph structure** — connected nodes, edge types, architectural hierarchy. The context is relational, not lexical.

---

## Validated Results

### Proof-of-concept (aria-personal)

| Query | grep finds | System finds | grep would miss |
|-------|-----------|-------------|-----------------|
| "voice" | 24 | 24 + 195 + 29 | 186 |
| "therapy safety" | 24 | 24 + 155 + 15 | 142 |
| "save load game state" | 63 | 63 + 233 + 96 | 205 |

### Benchmark: 5 open-source projects (no insider knowledge)

| Project | Language | Nodes | Edges | Avg results grep misses per query |
|---------|----------|-------|-------|----------------------------------|
| FastAPI | Python | 390 | 810 | 9.2 |
| Zustand | TypeScript | 38 | 28 | 12.8 |
| Excalidraw | React/TS | 543 | 1,580 | 11.6 |
| Hono | TypeScript | 150 | 576 | 17.4 |
| Pydantic | Python | 359 | 1,015 | 12.8 |
| **Total** | — | **1,480** | **4,009** | **12.8 avg** |

25 queries across 5 projects. The system consistently surfaces 12.8 architecturally connected results per query that text search cannot find. These were generated with heuristic .ctx files (mechanical import parsing, no AI descriptions) — a conservative lower bound.

---

## Impact Analysis

Beyond search, the system does reverse-traversal impact analysis:

```
/ctx -search --impact useGameStore

HIGH RISK (direct dependents — will break):
  GameScreen, BurgerMenu, AriaPanel, OnboardingScreen... (9 components)

MEDIUM RISK (transitive — 2 hops):
  game/page (renders GameShell which subscribes)

INDIRECT (semantically similar — review recommended):
  useGameThemeStore (0.899), useTranscriptStore (0.893)...
```

Know what breaks before you refactor. Grouped by risk level, not just a flat list.

---

## The .ctx Format

A structured architecture notation designed for LLM consumption. Not a diagram format — a context injection format.

```
# components/ — UI
# format: ctx/1.0
# last-verified: 2026-03-27
# edges: -> call/render | ~> subscribe/read | => HTTP API call

  ChatPanel : Chat orchestrator [component] @entry
    -> VoiceOrb, ChatInput
    ~> chatStore
    => ariaRouter

## Backend
  ariaRouter : Aria API [backend]
```

Three edge types distinguish three fundamentally different kinds of coupling:
- `->` direct (call, render, import)
- `~>` reactive (subscribe, read, observe)
- `=>` network (HTTP API call — crosses the frontend/backend boundary)

The **Backend Counterpart pattern** ensures frontend docs always link to their backend dependencies. No more searching for which API endpoints a component calls.

---

## What This Means

### For developers
Load exactly the context you need, when you need it. Start a session with `/ctx`, pick your area or search for it, and the AI understands your architecture before reading a single source file. Save tokens, save time, get better results.

### For teams
New team members query the architecture in natural language. Impact analysis before refactoring. Pre-commit hooks that catch documentation drift. The system maintains itself.

### For AI-assisted development
This is what context management looks like when you design it from the AI consumer's perspective. Not READMEs, not diagrams, not full-file reads — structured context, loaded on demand, searchable by meaning, with enforcement hooks that keep it honest.

---

## Origin

This system was not designed top-down. Three independent pieces — built months apart on an Android phone for different purposes — turned out to be architecturally complementary:

1. **The .ctx format** (March 2026) — solving "how does an AI understand a codebase?"
2. **Contextual embedding data packet** (November 2025) — solving "how do I teach an AI about embeddings without external models?"
3. **KG query interface** (November 2025) — solving "how do I query a knowledge graph in natural language?"

They were connected on March 27, 2026 when a routine question about the context system prompted the realization that the pieces already existed and fit together. The proof-of-concept was built, validated on the home project, and then validated on 5 external open-source projects — all in a single day.

The benchmark confirmed: **structural contextual embeddings generalize**. They work on Python backends (FastAPI, Pydantic), TypeScript libraries (Zustand, Hono), and React applications (Excalidraw) — projects the author had never worked on.

Built entirely on a phone. No laptop, no desktop, no GPU, no cloud IDE.

---

## Technical References

- [CTX-FORMAT-SPEC.md](CTX-FORMAT-SPEC.md) — Formal .ctx v1.0 specification
- [STRUCTURAL-CONTEXTUAL-EMBEDDINGS-SPEC.md](../docs/STRUCTURAL-CONTEXTUAL-EMBEDDINGS-SPEC.md) — Embedding pipeline, query interface, terminology
- [BENCHMARK-RESULTS.md](../docs/BENCHMARK-RESULTS.md) — Full 5-project validation data
- [INTERACTIVE-PLANNING-PATTERN.md](../docs/INTERACTIVE-PLANNING-PATTERN.md) — Collaborative AI planning pattern
- [LAZY-LOADING-CONTEXT-SYSTEM.md](LAZY-LOADING-CONTEXT-SYSTEM.md) — Complete user guide
