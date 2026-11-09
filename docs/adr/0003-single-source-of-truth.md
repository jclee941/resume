# ADR 0003: Resume Data Single Source of Truth

- Status: Accepted
- Date: 2026-02-15

## Context

Resume data is consumed by portfolio rendering, automation workflows, and
external sync pipelines. Multiple editable copies risk drift and inconsistent
behavior across surfaces.

## Decision

Establish `packages/data/resumes/master/resume_data.json` as the canonical
source of truth. All downstream representations must be generated or
synchronized from this file.

## Current Content Ownership

For personal content, D1 `content_files` is now the source of truth under
[ADR 0011](0011-content-pack-in-d1.md). The named resume JSON is its local
materialized representation, not an independently canonical copy.

## Consequences

- Positive: Consistent data semantics across portfolio, MCP, and automation
  components.
- Positive: Reduced risk of conflicting manual edits in generated artifacts.
- Negative: Requires strict discipline to avoid editing derived files.
- Follow-up: Keep sync scripts maintained and document the update workflow.
