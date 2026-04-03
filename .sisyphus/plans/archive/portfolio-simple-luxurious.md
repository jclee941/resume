# Portfolio Text Refactor: Simple but Luxurious

## TL;DR

> **Quick Summary**: Refactor portfolio text content for consistency and professionalism across Korean, English, and CLI interfaces. Implement Oracle's 6 recommendations for "심플하지만 고급스럽게" aesthetic.
> 
> **Deliverables**:
> - Unified positioning text across SSoT, HTML, and CLI
> - Consistent "8년차" years display everywhere
> - Professional CLI (no toy commands visible, no jokes)
> - Professional neofetch (real info, no humor)
> - Typography separation (sans for content, mono for chrome)
> - Color restraint (cyan primary, green success-only)
> 
> **Estimated Effort**: Medium (4-6 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (SSoT) → Tasks 2,3 (HTML) → Task 4 (CSS) → Task 5 (Build/Deploy) → Task 6 (Verify)

---

## Context

### Original Request
Improve text content consistency in portfolio (resume.jclee.me) with "심플하지만 고급스럽게" (simple but luxurious) feel.

### Interview Summary
**Key Discussions**:
- Years of experience: User confirmed "8년차" as canonical (not 7년11개월 or 10년)
- Test strategy: Agent QA Only - Playwright browser verification, no unit tests needed

**Research Findings**:
- SSoT hero.subtitle (resume_data.json L246): "보안 인프라 설계 · Observability · 자동화"
- index.html hero (L239) shows mismatched: "Infrastructure Engineer | Security | Observability | Automation"
- neofetch contains jokes: "CPU: Problem Solving @ 100%", "Memory: 10y experience loaded"
- About content uses font-mono (components.css L231), should use font-sans for readability
- Three neon colors defined (cyan, magenta, green) but Oracle recommends color restraint

### Self-Review Gap Analysis
**Identified Gaps** (addressed):
1. **CLI cat command output** - Also hardcodes "10년" at index.html L709, must update to match
2. **English portfolio CLI** - index-en.html has no interactive CLI (simpler), but hero subtitle needs update
3. **Konami code** - Keep functionality but remove hint from help output
4. **Tag colors** - Tags currently use magenta, keep as-is per Oracle "1 support color"

---

## Work Objectives

### Core Objective
Create consistent, professional text content across all portfolio surfaces with a "simple but luxurious" aesthetic that removes playful elements and establishes a unified brand voice.

### Concrete Deliverables
- `packages/data/resumes/master/resume_data.json` - Updated SSoT
- `apps/portfolio/index.html` - Updated Korean portfolio
- `apps/portfolio/index-en.html` - Updated English portfolio
- `apps/portfolio/src/styles/components.css` - Typography updates
- Deployed worker at resume.jclee.me

### Definition of Done
- [ ] `curl -s https://resume.jclee.me | grep "8년차"` returns match
- [ ] `curl -s https://resume.jclee.me/en/ | grep "8 years"` returns match
- [ ] No visible "10년" or "10 years" or "10+" in either portfolio
- [ ] neofetch output shows Role/Focus/Domain/Stack (no jokes)
- [ ] help command shows 7 core commands only (no Konami hint)
- [ ] About section renders in sans-serif font

### Must Have
- All year references display "8년차" (KO) or "8 years" (EN)
- Positioning sentence consistent: "보안 인프라 · Observability · 자동화"
- neofetch shows: Role, Focus, Domain, Stack
- help shows: neofetch, experience, projects, skills, contact, clear, help

### Must NOT Have (Guardrails)
- **No toy command visibility**: sudo hire-me, rm -rf doubt must not appear in help
- **No humor in neofetch**: No "CPU: Problem Solving @ 100%" style jokes
- **No Konami code hints**: Easter egg can stay, but don't advertise it
- **No structural changes**: Keep terminal window, matrix rain, animations
- **No "10년" anywhere**: Years must be "8년차" / "8 years" consistently
- **No magenta removal**: Keep magenta for tags (secondary color per Oracle)
- **No worker.js direct edits**: Build process generates this

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task.

### Test Decision
- **Infrastructure exists**: YES (Jest + Playwright)
- **Automated tests**: NO (Agent QA only per user decision)
- **Framework**: Playwright for browser verification

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

These describe how the executing agent DIRECTLY verifies the deliverable
by running it — opening browsers, executing commands, sending API requests.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Build** | Bash | Run generate-worker.js, check exit code |
| **Deploy** | Bash | Run wrangler deploy, check exit code |
| **Content** | Playwright | Navigate, assert text content |
| **Typography** | Playwright | Assert computed font-family |
| **CLI** | Playwright | Type commands, assert output |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Update SSoT (resume_data.json)

Wave 2 (After Wave 1):
├── Task 2: Update Korean HTML (index.html)
└── Task 3: Update English HTML (index-en.html)

Wave 3 (After Wave 2):
└── Task 4: Update CSS (components.css)

Wave 4 (After Wave 3):
└── Task 5: Build and Deploy

Wave 5 (After Wave 4):
└── Task 6: Browser Verification

Critical Path: Task 1 → Task 2 → Task 4 → Task 5 → Task 6
Parallel Speedup: ~25% faster (Tasks 2 and 3 parallel)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (foundational) |
| 2 | 1 | 4, 5 | 3 |
| 3 | 1 | 5 | 2 |
| 4 | 2 | 5 | 3 |
| 5 | 2, 3, 4 | 6 | None |
| 6 | 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | quick: Simple JSON edits |
| 2 | 2, 3 | quick: HTML text changes |
| 3 | 4 | quick: CSS property change |
| 4 | 5 | quick: Build commands |
| 5 | 6 | playwright: Browser verification |

---

## TODOs

- [ ] 1. Update SSoT (resume_data.json) - Years and Summary

  **What to do**:
  - Change `summary.totalExperience` from "7년 11개월" to "8년" (or keep as detail)
  - Change `sectionDescriptions.resume` from "7년 11개월 인프라 경력" to "8년차 인프라 경력"
  - Verify `hero.subtitle` matches target: "보안 인프라 설계 · Observability · 자동화" ✓

  **Must NOT do**:
  - Don't change profileStatement (already says "8년차")
  - Don't modify career entries or dates

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON field updates, single file
  - **Skills**: [`git-master`]
    - `git-master`: For clean commit after edits

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (foundational)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `packages/data/resumes/master/resume_data.json:19` - totalExperience field
  - `packages/data/resumes/master/resume_data.json:249` - sectionDescriptions.resume
  - `packages/data/resumes/master/resume_data.json:246` - hero.subtitle (verify only)
  - `packages/data/AGENTS.md` - SSoT conventions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify JSON is valid after edit
    Tool: Bash
    Preconditions: File edited
    Steps:
      1. Run: node -e "require('./packages/data/resumes/master/resume_data.json')"
      2. Assert: Exit code is 0
    Expected Result: JSON parses without error
    Evidence: Command output captured
  ```

  **Commit**: YES
  - Message: `fix(data): unify experience years to 8년차`
  - Files: `packages/data/resumes/master/resume_data.json`
  - Pre-commit: `node -e "require('./packages/data/resumes/master/resume_data.json')"`

---

- [ ] 2. Update Korean Portfolio (index.html) - Text, CLI, neofetch

  **What to do**:
  
  **A. Hero subtitle (L239)**:
  - Change: `Infrastructure Engineer | Security | Observability | Automation`
  - To: `보안 인프라 · Observability · 자동화`

  **B. About section (L250-252)**:
  - Change: `> Observability | DevSecOps | Automation<br />> 금융·제조·공공 인프라 10년<br />> 현재 아이티센 CTS`
  - To: `> 보안 인프라 / 관측성 / 자동화<br />> 금융·공공 중심 8년차, 설계-운영-개선<br />> ITCEN CTS (현재)`

  **C. neofetch command (L469-491)**:
  - Replace joke lines with professional info:
    - `Uptime: 10+ years` → `Role: Infrastructure Engineer`
    - `Shell: /bin/devops` → `Focus: Security Infra / Observability`
    - `DE: Grafana + Prometheus` → `Domain: Finance, Public Sector`
    - `Terminal: Observability Expert` → `Stack: Grafana, Prometheus, Splunk`
    - `CPU: Problem Solving @ 100%` → Remove
    - `Memory: 10y experience loaded` → Remove

  **D. help command (L543-558)**:
  - Remove commands: `sudo hire-me`, `rm -rf doubt`, `coffee`, `matrix`, `theme [name]`, `snake`
  - Remove Konami hint line
  - Keep only: `neofetch`, `experience` (new), `projects` (new), `skills` (new), `contact` (new), `clear`, `help`

  **E. cat about.txt output (L707-709)**:
  - Change: `'> Observability | DevSecOps | Automation\\n> 금융·제조·공공 인프라 10년\\n> 현재 아이티센 CTS'`
  - To: `'> 보안 인프라 / 관측성 / 자동화\\n> 금융·공공 중심 8년차, 설계-운영-개선\\n> ITCEN CTS (현재)'`

  **Must NOT do**:
  - Don't remove Konami code functionality (just the hint)
  - Don't remove toy command implementations (just hide from help)
  - Don't change terminal window chrome
  - Don't modify matrix rain animation

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Text replacements in single file
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding of content structure in HTML

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1

  **References**:
  - `apps/portfolio/index.html:239` - Hero subtitle
  - `apps/portfolio/index.html:250-252` - About content
  - `apps/portfolio/index.html:469-491` - neofetch output
  - `apps/portfolio/index.html:543-558` - help command
  - `apps/portfolio/index.html:707-709` - cat about.txt
  - `apps/portfolio/AGENTS.md` - Terminal command conventions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify hero subtitle updated
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep "보안 인프라 · Observability · 자동화" apps/portfolio/index.html
      2. Assert: Match found
      3. Run: grep "Infrastructure Engineer | Security" apps/portfolio/index.html
      4. Assert: No match (old text removed)
    Expected Result: New subtitle present, old removed
    Evidence: grep output captured

  Scenario: Verify no "10년" remains
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep -c "10년" apps/portfolio/index.html
      2. Assert: Returns 0
    Expected Result: No "10년" in file
    Evidence: grep output shows 0

  Scenario: Verify neofetch professional
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep "Problem Solving" apps/portfolio/index.html
      2. Assert: No match
      3. Run: grep "Role:" apps/portfolio/index.html
      4. Assert: Match found
    Expected Result: Jokes removed, professional labels present
    Evidence: grep output captured

  Scenario: Verify help cleaned up
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep "sudo hire-me" apps/portfolio/index.html | grep -v "terminalCommands"
      2. Assert: Only appears in implementation, not in help output
      3. Run: grep "Konami" apps/portfolio/index.html
      4. Assert: Only in implementation, not in help text
    Expected Result: Toy commands hidden from help
    Evidence: grep output captured
  ```

  **Commit**: YES (group with Task 3)
  - Message: `refactor(portfolio): unify text, professionalize CLI`
  - Files: `apps/portfolio/index.html`
  - Pre-commit: `node generate-worker.js` (from portfolio-worker dir)

---

- [ ] 3. Update English Portfolio (index-en.html) - Hero and About

  **What to do**:
  
  **A. Hero subtitle (L235)**:
  - Change: `Infrastructure Engineer | Security | Observability | Automation`
  - To: `Security Infrastructure · Observability · Automation`

  **B. About section (L245-249)**:
  - Change: `Hi, I'm Jaecheol Lee, an Infrastructure Engineer. I specialize in Observability, DevSecOps, and automation pipeline development.`
  - To: `Security Infrastructure / Observability / Automation. 8 years in finance and public sector. Design, operate, improve.`

  **Must NOT do**:
  - No CLI changes needed (English version has no interactive CLI)
  - Don't add CLI features

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text replacements in single file
  - **Skills**: []
    - No special skills needed for text edits

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `apps/portfolio/index-en.html:235` - Hero subtitle
  - `apps/portfolio/index-en.html:245-249` - About content

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify English hero subtitle updated
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep "Security Infrastructure · Observability · Automation" apps/portfolio/index-en.html
      2. Assert: Match found
    Expected Result: New subtitle present
    Evidence: grep output captured

  Scenario: Verify "8 years" present
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep "8 years" apps/portfolio/index-en.html
      2. Assert: Match found
    Expected Result: Years updated
    Evidence: grep output captured
  ```

  **Commit**: YES (group with Task 2)
  - Message: `refactor(portfolio): unify text, professionalize CLI`
  - Files: `apps/portfolio/index-en.html`
  - Pre-commit: none (grouped with Task 2)

---

- [ ] 4. Update Typography (components.css)

  **What to do**:
  - Change `.about-content` font-family from `var(--font-mono)` to `var(--font-sans)`
  - Change `.resume-description` font-family to `var(--font-sans)` (currently inherits mono from parent)
  - Change `.project-description` font-family to `var(--font-sans)` (currently inherits mono from parent)

  **Location in components.css**:
  - `.about-content` is at L226-234, uses `font-family: var(--font-mono);` at L231
  - `.resume-description` is at L308-313
  - `.project-description` is at L387-393

  **Must NOT do**:
  - Don't change terminal chrome (.cmd-line, .section-cmd, etc.)
  - Don't change card styling
  - Don't remove any color variables

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CSS property changes
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Typography system understanding

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after HTML updates)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `apps/portfolio/src/styles/components.css:226-234` - .about-content
  - `apps/portfolio/src/styles/components.css:308-313` - .resume-description
  - `apps/portfolio/src/styles/components.css:387-393` - .project-description
  - `apps/portfolio/src/styles/variables.css:74-75` - Font variable definitions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify about-content uses sans font
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep -A5 ".about-content {" apps/portfolio/src/styles/components.css | grep "font-family"
      2. Assert: Contains "font-sans"
    Expected Result: about-content uses sans font
    Evidence: grep output captured

  Scenario: Verify description classes use sans
    Tool: Bash (grep)
    Preconditions: File edited
    Steps:
      1. Run: grep -A5 ".resume-description {" apps/portfolio/src/styles/components.css | grep "font-family"
      2. Assert: Contains "font-sans" or no mono
    Expected Result: Descriptions use readable font
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `style(portfolio): typography separation - sans for content`
  - Files: `apps/portfolio/src/styles/components.css`
  - Pre-commit: none

---

- [ ] 5. Build and Deploy Worker

  **What to do**:
  - Run `node generate-worker.js` from portfolio-worker directory
  - Verify worker.js is regenerated
  - Deploy with `npx wrangler deploy --env production`

  **Must NOT do**:
  - Don't edit worker.js directly
  - Don't skip the build step

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Standard build/deploy commands
  - **Skills**: []
    - Standard bash commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after all edits)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 2, 3, 4

  **References**:
  - `apps/portfolio/generate-worker.js` - Build script
  - `apps/portfolio/AGENTS.md` - Deployment commands
  - Root `AGENTS.md` - Deploy instructions with env vars

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Build succeeds
    Tool: Bash
    Preconditions: All edits complete
    Steps:
      1. cd apps/portfolio
      2. Run: node generate-worker.js
      3. Assert: Exit code 0
      4. Assert: worker.js file updated (check mtime)
    Expected Result: Build completes without error
    Evidence: Command output and file stat

  Scenario: Deploy succeeds
    Tool: Bash
    Preconditions: Build complete, env vars available
    Steps:
      1. cd apps/portfolio
      2. Run: source ~/.env && CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY" CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL" npx wrangler deploy --env production
      3. Assert: Exit code 0
      4. Assert: Output contains "Published"
    Expected Result: Worker deployed to edge
    Evidence: Wrangler output captured
  ```

  **Commit**: NO (deployment artifact)

---

- [ ] 6. Browser Verification

  **What to do**:
  - Open https://resume.jclee.me in browser
  - Verify hero subtitle shows "보안 인프라 · Observability · 자동화"
  - Verify about section shows "8년차" not "10년"
  - Verify about section font is sans-serif (not monospace)
  - Open CLI, type `neofetch`, verify no jokes
  - Type `help`, verify only 7 commands listed
  - Open https://resume.jclee.me/en/
  - Verify hero shows "Security Infrastructure · Observability · Automation"
  - Verify about shows "8 years"

  **Must NOT do**:
  - Don't test toy commands (they should still work, just be hidden)
  - Don't test Konami code (it should still work, just not advertised)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Browser verification with Playwright
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (final verification)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 5

  **References**:
  - `apps/portfolio/AGENTS.md` - CLI command list
  - Production URL: https://resume.jclee.me

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Korean hero subtitle verified
    Tool: Playwright
    Preconditions: Deploy complete, https://resume.jclee.me accessible
    Steps:
      1. Navigate to: https://resume.jclee.me
      2. Wait for: .cmd-output visible (timeout: 10s)
      3. Assert: .cmd-output text contains "보안 인프라"
      4. Assert: .cmd-output text contains "Observability"
      5. Screenshot: .sisyphus/evidence/task-6-hero-ko.png
    Expected Result: Hero shows unified subtitle
    Evidence: .sisyphus/evidence/task-6-hero-ko.png

  Scenario: Korean about section years verified
    Tool: Playwright
    Preconditions: On Korean portfolio
    Steps:
      1. Scroll to: #about section
      2. Assert: .about-content text contains "8년차"
      3. Assert: .about-content text does NOT contain "10년"
      4. Screenshot: .sisyphus/evidence/task-6-about-ko.png
    Expected Result: About shows 8년차, not 10년
    Evidence: .sisyphus/evidence/task-6-about-ko.png

  Scenario: Korean about typography verified
    Tool: Playwright
    Preconditions: On Korean portfolio
    Steps:
      1. Evaluate: window.getComputedStyle(document.querySelector('.about-content')).fontFamily
      2. Assert: Result contains "Inter" or "system-ui" (not "JetBrains" or "monospace")
    Expected Result: About uses sans-serif font
    Evidence: Console output captured

  Scenario: CLI neofetch professional
    Tool: Playwright
    Preconditions: On Korean portfolio
    Steps:
      1. Click: #cli-input
      2. Type: neofetch
      3. Press: Enter
      4. Wait for: .cli-output contains "Role:" (timeout: 3s)
      5. Assert: .cli-output does NOT contain "Problem Solving"
      6. Assert: .cli-output does NOT contain "10+"
      7. Screenshot: .sisyphus/evidence/task-6-neofetch.png
    Expected Result: neofetch shows professional info
    Evidence: .sisyphus/evidence/task-6-neofetch.png

  Scenario: CLI help cleaned
    Tool: Playwright
    Preconditions: On Korean portfolio
    Steps:
      1. Click: #cli-input
      2. Type: help
      3. Press: Enter
      4. Wait for: .cli-output updated (timeout: 3s)
      5. Assert: .cli-output contains "neofetch"
      6. Assert: .cli-output does NOT contain "sudo hire-me"
      7. Assert: .cli-output does NOT contain "Konami"
      8. Screenshot: .sisyphus/evidence/task-6-help.png
    Expected Result: help shows only core commands
    Evidence: .sisyphus/evidence/task-6-help.png

  Scenario: English hero subtitle verified
    Tool: Playwright
    Preconditions: Deploy complete
    Steps:
      1. Navigate to: https://resume.jclee.me/en/
      2. Wait for: .cmd-output visible (timeout: 10s)
      3. Assert: .cmd-output text contains "Security Infrastructure"
      4. Screenshot: .sisyphus/evidence/task-6-hero-en.png
    Expected Result: English hero shows unified subtitle
    Evidence: .sisyphus/evidence/task-6-hero-en.png

  Scenario: English about years verified
    Tool: Playwright
    Preconditions: On English portfolio
    Steps:
      1. Scroll to: #about section
      2. Assert: .about-content text contains "8 years"
      3. Screenshot: .sisyphus/evidence/task-6-about-en.png
    Expected Result: English about shows 8 years
    Evidence: .sisyphus/evidence/task-6-about-en.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshots in .sisyphus/evidence/ for all scenarios
  - [ ] Each evidence file named: task-6-{scenario-slug}.png

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(data): unify experience years to 8년차` | resume_data.json | JSON parses |
| 2+3 | `refactor(portfolio): unify text, professionalize CLI` | index.html, index-en.html | grep checks |
| 4 | `style(portfolio): typography separation - sans for content` | components.css | grep check |
| 5 | (no commit - deploy artifact) | - | wrangler success |
| 6 | (no commit - verification) | - | Playwright passes |

---

## Success Criteria

### Verification Commands
```bash
# After deploy, run these:
curl -s https://resume.jclee.me | grep "보안 인프라"  # Expected: match
curl -s https://resume.jclee.me | grep "8년차"  # Expected: match
curl -s https://resume.jclee.me | grep "10년"  # Expected: NO match
curl -s https://resume.jclee.me/en/ | grep "8 years"  # Expected: match
curl -s https://resume.jclee.me/health  # Expected: 200 OK
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Browser verification passes (all 7 scenarios)
- [ ] No deployment errors
