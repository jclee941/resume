# AUTOMATION SCRIPTS KNOWLEDGE BASE

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Operational module containing asset generation, content transport, release, deployment, and data workflows.

Boundary: retained script-domain hub; specialized guides own their local contracts.

## STRUCTURE

```text
scripts/
├── build/          # PDF/PPTX, variants, icons, screenshots
├── content/        # private content transport and fixture generation
├── deploy/         # standalone rollout and rollback helpers
├── deployment/     # preflight and deployment orchestration
├── dev/            # legacy Miniflare support
├── enrichment/     # separate Go module producing proposals
├── local-dev-up/   # local development process orchestration
├── monitoring/     # observability setup and deployment helpers
├── onepassword/    # reference resolution and allowed-field seeding
├── release/        # version decisions and release publication
├── security/       # committed Wrangler vars guard
├── sync/           # approved proposal application
├── utils/          # locale sync, validation, search helpers
└── verification/   # deterministic checks and bounded remote probes
```

## WHERE TO LOOK

| Task                      | Location                                        | Notes                                          |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Asset pipeline            | `build/AGENTS.md`                               | Go PDF, Python PPTX, JS images and variants    |
| Content pack CLI          | `content/AGENTS.md`                             | Build-time Node exception and D1 transport     |
| Deploy preflight          | `deployment/AGENTS.md`                          | Operator helper safety                         |
| Proposal generation       | `enrichment/AGENTS.md`                          | Separate module; generation is not application |
| Approved changes          | `sync/apply-proposals.go`, `sync/proposal-*.go` | Explicit transactional application             |
| Secret references         | `onepassword/AGENTS.md`                         | CLI/SDK execution wrappers                     |
| Release publication       | `release/AGENTS.md`                             | Immutable input and ownership checks           |
| Config classification     | `security/AGENTS.md`                            | Vars-versus-secrets guard                      |
| Locale sync               | `utils/AGENTS.md`                               | Path helpers and generation                    |
| Repository/runtime checks | `verification/AGENTS.md`                        | Offline policies and remote probes             |

## CONVENTIONS

- Root-level `healthcheck.go`, `merge-ulw-to-master.go`, and `add-gitlab-variables.go` are manual standalone programs.
- `sync/` applies approved proposals through `npm run sync:proposals`; generation and approval are separate steps.
- Existing Node data generators and deterministic validators stay with their JS-domain consumers.
- The content CLI runs on Workers Builds with Node only; its dependency-free bootstrap is a specific exception.
- The Miniflare support file under `dev/` is not the root `npm run dev` configuration.
- Standalone rollout tools in `deploy/` are distinct from the orchestration tools in `deployment/`.

## ANTI-PATTERNS

- Do not broaden a language exception without a concrete owning runtime requirement.
- Do not add new shell wrappers around an existing Go operator program.
- Do not silently apply pending proposals during evidence generation.
- Do not interpret an operator helper's presence as an enabled scheduler or CI workflow.

---

Parent: [../AGENTS.md](../AGENTS.md)
