# Wanted Skill Tag Probe

This guide records the accepted path for replacing approximate Wanted skill
aliases with verified `tagTypeId` values. The operation requires an authenticated
Wanted session and must not be simulated with guessed IDs.

## When to run

Run this only when updating `apps/job-server/scripts/skill-tag-map.js` or when a
Wanted profile sync reports unmapped skills that should be added as first-class
tags.

## Inputs

- Valid Wanted session cookies from the normal session-broker or auth-sync flow.
- Skill names from the resume SSoT or a failed profile-sync report.
- A dry-run output path under `.omo/evidence/` for redacted request/response
  evidence.

## Procedure

1. Use the authenticated Wanted session; do not paste cookies into source files,
   docs, shell history, or public evidence.
2. Query Wanted's profile skill-search surface for each candidate skill.
3. Record only the skill name, resolved display label, numeric `tagTypeId`, and
   a timestamp in evidence. Redact cookies, auth headers, account IDs, and raw
   response bodies.
4. Add only verified IDs to `SKILL_TAG_MAP`. Keep approximate aliases in
   `SKILL_ALIASES` only when the target verified canonical skill already exists.
5. Run the profile-sync skill-tag tests and a dry-run profile sync before using
   the mapping in a live write.

## Deferred Candidates

The current fallback aliases for SIEM, security operations, and cloud-native
observability skills remain approximate until this live probe is run. A cleanup
task may remove source TODO comments, but it must keep this guide or equivalent
evidence as the durable follow-up record.
