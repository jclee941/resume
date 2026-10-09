# TOOLS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Developer and operator tooling split between standalone CI checks and module-scoped automation programs.

Boundary: retained tooling hub coordinating execution roots and specialized child guides.

## WHERE TO LOOK

| Task                        | Location                    | Notes                                          |
| --------------------------- | --------------------------- | ---------------------------------------------- |
| Repository checks           | `ci/AGENTS.md`              | Standalone Go policy and change-impact tools   |
| Operational programs        | `scripts/AGENTS.md`         | Build, content, deploy, release, sync, secrets |
| Asset generation            | `scripts/build/AGENTS.md`   | PDF/PPTX, image processing, resume variants    |
| Browser performance budgets | `lighthouserc.json`         | Inputs to `npm run lighthouse:ci`              |
| Go module ownership         | `scripts/go.mod`            | Main operational module                        |
| Evidence enrichment module  | `scripts/enrichment/go.mod` | Independent nested Go module                   |
| Human operator index        | `scripts/README.md`         | Check command references against current files |

## CONVENTIONS

- Prefer the root package command when one exists; it carries the required working directory and test selection.
- `tools/ci/` has no Go module; its package tests use `GO111MODULE=off`.
- Main-module commands use `go -C tools/scripts ...`; enrichment commands use their nested module.
- Some sibling Go files are separate `main` programs; do not assume `go test ./...` is the repository test entrypoint.
- `npm run test:go` lists the supported Go test targets explicitly.
- `npm run test:tools` runs colocated JS/MJS Node tests, separate from root Jest discovery.
- Offline validators and mutating operator tools have different failure and execution contracts; consult the owning guide.

## ANTI-PATTERNS

- Do not run a module-scoped command from an unrelated Go module.
- Do not claim a helper is a required CI gate merely because it exists under `tools/ci/`.
- Do not copy historical `scripts/setup/` paths; that tracked directory no longer exists.
- Do not assume generated application PDFs are tracked exceptions to the content-pack policy.

---

Parent: [../AGENTS.md](../AGENTS.md)
