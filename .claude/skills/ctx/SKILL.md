---
name: ctx
description: "Set up or generate a lazy-loading context management system for any project. `/ctx -new` scaffolds the system on an empty/new project (hook, spec, templates, maintenance rules). `/ctx -doc` documents an existing codebase (tree scan, hub identification, parallel 3-file generation). `/ctx -update` incrementally patches stale docs. `/ctx -menu` presents an interactive context loader. Stack and language agnostic."
---

# /ctx — Lazy-Loading Context Management System

**Author: Eyal Nof**

You are the CONTEXT ARCHITECT. You set up and generate a lazy-loading context management system that gives AI sessions instant architectural understanding of any codebase through structured `.ctx` files.

The system uses 3 files per folder:
- `start-here.md` — human routing index ("what's here, where do I look?")
- `{folder}.md` — full prose reference with anchors ("what does each component do?")
- `{folder}.ctx` — AI-optimized architecture graph ("how does everything connect?")

---

## Parse Arguments

Read `$ARGUMENTS` to determine the mode:

- If `$ARGUMENTS` contains `-new` → run **MODE: NEW PROJECT**
- If `$ARGUMENTS` contains `-doc` → run **MODE: DOCUMENT EXISTING**
- If `$ARGUMENTS` contains `-update` → run **MODE: UPDATE**
- If `$ARGUMENTS` contains `-menu` → run **MODE: MENU**
- If `$ARGUMENTS` is empty → run **MODE: MENU** (default)

---

## MODE: NEW PROJECT (`/ctx -new`)

This mode scaffolds the context management system onto a new or empty project so it grows with the codebase from day zero. The developer starts coding and the documentation pattern is already in place.

### Step 1 — Detect Project Info

```
PROJECT_DIR = current working directory
PROJECT_NAME = basename of PROJECT_DIR
```

Check if the project already has a `.ctx` system (look for `start-here.md` at root). If yes, warn the user and ask if they want to reinitialize.

### Step 2 — Install the .ctx Format Spec

Create `docs/CTX-FORMAT-SPEC.md` containing the full .ctx v1.0 specification. Use the spec below:

<details>
<summary>CTX-FORMAT-SPEC.md (click to expand)</summary>

Write the spec with these sections:
1. Overview (what .ctx is, design principles, what it is not)
2. File structure (header + body, no separate edges section)
3. Header (4 required fields: title, format: ctx/1.0, last-verified, edges legend)
4. Groups (`##` top-level, `###` sub-groups, drill-down references `-> child.ctx`)
5. Nodes (`name : description [type]`, type tags, special markers @entry/@hot/~NL)
6. Edges (inline under source nodes, `->` call/render, `~>` subscribe/read, multi-target, compact syntax, labels)
7. Collapse syntax (`... (N) : name1, name2 [type]`)
8. Cross-file references (drill-down, directory nodes, path resolution, external nodes)
9. Indentation (2 spaces per level)
10. Comments and blank lines
11. Validation rules (7 validity rules + 4 well-formedness rules)
12. Migration from Mermaid (what to drop, what to add)
13. Design rationale (why not Mermaid/JSONL/YAML, why inline edges, why two edge types)

The spec must be complete and self-contained — a reader with no prior knowledge of the system should be able to create valid .ctx files from the spec alone.

</details>

### Step 3 — Install the Staleness Hook

Create `scripts/doc-staleness-hook.sh`:

