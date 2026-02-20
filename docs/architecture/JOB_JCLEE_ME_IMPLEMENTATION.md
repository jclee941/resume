# Job Dashboard Route Integration Report

**Date**: 2026-02-20  
**Status**: Archived and superseded

---

## Summary

This document now tracks the finalized architecture after decommissioning the legacy job-dashboard subdomain topology.

- Current production endpoint: `https://resume.jclee.me/job`
- Current routing model: path-based route split under `resume.jclee.me`
- Deployment ownership: GitOps via repository config + CI workflows

---

## Current Architecture

### Route Model

- Portfolio surface: `https://resume.jclee.me`
- Job dashboard surface: `https://resume.jclee.me/job`
- Route pattern: `resume.jclee.me/job/*`

### Ownership Model

- Worker code deployment is managed by CI (`.github/workflows/ci.yml`).
- Worker/route configuration is managed in source (`wrangler.toml` / `wrangler.jsonc`) and infrastructure definitions.
- Verification runs against `/health` and `/job/health` targets as part of deploy validation.

---

## Migration Outcome

- Legacy subdomain-based dashboard topology has been retired from active deployment docs.
- Job dashboard routing is unified into path-based routing under the portfolio domain.
- Operational runbooks and deployment guides are aligned to the current endpoint.

---

## References

- `typescript/job-automation/workers/wrangler.toml`
- `typescript/job-automation/workers/wrangler.jsonc`
- `.github/workflows/ci.yml`
- `docs/deployment-guide.md`
