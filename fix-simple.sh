#!/bin/bash

# Get list of all files with TS2769 errors
FILES=$(npx tsc --noEmit 2>&1 | grep "TS2769" | cut -d'(' -f1 | sort -u)

echo "Files to fix:"
echo "$FILES"
echo ""

# Count total
TOTAL=$(echo "$FILES" | wc -l)
echo "Total files: $TOTAL"