```bash
#!/usr/bin/env bash
# Doc staleness hook — PreToolUse on Read
# Checks if a doc file (start-here.md, *.ctx, {folder}.md) is stale
set -euo pipefail

INPUT=$(cat)

# Try jq first (fast ~5ms), fall back to python3 (~70ms)
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
else
  FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
fi
[ -z "$FILE_PATH" ] && exit 0

BASENAME=$(basename "$FILE_PATH")
DIRNAME=$(dirname "$FILE_PATH")
FOLDERNAME=$(basename "$DIRNAME")

IS_DOC=false
if [ "$BASENAME" = "start-here.md" ]; then IS_DOC=true
elif [[ "$BASENAME" == *.ctx ]]; then IS_DOC=true
elif [ "$BASENAME" = "${FOLDERNAME}.md" ]; then IS_DOC=true
fi
[ "$IS_DOC" = false ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

VERIFIED_DATE=$(grep -oP '(?<=last-verified: )\d{4}-\d{2}-\d{2}' "$FILE_PATH" 2>/dev/null | head -1)
[ -z "$VERIFIED_DATE" ] && exit 0

TOUCH_FILE=$(mktemp)
touch -d "$VERIFIED_DATE" "$TOUCH_FILE" 2>/dev/null || { rm -f "$TOUCH_FILE"; exit 0; }

NEWER_FILES=$(find "$DIRNAME" -maxdepth 1 -type f \
  -newer "$TOUCH_FILE" \
  ! -name '*.md' \
  ! -name '*.ctx' \
  2>/dev/null | head -5)

rm -f "$TOUCH_FILE"
[ -z "$NEWER_FILES" ] && exit 0

STALE_COUNT=$(echo "$NEWER_FILES" | wc -l)
RELATIVE_DIR=$(echo "$DIRNAME" | sed "s|^$(pwd)/||")
cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"STALENESS WARNING: ${BASENAME} last verified ${VERIFIED_DATE}, but ${STALE_COUNT} source file(s) modified since."}}
EOF
```

Make it executable: `chmod +x scripts/doc-staleness-hook.sh`

Then add the hook to `.claude/settings.local.json` (create if needed, merge if exists):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "scripts/doc-staleness-hook.sh",
            "timeout": 5,
            "statusMessage": "Checking doc staleness..."
          }
        ]
      }
    ]
  }
}
```

### Step 4 — Create Root Templates

Create `start-here.md`:

```markdown
<!-- last-verified: {TODAY} -->

# {PROJECT_NAME}/ — Start Here

> Read this first. Drill into a subfolder's `start-here.md` only when you need that domain.
> Jump to [{PROJECT_NAME}.md]({PROJECT_NAME}.md) or [{PROJECT_NAME}.ctx]({PROJECT_NAME}.ctx) for root-level details.

## Subfolder Index

| Folder | What it is | Files | Entry point |
|---|---|---|---|

<!-- Add rows as you create folders. Each row links to that folder's start-here.md -->

## Root-Level Files

| Component | What it is | {PROJECT_NAME}.md | {PROJECT_NAME}.ctx |
|---|---|---|---|

<!-- Add rows as you create root-level files -->
```

Create `{PROJECT_NAME}.md` and `{PROJECT_NAME}.ctx` as minimal stubs with the correct headers and a comment explaining they should be populated as the project grows.

### Step 5 — Create the Maintenance Guide

Create `CTX-MAINTENANCE.md` at project root:

```markdown
# Maintaining the Context Management System

This project uses a lazy-loading context management system. Here's how to keep it intact as the project grows.

## The 3-File Rule

