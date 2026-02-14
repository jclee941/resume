# Lint Warning Ratchet Strategy

## Concept

A **lint ratchet** prevents warning count from increasing while allowing gradual reduction.
New code must not introduce new warnings; existing warnings are fixed opportunistically.

## Current State (2026-02)

- ESLint flat config: `eslint.config.cjs`
- CI job: `lint` in `.github/workflows/ci.yml`
- Current behavior: lint runs but warnings don't fail the build
- No baseline count tracked

## Implementation Plan

### Phase 1: Establish Baseline

```bash
# Run ESLint and capture warning count
npx eslint . --format json 2>/dev/null | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const warnings = data.reduce((sum, file) => sum + file.warningCount, 0);
  const errors = data.reduce((sum, file) => sum + file.errorCount, 0);
  console.log(JSON.stringify({ errors, warnings, date: new Date().toISOString() }));
"
```

Save the output to `tools/lint-baseline.json`:

```json
{
  "errors": 0,
  "warnings": 42,
  "date": "2026-02-15T00:00:00.000Z"
}
```

### Phase 2: CI Enforcement

Add a ratchet check step to the `lint` job in `ci.yml`:

```yaml
- name: Lint ratchet check
  run: |
    BASELINE=$(node -e "console.log(require('./tools/lint-baseline.json').warnings)")
    CURRENT=$(npx eslint . --format json 2>/dev/null | node -e "
      const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
      console.log(data.reduce((sum, f) => sum + f.warningCount, 0));
    ")
    echo "Baseline: $BASELINE, Current: $CURRENT"
    if [ "$CURRENT" -gt "$BASELINE" ]; then
      echo "::error::Lint warnings increased from $BASELINE to $CURRENT. Fix new warnings before merging."
      exit 1
    fi
    if [ "$CURRENT" -lt "$BASELINE" ]; then
      echo "::notice::Lint warnings decreased from $BASELINE to $CURRENT. Update tools/lint-baseline.json!"
    fi
```

### Phase 3: Gradual Reduction

**Rules of engagement:**

1. **New code**: Zero warnings required (enforced by ratchet)
2. **Touched files**: Fix warnings in files you modify (boy scout rule)
3. **Dedicated cleanup**: Monthly PR to reduce baseline by 10-20%
4. **Baseline updates**: When warnings decrease, update `lint-baseline.json` in the same PR

**Priority order for fixing existing warnings:**

| Priority | Warning Type          | Rationale                     |
| -------- | --------------------- | ----------------------------- |
| 1        | `no-unused-vars`      | Dead code, easy to fix        |
| 2        | `no-console`          | Replace with structured logs  |
| 3        | `prefer-const`        | Trivial, improves readability |
| 4        | Type-related warnings | Catch bugs                    |
| 5        | Style warnings        | Lowest impact                 |

### Phase 4: Zero Warnings

Once baseline reaches 0:

1. Change ESLint config: promote all warnings to errors
2. Remove ratchet mechanism (no longer needed)
3. Delete `tools/lint-baseline.json`

## Timeline Target

- Phase 1: Immediate (establish baseline)
- Phase 2: Next CI update PR
- Phase 3: Ongoing (monthly reduction)
- Phase 4: When warnings reach 0
