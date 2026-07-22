# ENRICHMENT KNOWLEDGE BASE

**Generated:** 2026-07-22
**Commit:** `164e83ac`
**Branch:** `master`

## OVERVIEW

Separate Go module that converts GitHub, application-history, and LLM evidence
into proposal files. Enrichment proposes changes; the sync command applies them.

## STRUCTURE

```text
enrichment/
├── github/   # repository evidence → project proposals
├── skills/   # application history → skill proposals
├── ai/       # OpenAI/Anthropic text analysis → content proposals
├── lib/      # proposal schema, resume reads, provider clients, repo paths
└── go.mod
```

## WHERE TO LOOK

| Task                    | Location                         | Notes                                                 |
| ----------------------- | -------------------------------- | ----------------------------------------------------- |
| Proposal contract/write | `lib/common.go`                  | `Proposal`, target path/operation, output path        |
| Canonical resume read   | `lib/common.go`, `lib/resume.go` | reads `packages/data/resumes/master/resume_data.json` |
| GitHub enrichment       | `github/main.go`                 | filters repositories and emits project proposals      |
| Skill enrichment        | `skills/main.go`                 | derives candidate skills from application records     |
| LLM enrichment          | `ai/main.go`                     | provider selection and section-specific proposals     |
| Proposal application    | `../sync/apply-proposals.go`     | separate explicit mutation step                       |

## CONVENTIONS

- Read canonical resume data; never mutate it from a generator.
- Emit one JSON proposal per stable source/id/target tuple with evidence and a
  JSON-Pointer-style target path.
- Treat external API and LLM output as untrusted: validate shape before writing
  a proposal and continue safely when one candidate fails.
- Use `lib.RepoRoot()` and repository-relative constants instead of machine paths.
- Proposal filenames are stable, but `generatedAt` changes on rerun; do not claim
  byte-for-byte idempotence.
- `WriteProposal()` currently writes under `packages/data/proposals/approved/`.
  Treat placement as input to the explicit apply command, not proof of review.

## ANTI-PATTERNS

- Do not write directly to `resume_data.json` or derived portfolio snapshots.
- Do not invent evidence, quantified claims, or source facts absent from inputs.
- Do not log API keys, prompts containing secrets, or full private application data.
- Do not let one provider failure discard valid proposals from other providers.
- Do not apply proposals as a side effect of generation.

## COMMANDS

```bash
npm run enrich:github
npm run enrich:skills
npm run enrich:ai
npm run enrich:all
npm run sync:proposals
```

---

Parent: [../AGENTS.md](../AGENTS.md)
