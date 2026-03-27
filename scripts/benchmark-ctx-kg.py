#!/usr/bin/env python3
"""
Benchmark: Structural Contextual Embeddings on Open Source Projects
===================================================================
Validates the ctx-to-kg pipeline generalizes beyond aria-personal.

For each project:
1. Shallow clone
2. Generate heuristic .ctx files (no AI)
3. Build KG + embeddings
4. Run query battery
5. Compare against text-only search (grep)
6. Report: grep-would-miss metrics

Usage:
  python3 scripts/benchmark-ctx-kg.py
  python3 scripts/benchmark-ctx-kg.py --output docs/BENCHMARK-RESULTS.md
"""

import os
import sys
import json
import re
import math
import shutil
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Add scripts dir to path so we can import our tools
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

sys.path.insert(0, str(SCRIPT_DIR))
# Import with hyphenated filename
import importlib
import importlib.util
generate_basic_ctx = importlib.import_module("generate_basic_ctx")
generate_ctx_main = generate_basic_ctx.main
scan_project = generate_basic_ctx.scan_project

# ctx-to-kg has a hyphen — load via importlib.util
ctx_kg_spec = importlib.util.spec_from_file_location("ctx_to_kg", str(SCRIPT_DIR / "ctx-to-kg.py"))
ctx_kg = importlib.util.module_from_spec(ctx_kg_spec)
ctx_kg_spec.loader.exec_module(ctx_kg)

# ============================================================================
# BENCHMARK CONFIGURATION
# ============================================================================

REPOS = [
    {
        "name": "FastAPI",
        "url": "https://github.com/tiangolo/fastapi.git",
        "language": "Python",
        "queries": [
            "routing request handling",
            "dependency injection",
            "security authentication",
            "middleware error handling",
            "openapi schema generation",
        ],
    },
    {
        "name": "Zustand",
        "url": "https://github.com/pmndrs/zustand.git",
        "language": "TypeScript",
        "queries": [
            "store creation state",
            "middleware persist",
            "subscribe selector",
            "devtools debugging",
            "context provider react",
        ],
    },
    {
        "name": "Excalidraw",
        "url": "https://github.com/excalidraw/excalidraw.git",
        "language": "React/TypeScript",
        "queries": [
            "canvas rendering drawing",
            "element selection transform",
            "collaboration sharing",
            "export import file",
            "history undo redo",
        ],
    },
    {
        "name": "Hono",
        "url": "https://github.com/honojs/hono.git",
        "language": "TypeScript",
        "queries": [
            "routing handler middleware",
            "context request response",
            "adapter cloudflare deno",
            "validator schema",
            "jwt auth bearer",
        ],
    },
    {
        "name": "Pydantic",
        "url": "https://github.com/pydantic/pydantic.git",
        "language": "Python",
        "queries": [
            "validation model field",
            "serialization json",
            "type coercion casting",
            "config settings environment",
            "error custom validator",
        ],
    },
]

WORK_DIR = "/tmp/ctx-benchmark"

# ============================================================================
# HELPERS
# ============================================================================

def clone_repo(repo: Dict, work_dir: str) -> str:
    """Shallow clone a repo. Returns the local path."""
    name = repo["name"].lower().replace(" ", "-")
    local_path = os.path.join(work_dir, name)

    if os.path.exists(local_path):
        print(f"    Using cached clone: {local_path}")
        return local_path

    print(f"    Cloning {repo['url']}...")
    result = subprocess.run(
        ["git", "clone", "--depth", "1", "--single-branch", repo["url"], local_path],
        capture_output=True, text=True, timeout=120
    )
    if result.returncode != 0:
        print(f"    ERROR cloning: {result.stderr[:200]}")
        return None

    return local_path


def grep_search(query: str, project_root: str) -> set:
    """Simple text search — tokenize query and grep for each token."""
    tokens = set(re.findall(r'[a-z][a-z0-9]+', query.lower()))
    matches = set()

    for dirpath, dirnames, filenames in os.walk(project_root):
        dirnames[:] = [d for d in dirnames if d not in {
            'node_modules', '.git', '__pycache__', 'dist', 'build', '.next', 'venv', 'target'
        }]
        for f in filenames:
            ext = os.path.splitext(f)[1]
            if ext not in {'.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java'}:
                continue
            stem = os.path.splitext(f)[0]
            stem_tokens = set(re.findall(r'[a-z][a-z0-9]+', stem.lower()))
            if tokens & stem_tokens:
                matches.add(stem)

    return matches


