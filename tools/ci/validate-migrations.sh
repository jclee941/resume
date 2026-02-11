#!/usr/bin/env bash
# validate-migrations.sh — CI validation for D1 migration files
# Ensures all migration SQL files are syntactically valid
# Usage: ./tools/ci/validate-migrations.sh

set -euo pipefail

MIGRATIONS_DIR="infrastructure/database/migrations"
ERRORS=0

echo "🔍 Validating D1 migration files..."

# Check migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

# Collect all .sql files (up and down)
SQL_FILES=$(find "$MIGRATIONS_DIR" -name '*.sql' -type f | sort)

if [ -z "$SQL_FILES" ]; then
  echo "⚠️  No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

# Validate naming convention: NNNN_description.sql or NNNN_description.down.sql
for file in $SQL_FILES; do
  basename=$(basename "$file")

  if ! echo "$basename" | grep -qE '^[0-9]{4}_[a-z][a-z0-9_]*\.(down\.)?sql$'; then
    echo "❌ Invalid naming convention: $basename"
    echo "   Expected: NNNN_description.sql or NNNN_description.down.sql"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check file is not empty
  if [ ! -s "$file" ]; then
    echo "❌ Empty migration file: $basename"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check for common SQL syntax issues
  # 1. Unclosed parentheses (tr avoids grep exit-code issues under pipefail)
  OPEN_PARENS=$(tr -cd '(' < "$file" | wc -c)
  CLOSE_PARENS=$(tr -cd ')' < "$file" | wc -c)
  if [ "$OPEN_PARENS" -ne "$CLOSE_PARENS" ]; then
    echo "❌ Mismatched parentheses in $basename (open=$OPEN_PARENS, close=$CLOSE_PARENS)"
    ERRORS=$((ERRORS + 1))
  fi

  # 2. Verify each up migration has a corresponding down migration
  if echo "$basename" | grep -qE '^[0-9]{4}_.*\.sql$' && ! echo "$basename" | grep -q '.down.sql'; then
    DOWN_FILE="${file%.sql}.down.sql"
    if [ ! -f "$DOWN_FILE" ]; then
      echo "⚠️  Missing down migration for: $basename"
    fi
  fi

  # 3. Check for dangerous patterns in up migrations
  if ! echo "$basename" | grep -q '.down.sql'; then
    if grep -qiE '^\s*DROP\s+TABLE\s' "$file" 2>/dev/null && ! grep -qiE '^\s*DROP\s+TABLE\s+IF\s+EXISTS' "$file" 2>/dev/null; then
      echo "⚠️  DROP TABLE without IF EXISTS in: $basename"
    fi
  fi

  echo "✅ $basename"
done

# Validate migration sequence has no gaps
UP_FILES=$(find "$MIGRATIONS_DIR" -name '*.sql' ! -name '*.down.sql' -type f | sort)
PREV_NUM=-1
for file in $UP_FILES; do
  NUM=$(basename "$file" | grep -oE '^[0-9]+')
  NUM=$((10#$NUM))  # Force decimal interpretation
  if [ "$PREV_NUM" -ge 0 ] && [ "$NUM" -ne $((PREV_NUM + 1)) ]; then
    echo "⚠️  Gap in migration sequence: $PREV_NUM → $NUM"
  fi
  PREV_NUM=$NUM
done

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "❌ Validation failed with $ERRORS error(s)"
  exit 1
else
  TOTAL=$(echo "$SQL_FILES" | wc -l)
  echo "✅ All $TOTAL migration files validated successfully"
  exit 0
fi
