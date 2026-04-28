# Job Server

MCP server for job platform automation across Wanted, JobKorea, Saramin, LinkedIn, and related workflows.

## Overview

- MCP server with 9 tools and 32 actions
- Covers search, auth, resume sync, profile sync, and automation helpers
- Uses the job automation runtime in `src/`

## Platform coverage

- Wanted, API plus OneID headless auth
- JobKorea, Playwright headless login
- Saramin
- LinkedIn
- Other platform adapters live alongside the main crawlers and tools

## Authentication

- Wanted uses the OneID password flow
- JobKorea uses Playwright login
- Session and cookie handling stay inside the server runtime

## Resume sync

- `scripts/ci-resume-sync.js` covers 7 of 8 Wanted sections
- `scripts/profile-sync/index.js` maps 87 JobKorea fields
- Sync logic is tuned for the current resume and profile schemas

## Skills mapping

- `SKILL_TAG_MAP` maps 31 skills directly + 45 aliases (apps/job-server/scripts/skill-tag-map.js)
- ~10 alias targets currently resolve to fallback routings (e.g. Loki→Prometheus, Ansible→DevOps) until real `tag_type_id` values are probed via /sns-api/profile (see docs/guides/wanted-skill-probe.md)

## API notes

- v2 endpoints use `PATCH`, not `PUT`
- Wanted skills still use the v1 flow where required

## Environment

```bash
WANTED_EMAIL=
WANTED_PASSWORD=
WANTED_ONEID_CLIENT_ID=
WANTED_RESUME_ID=
JOBKOREA_RNO=  # Resume ID for JobKorea (default: 30236578)
```

## Usage

```bash
cd apps/job-server
npm install
npm start
```

## Notes

- Keep direct imports on the shared runtime, not deprecated wrappers.
- Credentials and session files stay out of source control.
