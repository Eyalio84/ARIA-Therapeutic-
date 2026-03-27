#!/usr/bin/env bash
# Pre-commit hook: warns if source files changed in a documented folder
# but the corresponding context files (start-here.md, .ctx, .md) were not updated.
#
# Does NOT block the commit — just prints a warning. Use --no-verify to skip.
set -euo pipefail

YELLOW='\033[1;33m'
RESET='\033[0m'
WARN=0

# Get staged files (added, modified, renamed)
STAGED=$(git diff --cached --name-only --diff-filter=AMR)

# Find documented folders (those with a start-here.md in git)
DOCUMENTED_FOLDERS=$(git ls-files '*/start-here.md' | sed 's|/start-here.md$||' | sort -u)

for folder in $DOCUMENTED_FOLDERS; do
  foldername=$(basename "$folder")

  # Check if any source files in this folder are staged
  source_changed=$(echo "$STAGED" | grep "^${folder}/" | grep -v '\.md$' | grep -v '\.ctx$' | head -1 || true)
  [ -z "$source_changed" ] && continue

  # Check if any of the 3 context files are also staged
  doc_changed=$(echo "$STAGED" | grep -E "^${folder}/(start-here\.md|${foldername}\.ctx|${foldername}\.md)$" | head -1 || true)

  if [ -z "$doc_changed" ]; then
    WARN=1
    echo -e "${YELLOW}⚠ ctx drift: ${folder}/ has source changes but no context doc updates${RESET}"
    echo "  Consider running: /ctx -update ${folder}"
  fi
done

if [ "$WARN" -eq 1 ]; then
  echo ""
  echo -e "${YELLOW}Commit proceeding — update docs when ready, or run /ctx -update${RESET}"
fi

exit 0
