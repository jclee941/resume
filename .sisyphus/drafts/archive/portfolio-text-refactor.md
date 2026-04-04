# Draft: Portfolio Text Refactor - "Simple but Luxurious"

## Requirements (confirmed from Oracle)

1. **Copy Unification** - Single positioning sentence reused everywhere (KO+EN+CLI)
2. **Years Unification** - Fix inconsistent years display
3. **CLI Cleanup** - De-toy help command, hide easter eggs, professional tone
4. **neofetch Cleanup** - Remove jokes, show real info
5. **Typography Separation** - Mono for terminal chrome, Sans for content
6. **Color Restraint** - Reduce 3 neon colors to 1 main + 1 support

## Current State Analysis

### Files to Modify
- `packages/data/resumes/master/resume_data.json` (SSoT)
- `apps/portfolio/index.html` (KO)
- `apps/portfolio/index-en.html` (EN)
- `apps/portfolio/src/styles/variables.css`
- `apps/portfolio/src/styles/components.css`

### Content Inconsistencies Found
| Location | Current Value | Issue |
|----------|---------------|-------|
| resume_data.json L19 | "7년 11개월" | Official SSoT |
| resume_data.json L23 | "8년차" | Profile statement |
| index.html L251 | "10년" | Inconsistent |
| index.html L481 | "10+ years" | Inconsistent |
| index.html L486 | "10y experience" | Inconsistent |

### Hero Subtitle Inconsistencies
| Location | Current | Target |
|----------|---------|--------|
| resume_data.json L246 | "보안 인프라 설계 · Observability · 자동화" | SSoT |
| index.html L239 | "Infrastructure Engineer \| Security \| Observability \| Automation" | Mismatched |
| index-en.html L235 | Same as above | Mismatched |

### CLI Toy Commands to Remove/Hide
- `sudo hire-me` (lines 493-502)
- `rm -rf doubt` (lines 505-515)
- Konami code hint in help (line 556)

### neofetch Jokes to Replace
- "Uptime: 10+ years in production"
- "CPU: Problem Solving @ 100%"
- "Memory: 10y experience loaded"

## Technical Decisions
- Primary accent: Cyan (keep)
- Support accent: Green (for success states only)
- Remove/demote: Magenta

## Open Questions
- [ ] Confirm years: Should we use "8년차" consistently (matches profileStatement)?
- [ ] Test strategy: TDD, tests-after, or none?

## Scope Boundaries
- INCLUDE: Text content, CLI commands, neofetch, typography, color usage
- EXCLUDE: Matrix rain animation, terminal window chrome, structural changes
