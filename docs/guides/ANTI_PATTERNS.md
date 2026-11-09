# Anti-Patterns and Gotchas Reference

**Last reviewed**: 2026-11-09

This guide mixes current repository rules with retired procedures. Follow the
[repository instructions](../../AGENTS.md), the
[content-pack guide](CONTENT_PACK.md), and the
[1Password secret guide](ONEPASSWORD_RESUME_SECRETS.md) when they cover the
same operation. Historical examples below are not deployment instructions.

## Purpose

This document catalogs **forbidden patterns**, **deprecated practices**, and
**common pitfalls** discovered in the resume project codebase. These rules
prevent breaking changes and security issues.

---

## 🔴 CRITICAL (Will Break Production)

### 1. Never edit generated artifacts

**Rule**: Edit the owning source and regenerate its outputs. The Worker entry
is assembled from the root configuration and portfolio sources; the generated
bundle is not an editing target.

**Why It Breaks**:

For content, use the [content-pack workflow](CONTENT_PACK.md). The
[portfolio instructions](../../apps/portfolio/AGENTS.md) identify generated
outputs and their owners. Production deployment is described in the
[deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md).

---

### 2. Preserve exact bytes for CSP hashes

**Rule**: Do not trim or otherwise change inline script/style content before
calculating its CSP hash. Hash the exact bytes that the browser evaluates.

**Why It Breaks**:

Browsers calculate CSP hashes from the **exact** script/style content including
all whitespace. Using `.trim()` before hashing causes CSP violations:

```javascript
// ❌ WRONG - Causes CSP violation
const scriptContent = scriptMatch[1].trim();
const hash = generateHash(scriptContent); // Hash doesn't match browser's hash

// ✅ CORRECT - Preserves exact whitespace
const scriptContent = scriptMatch[1]; // NO TRIM!
const hash = generateHash(scriptContent);
```

**Error You'll See**:

```text
Refused to execute inline script because it violates the following
Content Security Policy directive: "script-src 'sha256-abc123...'"
```

**Technical Details**:

The browser calculates:

```javascript
SHA256("<script>\n  console.log('hello');\n</script>");
```

If you trim, your hash is from:

```javascript
SHA256("console.log('hello');"); // Different hash!
```

See the current [portfolio source ownership guide](../../apps/portfolio/AGENTS.md).

---

### 3. Keep credentials out of files and output

Do not paste credentials into tracked or local plaintext files, shell history,
logs, or command output. Use the repository's secret-safe
[1Password runner](ONEPASSWORD_RESUME_SECRETS.md); tracked environment
templates contain references, not resolved values. Some existing integrations
still accept the legacy Cloudflare API key and email pair, while new deployment
work should prefer a scoped API token. Do not infer that legacy support is
absent or print a credential to inspect it.

---

## 🟡 WARNING (Will Cause Issues)

### 4. Avoid machine-specific paths in shared scripts

**Affected Files**:

- `tools/scripts/build/*`

**Rule**: Use relative paths from project root, never absolute paths.

**Why It Breaks**:

Breaks on CI/CD and other developers' machines:

```bash
# ❌ WRONG - Absolute path
#!/bin/bash
cd /home/jclee/dev/resume/apps/portfolio
npm run build

# ✅ CORRECT - Relative from project root
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT/apps/portfolio"
npm run build
```

**References**:

- `tools/scripts/build/AGENTS.md:45`

---

### 5. Use the owned content materialization workflow

**Affected Files**:

- `packages/data/resumes/master/resume_data.json`

**Rule**: Follow the content manifest and its owning commands. Local materialized
files are not necessarily tracked source; do not hand-edit generated files.

**Why It Breaks**:

Use the [content-pack guide](CONTENT_PACK.md) and
[data ownership instructions](../../packages/data/AGENTS.md) to select the
current source and materialization step.

---

## 🟢 BEST PRACTICES

### 6. Do not follow retired build procedures

The Bazel examples formerly in this section are archived and are not a current
test-selection procedure. Use the repository's documented
[validation commands](../../AGENTS.md#commands) and the owning package guide.

**References**:

- `.bazelrc`
- `MODULE.bazel`

---

### 7. Follow review ownership before merging

**Affected Files**:

- `OWNERS` (all packages)

**Rule**: Changes require approval from at least 1 OWNERS member of the affected
directory.

**Why**:

- Prevents breaking changes
- Enforces code review standards
- Maintains architectural consistency

**How to Check**:

```bash
# Find OWNERS for changed files
git diff --name-only origin/master...HEAD | while read file; do
  dir=$(dirname "$file")
  while [ "$dir" != "." ]; do
    if [ -f "$dir/OWNERS" ]; then
      echo "$file → $dir/OWNERS"
      break
    fi
    dir=$(dirname "$dir")
  done
done
```

**References**:

- `OWNERS` (root and package-level)

---

## Verification checklist

Before deploying changes, verify:

- [ ] Generated outputs are changed through their owning source
- [ ] Resume data changes synced with `npm run sync:data`
- [ ] No `.trim()` calls before CSP hash calculations
- [ ] Secrets are resolved through the approved secret workflow
- [ ] Build scripts use relative paths
- [ ] Current owning tests and checks have been run
- [ ] OWNERS approval obtained

---

## Related documentation

- [Content pack](CONTENT_PACK.md)
- [1Password secret handling](ONEPASSWORD_RESUME_SECRETS.md)
- [Current deployment pipeline](../architecture/DEPLOYMENT_PIPELINE.md)
- [Repository instructions](../../AGENTS.md)

---

## Historical note

The former session-storage finding and proposed fix were based on an
unverified historical note. They are not a current vulnerability assessment;
consult current security policy and implementation before making a claim.

---

## 📝 CONTRIBUTING

Found a new anti-pattern? Add it to this document:

1. Categorize by severity (🔴 CRITICAL / 🟡 WARNING / 🟢 BEST PRACTICE)
2. Include affected files
3. Show ❌ WRONG and ✅ CORRECT examples
4. Explain why it breaks
5. Add references to source files

---

**Last review**: 2026-11-09