def run_query(db_path: str, emb_path: str, query: str, top_k: int = 20) -> Dict:
    """Run a structural contextual embedding query."""
    try:
        nodes, embeddings, conn = ctx_kg._load_kg_and_embeddings(db_path, emb_path)
        result = ctx_kg._score_query(query, nodes, embeddings, conn, top_k)
        conn.close()
        return result
    except Exception as e:
        return {"query": query, "results": [], "metadata": {"error": str(e)}}


# ============================================================================
# BENCHMARK RUNNER
# ============================================================================

def benchmark_project(repo: Dict, work_dir: str) -> Dict:
    """Run full benchmark on one project."""
    print(f"\n{'='*60}")
    print(f"  Benchmarking: {repo['name']} ({repo['language']})")
    print(f"{'='*60}")

    # Step 1: Clone
    local_path = clone_repo(repo, work_dir)
    if not local_path:
        return {"name": repo["name"], "error": "clone failed"}

    # Step 2: Scan project
    folders = scan_project(local_path)
    total_files = sum(len(v) for v in folders.values())
    print(f"    Scanned: {total_files} source files in {len(folders)} folders")

    if total_files == 0:
        return {"name": repo["name"], "error": "no source files found"}

    # Step 3: Generate heuristic .ctx files
    print(f"    Generating heuristic .ctx files...")
    sys.argv = ['generate_basic_ctx.py', '--root', local_path, '--min-files', '2']
    try:
        ctx_count = generate_ctx_main()
    except SystemExit:
        ctx_count = 0
    print(f"    Generated {ctx_count} .ctx files")

    if ctx_count == 0:
        return {"name": repo["name"], "error": "no .ctx files generated", "source_files": total_files}

    # Step 4: Build KG + embeddings
    db_path = os.path.join(local_path, "ctx-kg.db")
    emb_path = os.path.join(local_path, "data", "ctx_embeddings.json")

    print(f"    Building KG...")
    try:
        node_count, edge_count = ctx_kg.build_kg(local_path, db_path)
        print(f"    KG: {node_count} nodes, {edge_count} edges")
    except Exception as e:
        return {"name": repo["name"], "error": f"KG build failed: {e}"}

    if node_count == 0:
        return {"name": repo["name"], "error": "empty KG"}

    print(f"    Generating embeddings...")
    try:
        emb_count = ctx_kg.generate_embeddings(db_path, emb_path, dim=50)
        print(f"    Embeddings: {emb_count} vectors (50d)")
    except Exception as e:
        return {"name": repo["name"], "error": f"embedding generation failed: {e}"}

    # Step 5: Run query battery
    print(f"    Running {len(repo['queries'])} queries...")
    query_results = []

    for query in repo["queries"]:
        # Structural contextual embedding search
        sce_result = run_query(db_path, emb_path, query, top_k=20)
        sce_names = {r["name"] for r in sce_result.get("results", [])}

        # Grep baseline
        grep_names = grep_search(query, local_path)

        # Compare
        overlap = sce_names & grep_names
        sce_only = sce_names - grep_names  # SCE found, grep missed
        grep_only = grep_names - sce_names  # grep found, SCE missed

        meta = sce_result.get("metadata", {})
        query_results.append({
            "query": query,
            "sce_count": len(sce_names),
            "grep_count": len(grep_names),
            "overlap": len(overlap),
            "sce_only": len(sce_only),
            "grep_only": len(grep_only),
            "grep_would_miss": meta.get("grep_would_miss", 0),
            "text_matches": meta.get("text_matches", 0),
            "embed_neighbors": meta.get("embed_neighbors", 0),
            "graph_connected": meta.get("graph_connected", 0),
        })

        print(f"      \"{query}\" → SCE:{len(sce_names)} grep:{len(grep_names)} overlap:{len(overlap)} SCE-only:{len(sce_only)}")

    return {
        "name": repo["name"],
        "language": repo["language"],
        "source_files": total_files,
        "folders": len(folders),
        "ctx_files": ctx_count,
        "nodes": node_count,
        "edges": edge_count,
        "embeddings": emb_count,
        "queries": query_results,
    }


# ============================================================================
# REPORT GENERATOR
# ============================================================================

