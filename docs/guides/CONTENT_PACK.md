# Content Pack Guide

Personal resume and portfolio content lives in Cloudflare D1 (`content_files`), not in git
(ADR 0011: `docs/adr/0011-content-pack-in-d1.md`). The working tree holds a gitignored,
materialized copy. The pack is defined by `tools/scripts/content/content-pack.json`
(include/exclude globs); `.gitignore`, the guards, and D1 sync all follow that file.

## Edit workflow

1. Put the Cloudflare credentials in an env file made only of `op://` references for
   `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_KEY`, and `CLOUDFLARE_EMAIL`.
2. Materialize the pack: `op run --env-file <env file> -- npm run content:pull`.
3. Edit the files in the working tree (they are gitignored).
4. Preview: `npm run build` (`ensure` warns that local files differ from the last pull and
   builds them anyway).
5. Publish: `op run --env-file <env file> -- npm run content:push` (`--dry-run` first;
   `--prune` also deletes rows whose file you removed). `content:status` shows the diff.
6. Redeploy so the change ships: push any commit to `master` (Cloudflare Workers Builds
   rebuilds and pulls the pack from D1), or trigger a Workers Builds build through the
   Cloudflare Builds API. A D1 change alone does not redeploy the Worker.

D1 wins: `content:pull` overwrites local copies. Push before you pull if you have edits.
`pull` (and `ensure`) also deletes files the previous pull wrote that the new source lacks, but only
while they are unchanged since that pull; edited or never-pulled files are kept with a warning.

## What `npm run build` does with the pack

`build` starts with `node tools/scripts/content/cli.mjs ensure`.

| Environment               | Trigger                   | Behavior                                                                                                                                                                                                 |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Workers Builds | `WORKERS_CI=1`            | Pull the real pack from D1. Missing credentials fail the build; fixtures are never used, even if `CONTENT_SOURCE=fixtures` is set.                                                                       |
| GitHub Actions / anyone   | `CONTENT_SOURCE=fixtures` | Copy `tests/fixtures/content-pack/**` onto the pack paths. Refuses to overwrite a local pack file that differs from both the fixture and `.content/manifest.json` (unpushed edits); `--force` overrides. |
| Explicit D1 pull          | `CONTENT_SOURCE=d1`       | Pull from D1 like `content:pull`.                                                                                                                                                                        |
| Local development         | neither                   | Require a pulled pack: every file in `.content/manifest.json` present, else exit 1 and point to `npm run content:pull`. Drift from the last pull only warns.                                             |

## Fixtures

`tests/fixtures/content-pack/` is a fake pack with the same structure as the real one, so
build, lint, typecheck, and every test target run without personal content. Names, contacts,
employers, schools, and prose are generated deterministically; images, PDFs, and DOCX files
are tiny valid placeholders. Never edit fixtures by hand. To regenerate after the real
content structure changes:

```bash
op run --env-file <env file> -- npm run content:pull
node tools/scripts/content/make-fixtures.mjs
git diff --stat tests/fixtures
```

Add a real pack file to `FIXTURE_SELECTION` in `tools/scripts/content/make-fixtures.mjs`
when a build or test starts reading it.

## Guards that keep content out of git

- `.gitignore` ignores every pack path (keeps `AGENTS.md`, `resume_schema.json`, `.gitkeep`,
  and the fixtures).
- Pre-commit: `node tools/scripts/content/cli.mjs guard --staged`.
- CI: `node tools/scripts/content/cli.mjs guard --tracked` right after checkout.
- Both fail on pack paths and on personal tokens (names, emails, phone numbers) taken from
  the materialized master resume; output lists paths, kinds, and counts only.
- `gitleaks` scans secrets (`.gitleaks.toml`).
