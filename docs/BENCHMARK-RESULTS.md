# Structural Contextual Embeddings — Benchmark Results

> Generated: 2026-03-27 15:08
> Method: Heuristic .ctx generation (no AI) → ctx-to-kg.py → hybrid query

---

## Summary

| Project | Language | Files | Nodes | Edges | Queries | Avg SCE-only | Avg grep-would-miss |
|---------|----------|-------|-------|-------|---------|-------------|-------------------|
| **FastAPI** | Python | 1122 | 390 | 810 | 5 | 9.2 | 332.2 |
| **Zustand** | TypeScript | 47 | 38 | 28 | 5 | 12.8 | 17.0 |
| **Excalidraw** | React/TypeScript | 626 | 543 | 1580 | 5 | 11.6 | 295.2 |
| **Hono** | TypeScript | 362 | 150 | 576 | 5 | 17.4 | 119.2 |
| **Pydantic** | Python | 534 | 359 | 1015 | 5 | 12.8 | 299.2 |

**Total queries:** 25
**Total SCE-only results (grep would miss):** 319

---

## FastAPI (Python)

- Source files: 1122 across 201 folders
- KG: 390 nodes, 810 edges
- .ctx files generated: 185
- Embeddings: 390 vectors (50d)

| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |
|-------|-----------|-------------|---------|----------|-----------|----------------|
| routing request handling | 20 | 4 | 0 | 20 | 4 | 376 |
| dependency injection | 20 | 24 | 19 | 1 | 5 | 321 |
| security authentication | 20 | 39 | 20 | 0 | 19 | 264 |
| middleware error handling | 20 | 4 | 3 | 17 | 1 | 346 |
| openapi schema generation | 20 | 20 | 12 | 8 | 8 | 354 |

---

## Zustand (TypeScript)

- Source files: 47 across 14 folders
- KG: 38 nodes, 28 edges
- .ctx files generated: 9
- Embeddings: 38 vectors (50d)

| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |
|-------|-----------|-------------|---------|----------|-----------|----------------|
| store creation state | 0 | 0 | 0 | 0 | 0 | 0 |
| middleware persist | 20 | 2 | 2 | 18 | 0 | 19 |
| subscribe selector | 10 | 1 | 1 | 9 | 0 | 9 |
| devtools debugging | 20 | 2 | 2 | 18 | 0 | 30 |
| context provider react | 20 | 1 | 1 | 19 | 0 | 27 |

---

## Excalidraw (React/TypeScript)

- Source files: 626 across 93 folders
- KG: 543 nodes, 1580 edges
- .ctx files generated: 62
- Embeddings: 543 vectors (50d)

| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |
|-------|-----------|-------------|---------|----------|-----------|----------------|
| canvas rendering drawing | 0 | 0 | 0 | 0 | 0 | 0 |
| element selection transform | 20 | 4 | 2 | 18 | 2 | 482 |
| collaboration sharing | 0 | 0 | 0 | 0 | 0 | 0 |
| export import file | 20 | 2 | 0 | 20 | 2 | 481 |
| history undo redo | 20 | 2 | 0 | 20 | 2 | 513 |

---

## Hono (TypeScript)

- Source files: 362 across 87 folders
- KG: 150 nodes, 576 edges
- .ctx files generated: 78
- Embeddings: 150 vectors (50d)

| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |
|-------|-----------|-------------|---------|----------|-----------|----------------|
| routing handler middleware | 20 | 4 | 2 | 18 | 2 | 137 |
| context request response | 20 | 5 | 5 | 15 | 0 | 138 |
| adapter cloudflare deno | 20 | 1 | 0 | 20 | 1 | 65 |
| validator schema | 20 | 2 | 2 | 18 | 0 | 126 |
| jwt auth bearer | 20 | 4 | 4 | 16 | 0 | 130 |

---

## Pydantic (Python)

- Source files: 534 across 43 folders
- KG: 359 nodes, 1015 edges
- .ctx files generated: 37
- Embeddings: 359 vectors (50d)

| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |
|-------|-----------|-------------|---------|----------|-----------|----------------|
| validation model field | 20 | 23 | 19 | 1 | 4 | 308 |
| serialization json | 20 | 10 | 6 | 14 | 4 | 295 |
| type coercion casting | 20 | 5 | 2 | 18 | 3 | 276 |
| config settings environment | 20 | 7 | 4 | 16 | 3 | 287 |
| error custom validator | 20 | 8 | 5 | 15 | 3 | 330 |

---

## Methodology

1. Each project was shallow-cloned (`--depth 1`)
2. `generate_basic_ctx.py` created heuristic .ctx files from directory structure + import parsing (no AI)
3. `ctx-to-kg.py` built a SQLite KG and generated 50-dimensional structural contextual embeddings
4. 5 queries per project tested hybrid search (text × 1.0 + embedding × 0.6 + graph × 0.8)
5. Baseline: grep-style filename token matching against query tokens
6. **SCE-only** = results found by structural search but NOT by filename grep — the value-add

### Limitations

- Heuristic .ctx files have no semantic descriptions (just filenames). AI-generated .ctx would produce richer KGs.
- Import resolution is regex-based and misses complex patterns (re-exports, dynamic imports).
- grep baseline matches filenames only, not file contents — a stronger baseline would grep file contents.
- Results are a conservative lower bound on system capability.
