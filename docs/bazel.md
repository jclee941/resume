# Bazel Build System Guide

This project uses Bazel as a build coordination layer with npm as the underlying execution engine.

## Quick Start

```bash
# List all targets
bazel query "//..."

# Build portfolio worker
bazel run //:build

# Run tests
bazel run //:test

# Deploy all
bazel run //:deploy
```

## Architecture

### Build Strategy: Thin Wrapper

```
┌─────────────────────────────────────────────────┐
│                    Bazel                         │
│  - Target queryability                          │
│  - Dependency graph                             │
│  - Affected-target analysis                     │
├─────────────────────────────────────────────────┤
│                    npm                           │
│  - Actual build execution                       │
│  - Package management                           │
│  - TypeScript compilation                       │
└─────────────────────────────────────────────────┘
```

### Why This Approach?

| Aspect                | Full Hermetic | Thin Wrapper (Current) |
| --------------------- | ------------- | ---------------------- |
| Setup complexity      | High          | Low                    |
| Build reproducibility | Perfect       | npm-dependent          |
| Query support         | Yes           | Yes                    |
| Affected analysis     | Yes           | Yes                    |
| Migration effort      | Weeks         | Hours                  |

## Target Structure

```
//:build              → alias → //tools:build
//:test               → alias → //tools:test
//:deploy             → alias → //tools:deploy

//packages/cli:cli
//packages/cli:sources

//packages/data:sources
//packages/data:resume_data
//packages/data:schemas

//apps/job-server:sources
//apps/job-server:test
//apps/job-server:deploy

//apps/portfolio:sources
//apps/portfolio:build
//apps/portfolio:deploy

//tools:build
//tools:test
//tools:deploy
//tools:all_scripts

//third_party:licenses
```

## Common Commands

### Query

```bash
# All targets
bazel query "//..."

# Targets in a package
bazel query "//apps/job-server:*"

# Dependencies of a target
bazel query "deps(//apps/portfolio:build)"

# Reverse dependencies (what depends on this)
bazel query "rdeps(//..., //packages/data:sources)"

# Find targets affected by changes
./tools/ci/affected.sh origin/master
```

### Build

```bash
# Build specific target
bazel build //apps/portfolio:build

# Build with CI config
bazel build --config=ci //...

# Build with release config
bazel build --config=release //...
```

### Run

```bash
# Run sh_binary targets
bazel run //:build
bazel run //:test
bazel run //:deploy
```

## Configuration Files

### MODULE.bazel

```python
module(
    name = "resume",
    version = "1.0.0",
)

bazel_dep(name = "rules_shell", version = "0.6.1")
```

### .bazelrc

```bash
# CI configuration
build:ci --disk_cache=.bazel-cache
build:ci --spawn_strategy=local

# Release configuration
build:release --compilation_mode=opt

# Local development
build:local --disk_cache=~/.cache/bazel
```

## CI/CD Integration

### GitHub Actions

The `analyze:affected` stage runs on merge requests:

```yaml
analyze:affected:
  stage: analyze
  script:
    - ./tools/ci/affected.sh origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-master}
  artifacts:
    paths:
      - .affected/
```

### Affected Target Analysis

```bash
# Run analysis
./tools/ci/affected.sh origin/master

# Output files
.affected/
├── changed_files.txt      # List of changed files
├── all_affected.txt       # All affected targets
├── build_targets.txt      # Build targets only
├── test_targets.txt       # Test targets only
└── affected_targets.json  # JSON summary
```

## Adding New Packages

### 1. Create Directory Structure

```
apps/new-app/          # or packages/new-package/
├── BUILD.bazel
├── OWNERS
├── README.md
├── package.json
└── src/
```

### 2. BUILD.bazel Template

```python
# New Package
load("@rules_shell//shell:sh_binary.bzl", "sh_binary")

package(default_visibility = ["//typescript:__subpackages__"])

filegroup(
    name = "sources",
    srcs = glob(["src/**/*", "package.json"]),
)

sh_binary(
    name = "build",
    srcs = ["//tools:scripts/bazel/build.sh"],
    data = [":sources"],
)
```

### 3. OWNERS Template

```
# Package: new-package
# Owner contact info

jclee@jclee.me

per-file BUILD.bazel = jclee@jclee.me
```

## Troubleshooting

### "sh_binary not found"

Ensure `load("@rules_shell//shell:sh_binary.bzl", "sh_binary")` is at the top of BUILD.bazel.

### "glob matched no files"

Add `allow_empty = True` to the glob:

```python
srcs = glob(["src/**/*"], allow_empty = True),
```

### "target is a subpackage"

Cannot reference files across package boundaries. Use:

- `exports_files()` in the source package
- `filegroup` with proper visibility
- `alias` for cross-package targets

### Query returns nothing

```bash
# Check if Bazel can parse BUILD files
bazel query "//..." --output=build

# Verbose output
bazel query "//..." --verbose_failures
```

## Future: Hermetic Builds

To migrate to fully hermetic builds:

1. Switch to pnpm
2. Add rules_js to MODULE.bazel
3. Generate pnpm-lock.yaml
4. Use `npm_translate_lock` in WORKSPACE

```python
# Future MODULE.bazel
bazel_dep(name = "aspect_rules_js", version = "2.0.0")
bazel_dep(name = "aspect_rules_ts", version = "3.0.0")
```

This provides:

- Perfect reproducibility
- Remote caching
- Parallel builds
- No npm required on CI
