# Agentic 3-File Documentation Workflow

> Paste this prompt into any Claude Code session to generate standardized documentation for a folder **and all its undocumented child folders**, using parallel subagents.
> This is the multi-folder orchestration layer on top of the single-folder spec below.

---

## Prompt

```
I need you to document this folder and its child folders by generating a 3-file documentation set for each. Read every file before writing anything.

There are 3 phases. Follow them in order.

────────────────────────────────────────────────
PHASE 1 — SCAN
────────────────────────────────────────────────

1. Let {ROOT} = the current working directory. Let {ROOT_NAME} = its folder name.
2. List all immediate child directories.
3. List all source files directly in {ROOT} (any language — .ts, .py, .go, .rs, .java, .rb, .swift, etc.).
4. For each child directory, check whether it already contains a `start-here.md`.
   - If yes → mark it as DOCUMENTED (skip it in Phase 2).
   - If no  → mark it as UNDOCUMENTED (will be handled in Phase 2).
5. If any DOCUMENTED child exists, read ONE of its `start-here.md` files to learn the existing style. All new docs must match that style.

────────────────────────────────────────────────
PHASE 2 — CHILD FOLDER AGENTS (parallel)
────────────────────────────────────────────────

For EACH child directory marked UNDOCUMENTED, spawn a subagent (use the Agent tool) in parallel. Give each agent this task — fill in {FOLDER} and {PATH} for that child:

---BEGIN AGENT TASK---

I need you to document the folder at {PATH} by generating 3 files inside it. Read every file in the folder (and subfolders) before writing anything.

## File 1: {FOLDER}.md — Full Reference

Structure:
1. **Manifest table** at the top:
   - Library (path)
   - Purpose (1-2 sentences: what it is, what it does)
   - Framework / stack
   - Entry point (main file)
   - External dependencies (stores, libs, APIs it reaches outside itself)
   - Component/file count
   - Design language (if UI) or architecture style (if backend)

2. **File tree** — full directory listing with inline comments explaining each file in ≤10 words.

3. **Component/module index** — one section per file, each containing:
   - HTML anchor: `<a id="ComponentName"></a>`
   - H3 heading: `### path/ComponentName.ext`
   - Bold 1-2 sentence description of what it is and does
   - Bullet points only if the component is complex (>100 lines)
   - **Connects to:** line listing what it imports from or is called by

4. **External Dependencies Summary** — two tables:
   - Stores/state (name → purpose)
   - Libraries (name → purpose)

5. **Staleness marker** — HTML comment at top: `<!-- last-verified: YYYY-MM-DD -->`

Rules:
- Every anchor ID must match the component/module name exactly
- "Connects to" should reference both internal siblings AND external deps
- Keep descriptions concise — if it can be said in 1 sentence, don't use 2
- Don't document CSS classes or styling details unless they are architecturally significant
- Don't include code snippets — this is a map, not a tutorial

## File 2: {FOLDER}.ctx — Context Architecture Map

Create a `.ctx` context file following the format spec at `docs/CTX-FORMAT-SPEC.md`.

The `.ctx` file should capture:
- Every component/module as a node with its role and relationships
- Components grouped by subdirectory
- External stores and their connections
- External libraries and their usage
- Parent→child render/call relationships
- Store/library subscriptions
- Include `%% last-verified: YYYY-MM-DD` at the top

## File 3: start-here.md — Quick Reference Index

Create a markdown table with these columns:
| Component | What it is | {FOLDER}.md | {FOLDER}.ctx |

Rules:
- "What it is" = 1-2 sentences max (can be slightly more for complex orchestrators)
- "{FOLDER}.md" column = markdown link to the anchor: `[ComponentName]({FOLDER}.md#ComponentName)`
- "{FOLDER}.ctx" column = node name reference: `ComponentName node`
- Add `<!-- last-verified: YYYY-MM-DD -->` at the top
- Add a header note: "Read this first. Jump to {FOLDER}.md or {FOLDER}.ctx only for the component you need."
- Bold the component names in the first column

