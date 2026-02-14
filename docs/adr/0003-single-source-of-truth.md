# ADR 0003: Resume Data Single Source of Truth

- Status: Accepted
- Date: 2026-02-15

## Context

Resume data is consumed by portfolio rendering, automation workflows, and external sync pipelines. Multiple editable copies risk drift and inconsistent behavior across surfaces.

## Decision

Establish `typescript/data/resumes/master/resume_data.json` as the canonical source of truth. All downstream representations must be generated or synchronized from this file.

## Consequences

- Positive: Consistent data semantics across portfolio, MCP, and automation components.
- Positive: Reduced risk of conflicting manual edits in generated artifacts.
- Negative: Requires strict discipline to avoid editing derived files.
- Follow-up: Keep sync scripts maintained and document the update workflow.
