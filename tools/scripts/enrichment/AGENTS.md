# ENRICHMENT KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Independent Go module turns GitHub, application-history, and model evidence into pending change proposals.

Boundary: retained evidence-to-proposal domain with its own module and provenance contract.

## WHERE TO LOOK

| Task                      | Location                                                     | Notes                                     |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Proposal model and writes | `lib/common.go`, `lib/proposal-contract.go`                  | Target, evidence, source, output contract |
| Typed resume reads        | `lib/resume.go`                                              | Input models and accessors                |
| Provider transport        | `lib/client.go`                                              | HTTP client helpers                       |
| Repository evidence       | `github/main.go`                                             | Project proposal generation               |
| Application evidence      | `skills/main.go`, `skills/extract.go`, `skills/proposals.go` | Skill proposals                           |
| Model evidence            | `ai/main.go`                                                 | Provider selection and section proposals  |
| Separate application step | `../sync/apply-proposals.go`                                 | Approved-proposal consumer                |

## CONVENTIONS

- Run within this Go module; `go -C tools/scripts/enrichment test ./...` covers its tests.
- `npm run enrich:github`, `enrich:skills`, and `enrich:ai` select generators; `enrich:all` chains GitHub and AI only.
- Skill enrichment accepts an application-record file through `-data`.
- Use `lib.RepoRoot()` and repository-relative constants for inputs and proposal destinations.
- Emit one proposal per stable source/id/target tuple with evidence and a JSON Pointer target.
- Proposal filenames are stable; changing `generatedAt` means reruns are not byte-identical.
- Validate external output shape before storing a candidate; preserve valid candidates if another provider fails.

## ANTI-PATTERNS

- Do not mutate canonical resume data or generated portfolio snapshots in a generator.
- Do not fabricate evidence or source facts absent from the input.
- Do not include private application payloads or credential-bearing prompts in logs.
- Do not confuse successful proposal generation with completed application of its changes.

---

Parent: [../AGENTS.md](../AGENTS.md)
