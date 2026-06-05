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

## Bootstrap references

```bash
cp .env.1password.example .env.1password
```

Do not replace the `op://` references with plaintext. `.env.1password` is local
and ignored; `.env.1password.example` is the committed template.

## Run commands with resolved secrets

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

The runner resolves references with `op read`, injects values into the child
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

## Verification

These checks should pass without revealing values:

```bash
rg -n "op://homelab/resume" .env.1password.example docs/guides/ONEPASSWORD_RESUME_SECRETS.md

npm run op:run -- --env-file ../../.env.1password -- \
  node -e "console.log(process.env.WANTED_EMAIL ? 'WANTED_EMAIL loaded' : 'missing')"
```

If the runner reports `You are not currently signed in`, run `op signin` and
retry.
