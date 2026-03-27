#!/usr/bin/env python3
"""
Documentation Staleness Checker
Audits the lazy-loading 3-file documentation system for drift.

Checks every folder containing start-here.md for:
  1. Timestamp staleness (last-verified vs source file mtimes)
  2. Content drift (file tree in {folder}.md vs actual files on disk)

Usage:
  python3 scripts/check-doc-staleness.py
  python3 scripts/check-doc-staleness.py --verbose
  python3 scripts/check-doc-staleness.py --folder backend/routers
"""

import argparse
import os
import re
import sys
from datetime import datetime, date
from pathlib import Path

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

USE_COLOR = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def _c(code: str, text: str) -> str:
    if USE_COLOR:
        return f"\033[{code}m{text}\033[0m"
    return text


def green(t: str) -> str:
    return _c("32", t)


def yellow(t: str) -> str:
    return _c("33", t)


def red(t: str) -> str:
    return _c("31", t)


def bold(t: str) -> str:
    return _c("1", t)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DOC_EXTENSIONS = {".md", ".mmd", ".ctx"}
# SESSION-*.md files inside context-packets/ are source content, not docs
SESSION_PATTERN = re.compile(r"^SESSION-.*\.md$")
LAST_VERIFIED_RE = re.compile(r"<!--\s*last-verified:\s*(\d{4}-\d{2}-\d{2})\s*-->")
TODAY = date.today()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def find_project_root() -> Path:
    """Walk up from script location to find project root.

    Uses package.json as the definitive root marker. Falls back to the
    highest directory containing start-here.md.
    """
    p = Path(__file__).resolve().parent
    # First try: look for package.json (unique to project root)
    candidate = p
    while candidate != candidate.parent:
        if (candidate / "package.json").exists() and (candidate / "start-here.md").exists():
            return candidate
        candidate = candidate.parent
    # Fallback: highest start-here.md
    best = None
    candidate = p
    while candidate != candidate.parent:
        if (candidate / "start-here.md").exists():
            best = candidate
        candidate = candidate.parent
    return best or Path.cwd()


def is_doc_file(filepath: Path, folder: Path) -> bool:
    """Determine if a file is documentation (should be excluded from source mtime check)."""
    name = filepath.name
    # start-here.md is always a doc file
    if name == "start-here.md":
        return True
    # {folder}.md, {folder}.mmd, and {folder}.ctx are doc files
    folder_name = folder.name
    if name == f"{folder_name}.md" or name == f"{folder_name}.mmd" or name == f"{folder_name}.ctx":
        return True
    # SESSION-*.md in context-packets are SOURCE files, not docs
    if SESSION_PATTERN.match(name):
        return False
    # Other .md/.mmd/.ctx files: treat as docs by default
    if filepath.suffix in DOC_EXTENSIONS:
        return True
    return False