## General Rules
- Read ALL files before writing anything
- Use today's date for last-verified
- Don't invent or assume behavior — only document what you read in the code
- If a component is pure presentational (no state, no side effects), say so
- Anchors in {FOLDER}.md must be stable identifiers (component name, not line numbers) so start-here.md links don't break on edits
- If the folder has an existing README, COMPONENTS.md, or similar, read it for context but don't duplicate it — your docs replace it

---END AGENT TASK---

Wait for ALL child agents to complete before proceeding to Phase 3.

────────────────────────────────────────────────
PHASE 3 — MASTER DOC SET (after all agents complete)
────────────────────────────────────────────────

Now create the 3 files for {ROOT} itself, using the same spec from Phase 2 with these additions:

### start-here.md additions

The master `start-here.md` has TWO sections:

**Section 1 — Subfolder Index (lazy-load tree)**

A table with these columns:
| Folder | What it is | Files | Entry point |

- "Folder" = bold folder name
- "What it is" = 1-2 sentence summary of what that subfolder contains
- "Files" = count of source files in that child folder
- "Entry point" = relative link to that folder's start-here.md: `[{child}/start-here.md]({child}/start-here.md)`
- Include ALL child folders — both previously DOCUMENTED and newly documented ones
- This is the lazy-loading mechanism — readers drill into a subfolder only when they need it

**Section 2 — Root-Level Components/Modules**

The standard component table (same as Phase 2's start-here.md format) but ONLY for files that live directly in {ROOT}. If {ROOT} has no loose source files, omit this section.

### {ROOT_NAME}.md additions

- The manifest table, file tree, component index, and external deps summary cover ONLY files directly in {ROOT}
- Child folder contents are NOT duplicated — the reader follows lazy links
- The file tree DOES show child folders (as collapsed entries with file counts), but does not expand their contents

### {ROOT_NAME}.ctx additions

- Child folders appear as single collapsed nodes with their file count, not expanded
- Arrows from root components to child folders show render/import relationships
- Arrows from child folders to external stores/APIs show their dependencies at a summary level

### General Rules (all phases)
- Read ALL files before writing anything
- Use today's date for last-verified
- Don't invent or assume behavior — only document what you read in the code
- If a component/module is pure presentational (no state, no side effects), say so
- Anchors must be stable identifiers (name, not line numbers)
- Never duplicate documentation — root links to children, children contain the detail
- If the folder has an existing README, COMPONENTS.md, or similar, read it for context but don't duplicate it
- This spec is language-agnostic and framework-agnostic — works for any codebase

Now scan this directory and execute the plan.
```

---

## Usage

1. Copy the prompt above (everything inside the code fence)
2. Open a Claude Code session in the target folder
3. Paste it
4. Claude scans, spawns parallel agents for undocumented children, then assembles the master set

## Conventions

- **Anchor-based linking** — `start-here.md` links to `{FOLDER}.md#ComponentName` anchors, not line numbers. Stable across edits.
- **Staleness markers** — `<!-- last-verified: YYYY-MM-DD -->` in every file. Future sessions can check if docs are current.
- **External deps summary** — always distinguish stores from libraries. Makes it clear what state the folder touches vs. what tools it uses.
- **Context node IDs** — match component/module names exactly so `start-here.md` references are unambiguous.
- **Lazy-loading tree** — the root `start-here.md` never inlines child content. It links to each child's `start-here.md`. Readers load context only for the subfolder they need.
- **Idempotent** — re-running the prompt skips children that already have `start-here.md`. Only undocumented folders get new docs. The root set is always regenerated.

## Example tree after execution

```
current-folder/
  start-here.md          ← master index with lazy links to all children
  current-folder.md      ← details for root-level files only
  current-folder.ctx     ← architecture graph with children as collapsed nodes
  child-a/
    start-here.md        ← (already existed — untouched)
    child-a.md
    child-a.ctx
  child-b/
    start-here.md        ← (created by subagent)
    child-b.md
    child-b.ctx
  child-c/
    start-here.md        ← (created by subagent)
    child-c.md
    child-c.ctx
```
