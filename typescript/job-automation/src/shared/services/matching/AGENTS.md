# MATCHING SERVICE KNOWLEDGE BASE

**Generated:** 2026-02-24 12:34:06 KST
**Commit:** 055bcc5
**Branch:** master

## OVERVIEW

Scoring engine for job suitability. Combines deterministic skill/experience weighting with optional Claude-based analysis and explicit fallback semantics.

## WHERE TO LOOK

| Task                | Location         | Notes                                       |
| ------------------- | ---------------- | ------------------------------------------- |
| Rule-based scoring  | `job-matcher.js` | category weights + thresholded ranking      |
| AI-assisted scoring | `ai-matcher.js`  | Anthropic call + JSON extraction + fallback |
| Public exports      | `index.js`       | barrel for matcher APIs                     |

## CODE MAP

| Symbol                   | Type           | Location         | Role                                             |
| ------------------------ | -------------- | ---------------- | ------------------------------------------------ |
| `SKILL_CATEGORIES`       | const          | `job-matcher.js` | keyword dictionaries + per-domain weights        |
| `calculateMatchScore`    | function       | `job-matcher.js` | deterministic score + percentage + match details |
| `filterAndRankJobs`      | function       | `job-matcher.js` | exclude/filter/sort/slice pipeline               |
| `prioritizeApplications` | function       | `job-matcher.js` | high/medium/low priority tagging                 |
| `analyzeWithClaude`      | async function | `ai-matcher.js`  | raw Claude messages API wrapper                  |
| `calculateAIMatch`       | async function | `ai-matcher.js`  | single-job AI match with fallback response       |
| `matchJobsWithAI`        | async function | `ai-matcher.js`  | batched AI match (batchSize=5)                   |

## CONVENTIONS

- Threshold semantics: `<60` skip, `60-74` review queue, `>=75` auto-apply candidate.
- Resume source defaults via `getResumeMasterMarkdownPath()`; missing file is a hard error.
- Experience extraction supports Korean and English patterns; fallback default is 8 years.
- AI path is additive: absent/failed API key or parse errors return fallback-safe structures.
- JSON extraction pattern uses first object match (`/\{[\s\S]*\}/`) before parse.

## ANTI-PATTERNS

- Do not bypass `loadResume()` with ad-hoc file path logic.
- Do not change score thresholds without updating auto-apply policy docs/config.
- Do not treat AI outputs as guaranteed JSON; keep parse/fallback guards.
- Do not remove concurrency cap in `matchJobsWithAI` (batch size protects API and latency).
- Do not couple matching logic to route handlers or platform clients.

## NOTES

- Claude config reads `CLAUDE_API_KEY` first, then `ANTHROPIC_API_KEY`.
- AI confidence is currently fixed as `medium`; downstream consumers should not assume calibration.
- `matchPercentage` aliases `matchScore` in AI batch results for compatibility with rule-based flows.
