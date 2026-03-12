# Job Dashboard Access Guide

The auto-apply dashboard runtime is owned by `apps/job-dashboard/`, not by `apps/job-server/`.

## Canonical Owner

- Runtime code: `apps/job-dashboard/src/`
- Local development and deploy instructions: `apps/job-dashboard/README.md`
- Embedded production route: `https://resume.jclee.me/job/`

## Local Development

```bash
npm install
npm run dev --workspace @resume/job-dashboard-worker
```

## Notes

- `apps/job-server/` remains the automation/domain runtime.
- `apps/job-dashboard/` owns the dashboard UI, `/job/*` API surface, and Cloudflare workflow bindings.
- Keep dashboard structure docs in `apps/job-dashboard/README.md`; do not reintroduce a second full dashboard guide here.
