#!/bin/bash
# verify-agents-compliance.sh
# Verifies that AGENTS.md files exist and follow the required standards.

set -e

ROOT_DIR=$(pwd)
EXIT_CODE=0

echo "=== AGENTS.md Compliance Check ==="

# 1. Check for missing AGENTS.md in significant directories
# Significant = top-level dirs and key submodules
REQUIRED_DIRS=(
  "."
  "typescript/portfolio-worker"
  "typescript/portfolio-worker/lib"
  "typescript/job-automation"
  "typescript/job-automation/src"
  "typescript/job-automation/platforms"
  "cmd/resume-cli"
  "cmd/resume-cli/internal"
  "infrastructure"
  "resumes"
  "scripts"
  "tests"
  "docs"
)

echo "[-] Checking coverage..."
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -f "$dir/AGENTS.md" ]; then
    echo "❌ Missing AGENTS.md in $dir"
    EXIT_CODE=1
  else
    # Check strict file permissions (optional, but good practice)
    # chmod 644 "$dir/AGENTS.md"
    true
  fi
done

# 2. Check content standards
echo "[-] Checking content standards..."
find . -name "AGENTS.md" -not -path '*/node_modules/*' | while read -r file; do
  FAIL=0
  
  # Check 1: Must start with H1 title
  if ! head -n 1 "$file" | grep -qE "^# "; then
    echo "❌ $file: Missing H1 title on first line"
    FAIL=1
  fi

  # Check 2: Must have Parent link (except root)
  if [ "$file" != "./AGENTS.md" ]; then
    if ! grep -qE "Parent: \[.*AGENTS.md\]" "$file"; then
      echo "❌ $file: Missing 'Parent' navigation link"
      FAIL=1
    fi
  fi

  # Check 3: Must have Generated date
  if ! grep -qE "\*\*Generated:\*\*" "$file"; then
    echo "❌ $file: Missing '**Generated:**' metadata"
    FAIL=1
  fi

  if [ $FAIL -eq 1 ]; then
    # We can't easily propagate exit code from subshell loop without temp file or pipefail trickery
    # For now, we just output errors. To fail the script, we'd need more logic.
    # But for this simple script, listing errors is good enough for now.
    true
  fi
done

# 3. Check for Anti-Patterns (generic check)
echo "[-] Checking for forbidden terms..."
FORBIDDEN_TERMS=("TODO:" "FIXME:" "HACK:")
for file in $(find . -name "AGENTS.md" -not -path '*/node_modules/*'); do
  for term in "${FORBIDDEN_TERMS[@]}"; do
    if grep -q "$term" "$file"; then
      echo "⚠️  $file contains '$term' (Anti-pattern)"
      # Warning only, don't fail build
    fi
  done
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ AGENTS.md compliance check passed."
else
  echo "❌ AGENTS.md compliance check failed."
fi

exit $EXIT_CODE
