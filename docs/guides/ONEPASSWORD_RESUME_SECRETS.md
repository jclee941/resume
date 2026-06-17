# 1Password Resume Secret Integration

Resume automation secrets are owned by the `homelab` vault item named `resume`.
Tracked files contain only `op://` references; real values must never be written
to `.env`, logs, commits, or shell history.

## Required 1Password fields

Create these fields on the `homelab/resume` item when the matching integration is
used:

- `WANTED_EMAIL`
- `WANTED_PASSWORD`
- `WANTED_ONEID_CLIENT_ID`
- `WANTED_RESUME_ID`
- `WANTED_COOKIES`
- `JOBKOREA_USERNAME`
- `JOBKOREA_EMAIL`
- `JOBKOREA_PASSWORD`
- `JOBKOREA_RNO`
- `JOBKOREA_COOKIES`
- `CLIPROXY_BASE`
- `CLIPROXY_API_KEY`
- `ADMIN_TOKEN`
- `N8N_WEBHOOK_SECRET`
- `AUTH_SYNC_SECRET`
- `SESSION_ENCRYPTION_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_EMAIL`

## Required 1Password documents

Session JSON files are stored as separate Document items in the `homelab` vault:

- `resume-sessions-json` for `sessions.json`
- `resume-wanted-session-json` for `wanted-session.json`

These are runtime session artifacts, not env fields. Keep them out of the repo
workspace except while explicitly restoring or refreshing local sessions.

## Bootstrap references

```bash
cp .env.1password.example .env.1password
```

Do not replace the `op://` references with plaintext. `.env.1password` is local
and ignored; `.env.1password.example` is the committed template.

## Run commands with resolved secrets

The native SDK runner supports service-account tokens for automation and
desktop-app prompt auth for local operator workflows. The CLI fallback remains
`op:run`.

For service-account auth, set `OP_SERVICE_ACCOUNT_TOKEN` in the parent
environment. The native runner fails before launching the child process if the
token is missing:

```bash
npm run op:native:run -- --auth service-account \
  --env-file ../../.env.1password -- \
  node apps/job-server/scripts/profile-sync.js wanted --diff
```

For desktop-app auth, pass the 1Password account name or account UUID shown in
the desktop app:

```bash
npm run op:native:run -- --auth desktop --account "<account-name-or-uuid>" \
  --env-file ../../.env.1password -- \
  node apps/job-server/scripts/profile-sync.js jobkorea --diff
```

The native runner resolves `op://` references through the 1Password Go SDK,
injects values into the child process environment, and does not print secret
values.

### CLI fallback

Sign in to 1Password CLI first:

```bash
op signin
```

Then run any command through the secret-safe runner:

```bash
npm run op:run -- --env-file ../../.env.1password -- \
  node apps/job-server/scripts/profile-sync.js wanted --diff

npm run op:run -- --env-file ../../.env.1password -- \
  node apps/job-server/scripts/profile-sync.js jobkorea --diff
```

The CLI runner resolves references with `op read`, injects values into the child
process environment, and does not print secret values.

## Upload or rotate values

Use the 1Password desktop app or CLI after `op signin` to create or update fields
on `homelab/resume`. Avoid commands that put plaintext values in shell history.

If supported values already exist in a local env file, seed them without printing
plaintext values:

```bash
npm run op:seed:resume -- --env-file ../../.env
```

The seeder only accepts the field names listed above, skips empty values and
existing `op://` references, and writes each value into the `homelab/resume`
item. After a successful seed, remove local plaintext env files that are no
longer needed.

To store local session files as 1Password documents without printing their
contents:

```bash
npm run op:seed:sessions
```

The session seeder reads `sessions.json` and `wanted-session.json` from the repo
root, validates that each present file is JSON, then uploads each file through
stdin to avoid putting session contents in command arguments. Missing files are
skipped.

To restore those documents back to local files:

```bash
npm run op:restore:sessions -- --force
```

Restore writes files with mode `0600`. Without `--force`, restore refuses to
overwrite an existing local session file.

## Session documents

Session documents remain CLI-based because they are 1Password Document items,
not env refs. Use `op:seed:sessions` and `op:restore:sessions` for those flows.

## Verification

These checks should pass without revealing values:

```bash
rg -n "op://homelab/resume" .env.1password.example docs/guides/ONEPASSWORD_RESUME_SECRETS.md

tmp="$(mktemp)"
printf '%s\n' 'WANTED_EMAIL=op://homelab/resume/WANTED_EMAIL' > "$tmp"

npm run op:run -- --env-file "$tmp" -- \
  node -e "console.log(process.env.WANTED_EMAIL ? 'WANTED_EMAIL loaded' : 'missing')"

npm run op:native:run -- --auth service-account --env-file "$tmp" -- \
  node -e "console.log(process.env.WANTED_EMAIL ? 'WANTED_EMAIL loaded' : 'missing')"

rm -f "$tmp"

npm run op:seed:sessions
```

If the CLI runner reports `You are not currently signed in`, run `op signin` and
retry. If the native runner reports a missing service-account token, set
`OP_SERVICE_ACCOUNT_TOKEN` in the parent environment or use desktop auth.
