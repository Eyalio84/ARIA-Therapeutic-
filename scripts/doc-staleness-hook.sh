#!/usr/bin/env bash
# Doc staleness hook — PreToolUse on Read
# Checks if a documentation file (start-here.md, *.mmd, {folder}.md) is stale
# by comparing last-verified date against source file mtimes.
# Outputs JSON warning if stale, nothing if fresh.

set -euo pipefail

# Read stdin (hook input JSON) and extract file_path with jq (~5ms vs ~70ms python)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Only check doc files: start-here.md, *.mmd, *.ctx, or {folder}.md where folder matches parent dir
BASENAME=$(basename "$FILE_PATH")
DIRNAME=$(dirname "$FILE_PATH")
FOLDERNAME=$(basename "$DIRNAME")

IS_DOC=false
if [ "$BASENAME" = "start-here.md" ]; then
  IS_DOC=true
elif [[ "$BASENAME" == *.mmd ]]; then
  IS_DOC=true
elif [[ "$BASENAME" == *.ctx ]]; then
  IS_DOC=true
elif [ "$BASENAME" = "${FOLDERNAME}.md" ]; then
  IS_DOC=true
fi

[ "$IS_DOC" = false ] && exit 0

# File must exist
[ ! -f "$FILE_PATH" ] && exit 0

# Extract last-verified date from the file
VERIFIED_DATE=$(grep -oP '(?<=last-verified: )\d{4}-\d{2}-\d{2}' "$FILE_PATH" 2>/dev/null | head -1)
[ -z "$VERIFIED_DATE" ] && exit 0

# Create a temp file with the verified date as its mtime
TOUCH_FILE=$(mktemp)
touch -d "$VERIFIED_DATE" "$TOUCH_FILE" 2>/dev/null || { rm -f "$TOUCH_FILE"; exit 0; }

# Find source files newer than last-verified date (non-doc files only, no recursion)
NEWER_FILES=$(find "$DIRNAME" -maxdepth 1 -type f \
  -newer "$TOUCH_FILE" \
  ! -name '*.md' \
  ! -name '*.mmd' \
  ! -name '*.ctx' \
  2>/dev/null | head -5)

rm -f "$TOUCH_FILE"

# If no newer files, doc is fresh — silent exit
[ -z "$NEWER_FILES" ] && exit 0

# Count stale files
STALE_COUNT=$(echo "$NEWER_FILES" | wc -l)

# Output warning as JSON
RELATIVE_DIR=$(echo "$DIRNAME" | sed "s|^/root/aria-personal/||")
cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"STALENESS WARNING: ${BASENAME} last verified ${VERIFIED_DATE}, but ${STALE_COUNT} source file(s) modified since. Run: python3 scripts/check-doc-staleness.py --folder ${RELATIVE_DIR}"}}
EOF
