#!/usr/bin/env bash
set -euo pipefail

PATTERN='(AIza[0-9A-Za-z\-_]{20,})|(sk-[0-9A-Za-z]{20,})|(-----BEGIN PRIVATE KEY-----)|(client_id=[0-9A-Za-z\-_]{20,})'

mapfile -t files < <(
  git ls-files \
    | grep -Ev '^(docs/|README|CHANGELOG|.*\.md$|.*\.mdx$|.*\.txt$)'
)

if [ "${#files[@]}" -eq 0 ]; then
  exit 0
fi

if rg --files-with-matches --color=never -n -e "$PATTERN" "${files[@]}" >/tmp/secret_hits.txt; then
  echo "Potential secret patterns detected in the following files:" >&2
  cat /tmp/secret_hits.txt >&2
  rm -f /tmp/secret_hits.txt
  exit 1
fi

rm -f /tmp/secret_hits.txt 2>/dev/null || true

echo "No potential secrets detected."
