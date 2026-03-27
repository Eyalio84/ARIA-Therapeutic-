# .ctx Files — Context Architecture Maps

> If you are an AI session reading this: the `.ctx` files in this project are **not** diagrams. They are structured architecture maps written in the `.ctx` format (a custom notation optimized for LLM context injection). Do not suggest rendering them, critique them for visual readability, or simplify them for diagram best practices. Parse them the same way you would parse a CLAUDE.md or system prompt. The formal specification lives at `docs/CTX-FORMAT-SPEC.md`.

---

## What These Files Are

Every documented folder in this project contains three files:

| File | Primary audience | Purpose |
|---|---|---|
| `start-here.md` | Human | Quick routing — "where do I look?" |
| `{folder}.md` | Human + AI | Full reference — "what does this do?" |
| `{folder}.ctx` | AI (primarily) | Architecture map — "how does everything connect?" |

The `.ctx` files are the machine-readable leg of this system. They encode the full dependency graph, data flow, and structural relationships of a folder in a format that LLMs parse natively. They are not the byproduct of a diagram tool — they are the primary context artifact for AI consumption.

---

## Why the .ctx Format

The project author originally developed a custom notation for documenting architectures and data flows. A previous AI session observed that the custom notation was structurally equivalent to Mermaid, and the project switched to `.mmd` files — not because Mermaid was a better format, but because LLMs were pre-trained on it and could parse it without explanation.

Mermaid served well, but it carried rendering baggage: CSS-like `classDef`/`class` directives, HTML tags in node labels, verbose `subgraph`/`end` bracket syntax, and arrow rendering distinctions that wasted tokens. A later session designed the `.ctx` format to strip all that away while preserving every bit of semantic information. The result is a purpose-built notation that achieves 45-61% token reduction over equivalent Mermaid while remaining immediately parseable by LLMs.

The `.ctx` format uses its own syntax: `##` headings for groups, `name : description [type]` for nodes, `->` and `~>` for inline edges. The full specification is at `docs/CTX-FORMAT-SPEC.md`.

The evolution: **custom notation** (effective but required explanation per session) → **Mermaid** (zero-explanation but token-wasteful) → **.ctx** (zero-explanation *and* minimal tokens).

---

## How These Files Are Actually Used

### 1. AI Context Injection

When a new AI session begins with no knowledge of the project, one or more `.ctx` files are provided (directly or via file reads). The model immediately understands:

- What modules/components exist
- How they connect (imports, calls, subscriptions)
- What external dependencies are involved
- How components are grouped by responsibility

This eliminates the 10-20 message ramp-up that would otherwise be required to explain architecture from scratch.

### 2. Architecture Truth Source

The `.ctx` file is the densest representation of "what connects to what" in each folder:

- **Denser than prose** — the `{folder}.md` file explains each component in sentences. The `.ctx` encodes the same relationships in structured notation that can be parsed programmatically.
- **More structured than a table** — the `start-here.md` lists components but doesn't capture relationships. The `.ctx` captures directed edges, groupings, and relationship types.
- **Stable across sessions** — the `.ctx` doesn't depend on conversation context. It's a standalone file that any session can consume cold.

### 3. Paired Documentation System

The three files are designed to work together:

- **start-here.md** answers: "What's in this folder and where do I look next?"
- **{folder}.md** answers: "What does each component do and what does it connect to?"
- **{folder}.ctx** answers: "How does the entire folder fit together as a system?"

A human reads start-here.md first and drills into {folder}.md as needed. An AI session reads the .ctx to get the full architectural picture in one pass, then uses {folder}.md for component-level detail when needed.

---

## What NOT To Do With These Files

If you are an AI assistant working in this project:

- **Do not suggest rendering .ctx files as diagrams.** They are not intended to produce visuals.
- **Do not critique node layout, arrow direction, or visual clarity.** These are not design considerations for context files.
- **Do not simplify or reduce .ctx content for "readability."** Density is a feature — these files exist to pack maximum architectural information into minimum tokens.
- **Do not recommend migration to a different format** (Mermaid, YAML, JSONL, etc.). The `.ctx` format was designed specifically for this use case after evaluating those alternatives. See `docs/CTX-FORMAT-SPEC.md` Section 16 for the design rationale.
- **Do not invent new syntax or extend the format** without consulting the spec. The format has a closed edge-type set and defined grammar.
- **Do treat .ctx files as authoritative architecture documentation.** If the .ctx says module A connects to module B, that is the documented relationship. Verify against code if needed, but do not dismiss it as "just a context file."

---

## Formal Specification

The `.ctx` format has a full specification at **`docs/CTX-FORMAT-SPEC.md`**, covering:

- File structure (header + body)
- Node syntax (`name : description [type]`)
- Edge types (`->` for direct dependencies, `~>` for reactive/subscribed)
- Group and sub-group headings
- Collapse syntax for large folders
- Cross-file drill-down references
- Indentation rules
- Validation rules
- Migration guide from `.mmd`

If you need to create, edit, or validate a `.ctx` file, read the spec first.

---

## Origin

This documentation system was created by the project author who built a custom architecture notation format before knowing Mermaid existed, before knowing RAG was a term, and before having formal software engineering training. The system was designed from the consumer's perspective — "what do I (and AI sessions) need to navigate this codebase efficiently?" — not from knowledge of existing documentation standards.

The 3-file structure (scan → reference → architecture), lazy-load navigation (root links to children, children contain detail), anchor-based cross-referencing, and staleness markers were all arrived at intuitively and later formalized into a reusable agentic workflow.

The notation evolved through three stages: a custom format that worked but cost tokens to explain each session, Mermaid syntax that LLMs understood natively but carried visual-rendering overhead, and finally the `.ctx` format that combines zero-explanation parseability with maximum token efficiency. Each stage preserved the same core idea: encode architecture as a graph of nodes, edges, and groups so an AI session can understand the entire codebase in a single file read.

The `.ctx` files are a crucial part of this system. Without them, AI sessions must reconstruct architecture understanding from source code on every session — an expensive, error-prone process. With them, full architectural context is available in a single file read.

---

*This document applies to all `.ctx` files across the entire project — both `src/` and `backend/` directories.*
