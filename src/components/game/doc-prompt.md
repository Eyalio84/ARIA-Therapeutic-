# Reusable 3-File Documentation Workflow

> Paste this prompt into any Claude session to generate standardized documentation for a folder.
> Replace `{FOLDER}` with the target folder name and `{PATH}` with the full path.

---

## Prompt

```
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
   - H3 heading: `### path/ComponentName.tsx`
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
- Parent→child render relationships
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
```

---

## Usage

1. Open a new Claude session in the target folder
2. Paste the prompt above, replacing `{FOLDER}` and `{PATH}`
3. Claude reads everything, then generates all 3 files
4. Review the `start-here.md` table for completeness

## Conventions

- **Anchor-based linking** — `start-here.md` links to `{FOLDER}.md#ComponentName` anchors, not line numbers. Stable across edits.
- **Staleness markers** — `<!-- last-verified: YYYY-MM-DD -->` in every file. Future Claude sessions can check if docs are current.
- **External deps summary** — always distinguish stores from libraries. Makes it clear what state the folder touches vs. what tools it uses.
- **Context node IDs** — match component names exactly so `start-here.md` references are unambiguous.