Every folder with 3+ source files should have:
1. `start-here.md` — routing index (what's here, where to look)
2. `{folder}.md` — full reference (what each component does)
3. `{folder}.ctx` — architecture graph (how everything connects)

## When to Create Documentation

| Event | Action |
|---|---|
| **Create a new folder** with 3+ files | Generate the 3-file set for it |
| **Add a file** to a documented folder | Add it to {folder}.md, {folder}.ctx, and start-here.md |
| **Delete/rename a file** | Update all 3 files in that folder |
| **Add a dependency** between components | Add an edge in the source's .ctx file |
| **Create a subfolder** inside a documented folder | Add a row to the parent's start-here.md subfolder index |

## How to Generate Documentation

### For a single folder:
Ask your AI assistant: "Generate the 3-file documentation set for {path} following the .ctx spec at docs/CTX-FORMAT-SPEC.md"

### For the whole project:
Run `/ctx -doc` to scan the full tree and generate all missing documentation.

## .ctx File Quick Reference

```
# folder/ — Title
# format: ctx/1.0
# last-verified: YYYY-MM-DD
# edges: -> call/render | ~> subscribe/read | => HTTP API call

## Group Name
  ComponentName : What it does [type]
    -> DirectDependency1, DirectDependency2
    ~> ReactiveSubscription
    => backendRouter

## Backend
  backendRouter : What the backend router does [backend]
```

- `->` = direct call/render/import
- `~>` = subscribe/read/observe
- `=>` = HTTP API call (frontend → backend router)
- `[type]` tags: root, screen, component, lib, store, service, router, config, ext, dir, type, data, test, doc, backend
- `@entry` marks the primary entry point
- `... (N) : name1, name2 [type]` collapses similar nodes

## Backend Counterpart Pattern

If a component makes HTTP API calls (`fetch('/api/...')` or equivalent), its docs must include:

**In `start-here.md`** — a `## Backend Counterpart` table:
```markdown
## Backend Counterpart
| Router | What this folder uses it for | Entry point |
|--------|------------------------------|-------------|
| **routerName** | description of API calls made | [backend/routers/start-here.md](path/to/backend/routers/start-here.md) |
```

**In `{folder}.ctx`** — `=>` edges from calling component + `## Backend` section:
```
  ComponentName : ...
    => routerName
## Backend
  routerName : Description [backend]
```

**In `{folder}.md`** — a `### Backend API` table under External Dependencies:
```markdown
### Backend API
| Endpoint | Method | Router | Purpose |
|----------|--------|--------|---------|
| `/api/router/endpoint` | POST | routerName | What it does |
```

## Rules

1. **Every start-here.md** (except root) must have a parent link: `> Parent: [../start-here.md](../start-here.md)`
2. **Every .ctx file** must have all 4 header fields (title, format, last-verified, edges)
3. **Node names in edges** must exactly match node definitions — no aliases
4. **Never inline child content** in parent docs — link down, don't duplicate
5. **Update `last-verified`** dates when you confirm docs match code
6. **The staleness hook** will warn AI sessions when docs are outdated
7. **If source files contain API calls**, the Backend Counterpart pattern is required in all 3 doc files

## For AI Sessions

If you are an AI assistant working in this project:

- `.ctx` files are **context injection files**, not diagrams. Do not suggest rendering them.
- Read the `.ctx` file to understand architecture. Read `{folder}.md` for component details.
- Follow `start-here.md` links to navigate — drill into subfolders only when needed.
- If the staleness hook fires, verify the docs before trusting them.
- When you create new code, offer to update the documentation to match.
- The full .ctx format spec is at `docs/CTX-FORMAT-SPEC.md`.
```

### Step 6 — Add CLAUDE.md instruction

If a `CLAUDE.md` file exists at project root, append a section about the context system. If it doesn't exist, create one with just this section:

```markdown
## Context Management System

This project uses a lazy-loading context management system with .ctx files.

- Read `start-here.md` at any folder level for navigation
- Read `{folder}.ctx` for architecture graphs (NOT diagrams — these are AI context injection files)
- Read `{folder}.md` for detailed component reference
- When creating new folders or components, maintain the 3-file documentation set
- See `CTX-MAINTENANCE.md` for rules and `docs/CTX-FORMAT-SPEC.md` for the .ctx format spec
```

### Step 7 — Summary

Print a summary of everything installed:

```
Context Management System initialized for {PROJECT_NAME}/

Installed:
  docs/CTX-FORMAT-SPEC.md        — .ctx format specification
  scripts/doc-staleness-hook.sh  — staleness detection hook
  .claude/settings.local.json    — hook configuration
  start-here.md                  — root routing index (template)
  {PROJECT_NAME}.md              — root reference (template)
  {PROJECT_NAME}.ctx             — root architecture map (template)
  CTX-MAINTENANCE.md             — maintenance guide
  CLAUDE.md                      — AI session instructions (updated)

Next steps:
  1. Start building your project
  2. When you create a folder with 3+ files, generate its 3-file set
  3. Or run /ctx -doc later to bulk-document everything at once
```

---

## MODE: DOCUMENT EXISTING (`/ctx -doc`)

This mode scans an existing codebase and generates the full context management system.

### Phase 1 — SCAN

1. Run `tree` (or `find` if tree is unavailable) to map the project structure. Exclude: node_modules, .git, __pycache__, .next, dist, build, venv, .venv, target, vendor.
2. Let `{ROOT}` = current working directory. Let `{ROOT_NAME}` = its folder name.
3. List all immediate child directories.
4. For each child directory, check whether it already contains a `start-here.md`.
   - If yes → mark as DOCUMENTED (skip in Phase 2).
   - If no → mark as UNDOCUMENTED.
5. Recursively check subdirectories of UNDOCUMENTED children for folders with 3+ source files — these are documentation hubs.
6. If any DOCUMENTED folder exists, read ONE of its `start-here.md` files to learn the existing style. Match it.
7. Read `docs/CTX-FORMAT-SPEC.md` if it exists. If not, create it first (same as -new Step 2).

### Phase 2 — CHILD FOLDER AGENTS (parallel)

For EACH folder marked UNDOCUMENTED that has 3+ source files, spawn a subagent (use the Agent tool) in parallel, in swarms of 5. Give each agent this task:

```
Read all files in {PATH}. Then generate 3 files inside it:

1. {FOLDER}.md — Full reference (manifest table, file tree, component index with anchors, external deps)
2. {FOLDER}.ctx — Context architecture map following the spec at docs/CTX-FORMAT-SPEC.md
3. start-here.md — Quick reference index with parent link, component table linking to {FOLDER}.md anchors and {FOLDER}.ctx nodes

Rules:
- Read ALL files before writing anything
- Use today's date for last-verified
- Don't invent behavior — only document what you read
- start-here.md must have: > Parent: [../start-here.md](../start-here.md)
- .ctx must have all 4 required headers
- .ctx uses inline edges (no separate edges section)
- .ctx edge types: -> (call/render), ~> (subscribe/read), => (HTTP API call)

Backend Counterpart (required if API calls exist):
- Scan source files for fetch('/api/...') or equivalent HTTP calls
- If found: identify which backend routers they target (e.g. /api/termux/* → termux router)
- Add a "## Backend Counterpart" section to start-here.md with a table of routers used and links to their start-here.md
- Add a "## Backend" section to {FOLDER}.ctx with backend router nodes [backend] and => edges from calling components
- Add a "### Backend API" table to {FOLDER}.md External Dependencies section listing each endpoint, method, router, and purpose
- If no API calls exist, omit these sections entirely
```

Wait for ALL agents to complete before Phase 3.

### Phase 3 — MASTER DOC SET

Create the 3 files for {ROOT} itself:

- `start-here.md` with TWO sections: Subfolder Index (lazy links to all children) + Root-Level Files
- `{ROOT_NAME}.md` covering only root-level files (children are linked, not inlined)
- `{ROOT_NAME}.ctx` with children as collapsed `[dir]` nodes with `-> child/child.ctx` drill-down

### Phase 4 — COMPONENT INDEX

Generate `COMPONENT-INDEX.md` at project root — a flat alphabetical table of every component across the entire project for O(1) lookup.

### Phase 5 — INFRASTRUCTURE

1. Install staleness hook (same as -new Step 3) if not already present
2. Install CTX-FORMAT-SPEC.md if not already present
3. Create CTX-MAINTENANCE.md if not already present
4. Update or create CLAUDE.md section about the context system
5. Add parent links to any start-here.md files missing them

### Phase 6 — VERIFICATION

Run a final check:
- Count .ctx files vs documented folders (should match)
- Verify all start-here.md files have parent links (except root)
- Verify no dangling references (start-here.md links to files that exist)
- Print summary with file counts, token estimates, and any warnings

---

## MODE: UPDATE (`/ctx -update`)

This mode performs incremental surgical updates to existing context files when source code has changed. Unlike `-doc` (full generation), `-update` reads what's already there and patches only what's wrong or missing.

### Step 1 — Determine Scope

Parse `$ARGUMENTS` after `-update`:
- If a path is given (e.g. `/ctx -update src/components`) → scope to that folder and its children
- If no path → scope to the full project (all documented folders)

### Step 2 — Find Stale or Incomplete Folders

For each documented folder in scope (folders with a `start-here.md`):

1. Read the `last-verified` date from `start-here.md`
2. Check if any source files (non-`.md`, non-`.ctx`) in that folder were modified after `last-verified`
3. Also check for the **Backend Counterpart gap**: scan source files for `fetch('/api/...')` — if found and no `## Backend Counterpart` section exists in `start-here.md`, flag as incomplete regardless of staleness
4. Build a list: `NEEDS_UPDATE` (stale or incomplete), `CURRENT` (fresh and complete)

Report the list to the user before proceeding:
```
Folders to update:
  src/components/game/    — stale (2 source files modified since 2026-03-24)
  src/components/sdk/     — incomplete (API calls found, no Backend Counterpart section)
  src/app/                — current ✓
  ...
Proceed? (yes/no)
```

Wait for user confirmation before Step 3.

### Step 3 — Update Each Folder (parallel, swarms of 5)

For each folder in `NEEDS_UPDATE`, spawn a subagent (use Agent tool) with this task:

```
You are updating an existing context management system for {PATH}.

Read:
1. All source files in {PATH}
2. The existing start-here.md, {folder}.ctx, {folder}.md

Then perform a gap analysis:
- Are all source files listed in start-here.md? Add any missing.
- Are component descriptions still accurate? Fix any that don't match source.
- Do counts (voice functions, object types, line counts) still match? Correct them.
- Scan source files for fetch('/api/...') or equivalent HTTP calls.
  - If API calls exist: check for Backend Counterpart sections in all 3 files.
  - If missing or incomplete: add/update them following the Backend Counterpart Pattern.
  - Identify the correct backend router for each /api/{router}/... path.
  - Include ALL endpoints found, including dynamic ones (e.g. /api/router/${variable}).
- Are there any removed files still listed? Remove them.
- Do .ctx edges still match actual imports/calls in source? Fix any that don't.

Patch only what's wrong — do not regenerate files from scratch.
Update last-verified to today's date in ALL 3 files you touch.

Backend router identification guide (for this project):
  /api/termux/*    → backend/routers/termux.py
  /api/game/*      → backend/routers/game.py
  /api/aria/*      → backend/routers/aria.py
  /api/dashboard/* → backend/routers/dashboard.py
  /api/therapy/*   → backend/routers/therapy.py
  /api/kg/*        → backend/routers/kg.py
  /api/products/*  → backend/routers/products.py
  /api/docs/*      → backend/routers/docs.py
```

### Step 4 — Summary

After all agents complete, print:

```
/ctx -update complete

Updated {N} folders:
  ✓ src/components/game/   — added Backend Counterpart (game, aria routers)
  ✓ src/components/sdk/    — added Backend Counterpart (aria router), fixed component count
  ...

{M} folders already current — skipped.
```

---

## MODE: MENU (`/ctx -menu` or `/ctx` with no args)

This mode presents an interactive context loader — a numbered list of all documented areas in the project. The user picks what they want to work on, and Claude loads that context.

### Step 1 — Discover all start-here.md files

Use `Glob` to find all `**/start-here.md` files in the project. Group them by depth:
- **Root** (depth 0): the project root start-here.md
- **Domain** (depth 1): top-level folders (src/, backend/, docs/, etc.)
- **Component** (depth 2+): nested folders (src/components/su/, backend/routers/, etc.)

### Step 2 — Present numbered menu

Use the `AskUserQuestion` tool to present the choices. Format as a single-select question with options grouped logically:

```
What would you like to work on?

Options:
  1. Project overview (root)
  2. Frontend (src/)
  3. Backend (backend/)
  4. SU Lab — voice canvas (src/components/su/)
  5. Game — therapeutic RPG (src/components/game/)
  6. Store — e-commerce (src/components/store/)
  7. Dashboard — therapist UI (src/components/dashboard/)
  8. SDK tools (src/components/sdk/)
  ... etc
```

Build the option list dynamically from the discovered start-here.md files. Use the `# Title` line from each start-here.md as the description. Exclude node_modules and build artifacts.

### Step 3 — Load selected context

Based on the user's choice:
1. Read the selected folder's `start-here.md`
2. Read the selected folder's `{folder}.ctx` (for architecture understanding)
3. If the `start-here.md` has a **Backend Counterpart** section, note the linked backend folders but do NOT auto-load them — mention them to the user: "This area also connects to backend/routers/ — want me to load that context too?"
4. Report what was loaded and ask what the user wants to do

---

## General Rules (all modes)

- **Stack agnostic** — works for any language, framework, or project structure
- **Never render .ctx files** — they are AI context injection, not diagrams
- **Never inline child content in parent docs** — link down, don't duplicate
- **Use today's date** for all last-verified markers
- **Parallel execution** — use Agent tool with swarms of 5 for bulk generation
- **Idempotent** — re-running skips already-documented folders (checks for start-here.md)
- **Backend Counterpart is required** — any folder whose source files make HTTP API calls must have the Backend Counterpart pattern in all 3 doc files
- **`=>` edge type** — always include `=> HTTP API call` in the .ctx edges legend for any file that uses it
