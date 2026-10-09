# APPLICATION PACKETS

**Generated:** 2026-10-09
**Commit:** `f24027a0`
**Branch:** `master`

## OVERVIEW

Role-specific packet source, printable previews, and automation run artifacts outside npm workspaces.

Scope reason: existing distinct application-content domain.

## WHERE TO LOOK

| Task                 | Location                                     | Notes                                     |
| -------------------- | -------------------------------------------- | ----------------------------------------- |
| Packet inventory     | `../tools/scripts/content/content-pack.json` | Manifest includes this entire corpus      |
| Print design         | Materialized `DESIGN.md`                     | Packet-specific visual rules, when pulled |
| Role copy            | Materialized role directories                | Markdown, HTML, and accompanying evidence |
| Run artifacts        | Materialized `_auto-apply-runs/`             | Ranked queues and submission results      |
| Shared resume inputs | `../packages/data/resumes/AGENTS.md`         | Master and independent variant ownership  |

## CONVENTIONS

- Only this guide is tracked in this directory; a missing packet is not a missing code module.
- Keep each role packet isolated in a company-role-year slugged directory.
- Keep run outputs separate from hand-authored packet sources.
- Tailoring may reframe verified facts but must preserve their meaning.
- Use packet source and its generator to update printable previews.
- Check materialized design instructions before changing packet layout.

## ANTI-PATTERNS

- Do not move ranked run queues into canonical resume inputs.
- Do not promote tailored role prose into master without checking that it is globally true.
- Do not make application PDFs depend on JavaScript execution.
- Do not infer a packet's availability from this guide; inspect the pulled inventory.

Parent: [../AGENTS.md](../AGENTS.md)
