# Architectural Review & Strategic Plan (Jan 2026)

**Status**: CRITICAL
**Date**: 2026-01-23

## 🚨 1. Critical Incident: Missing CLI Source

**Severity**: BLOCKER
**Issue**: The `resume-cli` binary (v1.0.0) exists in `apps/cli`, but **all Go source code (`*.go`) and the `cmd/` directory are missing**.
**Impact**:

- Maintenance/Updates impossible.
- CI/CD pipeline broken (cannot build from source).
- Deployment relies on a "black box" binary.

**Decision**:

- **Abandon Go CLI**: Recovery is impossible without git history (which showed no files).
- **Migrate to Node.js**: Rewrite CLI functionality using Node.js/TypeScript (e.g., `commander` or `oclif`) to leverage the existing `job-automation` stack and shared libraries.

## 2. Architecture: Ports & Adapters Status

**Progress**: 80%

- ✅ `src/shared/services`: Domain logic successfully isolated.
- ⚠️ `src/lib`: 5 legacy files remain (`d1-client.js`, `mock-wanted-api.js`, etc.).

**Plan**:

- Move legacy wrappers to `src/shared/adapters`.
- Enforce strict contracts via `src/shared/contracts`.
- Delete `src/lib` once empty.

## 3. Dashboard Strategy: Runtime Split

**Current State**: Logic split between `src/server` (Fastify/Node) and `workers/src` (Cloudflare Worker).
**Strategy**:

- **UI/API (Edge)**: Consolidate Dashboard View & Light API into `workers/` (Cloudflare Worker) for global performance.
- **Automation (Core)**: Keep heavy jobs (crawling, applying) in Node.js runtime.
- **Sharing**: Share _Pure Domain Logic_ via `src/shared`. Do NOT share runtime-specific code (HTTP handlers, DB bindings).

## 4. Immediate Action Items

1. **CLI Rewrite**: Initialize new Node.js CLI project in `apps/cli-node`.
2. **Legacy Cleanup**: Refactor usages of `src/lib` to `src/shared`.
3. **Docs**: Update `AGENTS.md` to reflect the CLI situation.