def generate_report(results: List[Dict]) -> str:
    """Generate markdown benchmark report."""
    lines = [
        "# Structural Contextual Embeddings — Benchmark Results",
        "",
        f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"> Method: Heuristic .ctx generation (no AI) → ctx-to-kg.py → hybrid query",
        "",
        "---",
        "",
        "## Summary",
        "",
        "| Project | Language | Files | Nodes | Edges | Queries | Avg SCE-only | Avg grep-would-miss |",
        "|---------|----------|-------|-------|-------|---------|-------------|-------------------|",
    ]

    total_sce_only = 0
    total_queries = 0

    for r in results:
        if "error" in r:
            lines.append(f"| {r['name']} | — | — | — | — | ERROR: {r['error']} | — | — |")
            continue

        queries = r["queries"]
        avg_sce_only = sum(q["sce_only"] for q in queries) / max(len(queries), 1)
        avg_gwm = sum(q["grep_would_miss"] for q in queries) / max(len(queries), 1)
        total_sce_only += sum(q["sce_only"] for q in queries)
        total_queries += len(queries)

        lines.append(
            f"| **{r['name']}** | {r['language']} | {r['source_files']} | {r['nodes']} | {r['edges']} "
            f"| {len(queries)} | {avg_sce_only:.1f} | {avg_gwm:.1f} |"
        )

    lines += [
        "",
        f"**Total queries:** {total_queries}",
        f"**Total SCE-only results (grep would miss):** {total_sce_only}",
        "",
        "---",
        "",
    ]

    # Per-project detail
    for r in results:
        if "error" in r:
            lines += [f"## {r['name']}", f"", f"Error: {r['error']}", "", "---", ""]
            continue

        lines += [
            f"## {r['name']} ({r['language']})",
            "",
            f"- Source files: {r['source_files']} across {r['folders']} folders",
            f"- KG: {r['nodes']} nodes, {r['edges']} edges",
            f"- .ctx files generated: {r['ctx_files']}",
            f"- Embeddings: {r['embeddings']} vectors (50d)",
            "",
            "| Query | SCE results | grep results | Overlap | SCE-only | grep-only | grep-would-miss |",
            "|-------|-----------|-------------|---------|----------|-----------|----------------|",
        ]

        for q in r["queries"]:
            lines.append(
                f"| {q['query']} | {q['sce_count']} | {q['grep_count']} | {q['overlap']} "
                f"| {q['sce_only']} | {q['grep_only']} | {q['grep_would_miss']} |"
            )

        lines += ["", "---", ""]

    # Methodology
    lines += [
        "## Methodology",
        "",
        "1. Each project was shallow-cloned (`--depth 1`)",
        "2. `generate_basic_ctx.py` created heuristic .ctx files from directory structure + import parsing (no AI)",
        "3. `ctx-to-kg.py` built a SQLite KG and generated 50-dimensional structural contextual embeddings",
        "4. 5 queries per project tested hybrid search (text × 1.0 + embedding × 0.6 + graph × 0.8)",
        "5. Baseline: grep-style filename token matching against query tokens",
        "6. **SCE-only** = results found by structural search but NOT by filename grep — the value-add",
        "",
        "### Limitations",
        "",
        "- Heuristic .ctx files have no semantic descriptions (just filenames). AI-generated .ctx would produce richer KGs.",
        "- Import resolution is regex-based and misses complex patterns (re-exports, dynamic imports).",
        "- grep baseline matches filenames only, not file contents — a stronger baseline would grep file contents.",
        "- Results are a conservative lower bound on system capability.",
    ]

    return "\n".join(lines) + "\n"


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Benchmark structural contextual embeddings on open source projects")
    parser.add_argument('--output', default='docs/BENCHMARK-RESULTS.md', help='Output report path')
    parser.add_argument('--work-dir', default=WORK_DIR, help=f'Working directory for clones (default: {WORK_DIR})')
    parser.add_argument('--repos', type=int, default=5, help='Number of repos to benchmark (default: 5)')
    args = parser.parse_args()

    os.makedirs(args.work_dir, exist_ok=True)

    print("="*60)
    print("  Structural Contextual Embeddings — Benchmark")
    print(f"  {args.repos} projects, {WORK_DIR}")
    print("="*60)

    results = []
    for repo in REPOS[:args.repos]:
        try:
            result = benchmark_project(repo, args.work_dir)
            results.append(result)
        except Exception as e:
            print(f"  ERROR on {repo['name']}: {e}")
            results.append({"name": repo["name"], "error": str(e)})

    # Generate report
    report = generate_report(results)
    report_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), args.output)
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        f.write(report)

    print(f"\n{'='*60}")
    print(f"  Report written to: {report_path}")
    print(f"{'='*60}")

    # Print quick summary
    for r in results:
        if "error" in r:
            print(f"  {r['name']}: ERROR — {r['error']}")
        else:
            avg_sce = sum(q["sce_only"] for q in r["queries"]) / max(len(r["queries"]), 1)
            print(f"  {r['name']}: {r['nodes']} nodes, {r['edges']} edges, avg SCE-only: {avg_sce:.1f}")


if __name__ == "__main__":
    main()