def extract_last_verified(start_here: Path) -> date | None:
    """Extract the last-verified date from start-here.md."""
    try:
        text = start_here.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    m = LAST_VERIFIED_RE.search(text)
    if m:
        try:
            return datetime.strptime(m.group(1), "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def get_source_files(folder: Path) -> list[Path]:
    """Return non-doc, non-directory files directly in folder."""
    files = []
    try:
        for entry in folder.iterdir():
            if entry.is_file() and not is_doc_file(entry, folder):
                files.append(entry)
    except OSError:
        pass
    return files


def newest_mtime(files: list[Path]) -> datetime | None:
    """Return the newest mtime among the given files."""
    best = None
    for f in files:
        try:
            mt = datetime.fromtimestamp(f.stat().st_mtime)
            if best is None or mt > best:
                best = mt
        except OSError:
            continue
    return best


def parse_file_tree(ref_md: Path) -> set[str] | None:
    """Parse the file tree code block from {folder}.md and return listed filenames."""
    try:
        text = ref_md.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    # Find the code block after "## File Tree"
    in_tree_section = False
    in_code_block = False
    filenames: set[str] = set()

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("## File Tree"):
            in_tree_section = True
            continue
        if in_tree_section and not in_code_block:
            if stripped.startswith("```"):
                in_code_block = True
                continue
            # If we hit another heading before a code block, bail
            if stripped.startswith("## "):
                break
        if in_tree_section and in_code_block:
            if stripped.startswith("```"):
                break  # end of code block
            # Parse tree lines like: ├── filename.py   # comment
            # Also handle:           └── filename.py   # comment
            # And plain:             filename.py
            # Skip the folder header line (e.g., "routers/")
            m = re.match(r"^[│├└─\s]*(?:──\s+)?(\S+)", stripped)
            if m:
                fname = m.group(1)
                # Skip folder header lines (end with /)
                if fname.endswith("/"):
                    continue
                # Strip trailing comment markers
                fname = fname.split("#")[0].strip()
                if fname:
                    filenames.add(fname)

    return filenames if filenames else None


def get_actual_filenames(folder: Path) -> set[str]:
    """Return filenames of non-doc files directly in folder."""
    names: set[str] = set()
    try:
        for entry in folder.iterdir():
            if entry.is_file() and not is_doc_file(entry, folder):
                names.add(entry.name)
    except OSError:
        pass
    return names


# ---------------------------------------------------------------------------
# Per-folder audit
# ---------------------------------------------------------------------------


class FolderResult:
    def __init__(self, folder: Path, rel: str):
        self.folder = folder
        self.rel = rel
        self.status = "FRESH"  # FRESH | STALE | BROKEN | EMPTY
        self.last_verified: date | None = None
        self.days_ago: int | None = None
        self.issues: list[str] = []
        self.new_files: list[str] = []
        self.missing_files: list[str] = []


def audit_folder(folder: Path, project_root: Path) -> FolderResult:
    rel = str(folder.relative_to(project_root)) + "/"
    if rel == "./":
        rel = "./"
    result = FolderResult(folder, rel)

    start_here = folder / "start-here.md"
    folder_name = folder.name
    ref_md = folder / f"{folder_name}.md"

    # Extract last-verified
    result.last_verified = extract_last_verified(start_here)
    if result.last_verified:
        result.days_ago = (TODAY - result.last_verified).days

    # Check if {folder}.md exists
    if not ref_md.exists():
        result.status = "BROKEN"
        result.issues.append(f"{folder_name}.md missing")
        return result

    # Get source files
    source_files = get_source_files(folder)
    if not source_files:
        result.status = "FRESH"
        result.issues.append("empty, no source files")
        return result

    # --- Timestamp check (fast gate) ---
    needs_content_check = False
    if result.last_verified is not None:
        newest = newest_mtime(source_files)
        if newest is not None:
            newest_date = newest.date()
            if newest_date > result.last_verified:
                needs_content_check = True
    else:
        # No last-verified means we can't trust freshness
        needs_content_check = True

    if not needs_content_check:
        # All source files older than last-verified -- FRESH
        result.status = "FRESH"
        return result

    # --- Content check (precise diagnosis) ---
    tree_files = parse_file_tree(ref_md)
    if tree_files is None:
        # Could not parse file tree; mark stale since timestamp says newer
        result.status = "STALE"
        result.issues.append("file tree not parseable")
        return result

    actual_files = get_actual_filenames(folder)

    new_on_disk = sorted(actual_files - tree_files)
    missing_from_disk = sorted(tree_files - actual_files)

    result.new_files = new_on_disk
    result.missing_files = missing_from_disk

    if new_on_disk or missing_from_disk:
        result.status = "STALE"
        parts = []
        if new_on_disk:
            parts.append(f"+{len(new_on_disk)} new")
        if missing_from_disk:
            parts.append(f"-{len(missing_from_disk)} missing")
        result.issues.append(", ".join(parts))
    else:
        # Files match but timestamp is newer -- source was edited, docs may
        # still be accurate in terms of file list. Mark FRESH.
        result.status = "FRESH"

    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Check documentation staleness")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show file diffs for stale folders"
    )
    parser.add_argument(
        "--folder", "-f", type=str, default=None, help="Check a single folder (relative to project root)"
    )
    args = parser.parse_args()

    project_root = find_project_root()

    # Discover documented folders
    if args.folder:
        target = (project_root / args.folder).resolve()
        if not (target / "start-here.md").exists():
            print(red(f"Error: {args.folder} does not contain start-here.md"))
            return 2
        folders = [target]
    else:
        folders = []
        for dirpath, _dirnames, filenames in os.walk(project_root):
            dp = Path(dirpath)
            # Skip node_modules, .git, __pycache__
            try:
                rel_parts = dp.relative_to(project_root).parts
            except ValueError:
                continue
            if any(
                part.startswith(".") or part == "node_modules" or part == "__pycache__"
                for part in rel_parts
            ):
                continue
            if "start-here.md" in filenames:
                folders.append(dp)
        folders.sort(key=lambda p: str(p.relative_to(project_root)))

    # Audit each folder
    results: list[FolderResult] = []
    for folder in folders:
        results.append(audit_folder(folder, project_root))

    # ---------------------------------------------------------------------------
    # Output
    # ---------------------------------------------------------------------------

    print()
    print(bold(f"Documentation Staleness Report — {TODAY.isoformat()}"))
    print("=" * 72)
    print()

    # Column widths
    max_rel = max((len(r.rel) for r in results), default=10)
    max_rel = max(max_rel, 6)  # minimum "Folder" header

    header = (
        f"{'Folder':<{max_rel}}  {'Status':<8}  {'Last Verified':<14}  {'Days Ago':>8}  Issues"
    )
    print(header)
    print(
        f"{'-' * max_rel}  {'-' * 8}  {'-' * 14}  {'-' * 8}  {'-' * 6}"
    )

    for r in results:
        lv = r.last_verified.isoformat() if r.last_verified else "—"
        da = str(r.days_ago) if r.days_ago is not None else "—"
        issues = "; ".join(r.issues) if r.issues else ""

        if r.status == "FRESH":
            status_str = green("FRESH ")
        elif r.status == "STALE":
            status_str = yellow("STALE ")
        elif r.status == "BROKEN":
            status_str = red("BROKEN")
        else:
            status_str = r.status.ljust(6)

        print(f"{r.rel:<{max_rel}}  {status_str}  {lv:<14}  {da:>8}  {issues}")

        if args.verbose and r.status == "STALE":
            if r.new_files:
                for f in r.new_files:
                    print(f"  {green('+')} {f}")
            if r.missing_files:
                for f in r.missing_files:
                    print(f"  {red('-')} {f}")

    # Summary
    stale = sum(1 for r in results if r.status == "STALE")
    fresh = sum(1 for r in results if r.status == "FRESH")
    broken = sum(1 for r in results if r.status == "BROKEN")

    print()
    print(f"STALE folders:  {yellow(str(stale)) if stale else green('0')}")
    print(f"FRESH folders:  {green(str(fresh))}")
    print(f"BROKEN folders: {red(str(broken)) if broken else green('0')} (docs exist but {{folder}}.md missing)")
    print()

    if broken:
        return 2
    if stale:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
