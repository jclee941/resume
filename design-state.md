# Design State

## Inferred Review Brief — 2026-07-01

Reviewed artefact: `https://resume.jclee.me` live portfolio.

Key task: a recruiter or hiring manager should quickly understand the candidate's target roles, trust the security/SRE evidence, and reach contact or deeper proof links without hunting.

Audience: recruiters, hiring managers, security/SRE leads, and the full ability spectrum including keyboard-only, low-vision, non-native Korean/English/Japanese readers, and mobile users reviewing under time pressure.

Quality bar: job-search production surface. The page should feel credible, operational, and evidence-first, not like a generic portfolio or marketing page.

Coverage note: reviewed live page screenshots, DOM structure, focus traversal, and automated accessibility signals. Screen-reader comprehension is inferred from accessible names/landmarks rather than tested with a real screen reader.

## Design Review Findings — 2026-07-01

Evidence:
- Live URL reviewed: `https://resume.jclee.me`
- Viewports: desktop `1440x1000`, mobile `390x844`
- Artifacts: `.omo/design-review-20260701/desktop-1440-first-viewport.png`, `.omo/design-review-20260701/mobile-390-first-viewport.png`, `.omo/design-review-20260701/mobile-menu-open.png`, `.omo/design-review-20260701/evidence.json`

What works:
- Desktop first viewport matches the portfolio design brief: dark operational surface, clear role positioning, availability, proof points, review paths, and contact/download actions.
- Role-based review paths are useful for recruiters and hiring managers who need to self-select quickly.
- Mobile layout has no horizontal overflow at `390px`, the menu opens cleanly, and automated accessibility found no critical or serious issues.

Major findings:
- Mobile hides the primary hiring actions too deep in the page. On `390x844`, the first contact/download CTA appears well below the first viewport, after the proof/review blocks. This weakens the primary recruiter task and keyboard flow.
- Mobile career company links have roughly `16px`-high focus/tap rectangles, below the expected `44px` touch target. Company rows should be full-height links or have enough padding/min-height for touch and motor accessibility.
- The generated About headings use internal labels, `> expertise` and `> core_competencies`, instead of reader-facing Korean copy. This makes heading navigation feel implementation-shaped and less useful for recruiters or screen-reader users.
- Mobile focus order reaches proof/review controls before the primary CTA group, so keyboard users encounter lower-priority exploration before contact or resume actions.

Minor findings:
- Axe reports `aria-allowed-role` on timeline `article` nodes with `role="listitem"`. Keep list semantics, but use allowed element/role combinations.
- Browser title is narrower than the visible positioning: `이재철 - 보안 엔지니어` while the hero says `Security / SRE Engineer`.

Recommendation:
Prioritize the mobile recruiter path before broad visual changes: move or duplicate `채용 문의` and `이력서 PDF` into the first mobile viewport, align focus order with that visual priority, then fix touch targets and reader-facing headings. The desktop direction is already credible enough; the highest-impact work is mobile task completion.

## Heuristic Evaluation - 2026-07-01

Evaluated against: Nielsen's 10 usability heuristics plus cognitive walkthrough.

Build reviewed: live `https://resume.jclee.me` at desktop `1440x1000` and mobile `390x844`.

Evidence:
- `.omo/heuristic-evaluation-20260701/evidence.json`
- `.omo/design-review-20260701/desktop-1440-first-viewport.png`
- `.omo/design-review-20260701/mobile-390-first-viewport.png`
- `.omo/design-review-20260701/mobile-menu-open.png`

Summary:
The portfolio is usable and credible on desktop, with clear hiring actions, role paths, and proof links in the first viewport. Mobile is the main usability risk: the page shows role evidence early, but delays the primary recruiter actions and jumps users deep into evidence after role-chip selection without a URL/location state.

Heuristic findings:

| # | Heuristic | Verdict | Key finding |
|---|-----------|---------|-------------|
| H1 | Visibility of system status | Warning | Role-chip selection sets `aria-pressed=true` and scrolls deep into the page, but leaves `location.hash` empty and gives weak location feedback. |
| H2 | Match between system and real world | Warning | Core portfolio language is recruiter-friendly, but `> expertise` and `> core_competencies` read like implementation labels. |
| H3 | User control and freedom | Warning | No destructive flow exists, so there is no critical H3 issue. Role-chip jumps are non-destructive but cannot be reversed through a clear in-page state or browser history. |
| H4 | Consistency and standards | Warning | Desktop prioritizes contact/download actions early; mobile prioritizes review-path links and role chips before the same actions. |
| H5 | Error prevention | Pass | No risky form or destructive action was found. PDF and language routes return `200`. |
| H6 | Recognition rather than recall | Warning | Desktop exposes all key options immediately. Mobile users must scroll or tab past review-path controls before seeing `채용 문의` and `이력서 PDF`. |
| H7 | Flexibility and efficiency of use | Warning | Multiple paths exist, but the fastest hiring path is much faster on desktop than mobile. |
| H8 | Aesthetic and minimalist design | Pass with caveat | The evidence-first visual system is disciplined. On mobile, the first viewport spends too much task space before the recruiter action group. |
| H9 | Help users recognize and recover from errors | Minor warning | `mailto:` is a valid hiring shortcut, but if the user's mail client is not configured, the first CTA gives no in-page recovery hint. |
| H10 | Help and documentation | Pass | The site is mostly self-explanatory; sitemap, EN, JA, and PDF routes are discoverable and reachable. |

Cognitive walkthrough:

Task 1: recruiter understands fit quickly.
- Desktop: passes. Name, role, availability, proof list, review packet, role paths, and CTAs are all visible in the first viewport.
- Mobile: partially passes. Role and proof are visible, but the action path is delayed; first hiring CTA appears around y=`1347`, below a `390x844` first viewport.
- Finding: H6/H7 major. Mobile asks the recruiter to consume proof before giving them the main action.

Task 2: recruiter contacts the candidate or downloads the resume.
- Desktop: passes. `채용 문의` and `이력서 PDF` are first-viewport links; `/resume.pdf` returns `200`.
- Mobile: partially fails. Keyboard order reaches review-path links around y=`818`, y=`880`, y=`941` before the CTAs at y=`1347` and y=`1403`.
- Finding: H4/H6/H7 major. Primary hiring actions should be visible and focusable earlier on mobile.

Task 3: hiring manager follows role-specific proof.
- Role chips are visible and have adequate size on mobile. Selecting `Security Ops` sets `aria-pressed=true`.
- After selection, the page scrolls to y=`4631` desktop and y=`5968` mobile, but `location.hash` remains empty and focus stays on the original chip.
- Finding: H1/H3 major. The interaction works, but orientation and return behavior are weak.

Task 4: non-Korean reviewer switches language.
- `EN` and `JA` links are visible, `44px` high, and `/en/` and `/ja/` return `200`.
- Finding: passes. Minor copy polish remains because the Korean page still exposes some English-only navigation/control labels.

Findings by severity:

Critical:
- None. No critical H1 "user is completely lost" state and no critical H3 destructive action without undo were found.

Major:
- H6/H7: mobile hides the main hiring actions below the first viewport. Move or duplicate `채용 문의` and `이력서 PDF` into the first mobile viewport.
- H4/H6: mobile focus order reaches lower-priority review-path links before contact/download. Reorder the DOM or add an early mobile action group so focus order matches recruiter priority.
- H1/H3: role-chip selection jumps deep into the page without a hash, breadcrumb, active section label, or browser-history state. Add a target hash/history state or persistent selected-role status and an obvious reset/back affordance.
- H2: generated headings `> expertise` and `> core_competencies` are not reader-facing. Replace with localized headings such as `전문 분야` and `핵심 역량`.

Minor:
- H9: `mailto:` is efficient when configured, but offers no in-page fallback if the mail client is missing. Keep the shortcut, but make the contact email visible/copyable near the first CTA.
- H4/H2: browser title says `이재철 - 보안 엔지니어` while the hero says `Security / SRE Engineer`. Align title/meta with the current target role.
- H2/H4: mobile menu toggle uses `Toggle navigation` on the Korean page. Localize the accessible label to match page language.

What works well:
- Desktop first viewport is efficient for the primary hiring task.
- Role-based review paths reduce cognitive load for different hiring evaluators.
- Language routes, sitemap, and PDF are reachable.
- Mobile has no horizontal overflow and the menu opens with `aria-expanded=true`.

Recommendation:
Revise, not rethink. The portfolio direction is strong; fix mobile task priority and role-filter orientation before doing broader visual polish.

Reconciliation:
- Aligned with design review: mobile CTA placement, focus order, and internal headings remain the highest-impact issues.
- Complementary finding: role-chip selection technically works, but heuristic evaluation adds the H1/H3 orientation problem caused by jumping without URL or state feedback.
- No conflicting findings.

Handoff chain:
- heuristic-evaluator -> design-builder: Major usability issues are mobile hiring action priority and role-chip orientation. Keep the desktop structure, but make `채용 문의` and `이력서 PDF` reachable inside the first mobile viewport and give role-chip jumps a clear selected state, URL/history state, or reset/back path. The rest of the page can be refined after those are fixed.

Open questions:
- Should mobile use an always-visible recruiter action bar, or should the hero layout simply move `채용 문의` and `이력서 PDF` above the review-path links?
- Should role-chip selection update the URL hash/history, or is a persistent selected-role banner with reset enough?

## Inferred Review Brief - 2026-07-02

Reviewed artefact: `https://resume.jclee.me` live portfolio after the recruiter-path refactor.

Key task: a recruiter should understand target roles, see public proof, and reach contact/PDF from the first mobile screen without reading repeated review scaffolding.

Audience: recruiters, hiring managers, security/SRE leads, and mobile users scanning quickly before deciding whether to open the full resume.

Quality bar: public hiring portfolio. Keep the operational command-center style, but reduce repeated choice surfaces and make the first-screen proof/action path faster.

Findings:
- Desktop first viewport is credible and evidence-first; the left proof column and right hiring packet work together.
- Mobile exposes contact and proof earlier than the previous review, but the review path and hiring packet still repeat similar labels too soon after the CTA group.
- Some hero copy is still process-heavy; it should say which role is being sought, which recent proof matters, and how to contact.

Implemented fixes:
- Tightened Korean hero positioning and proof copy around target role, recent exchange security-infra proof, and email/PDF contact path.
- Shortened public proof link details so `jclee-bot`, Grafana, and ELK scan cleanly on mobile.
- Compressed mobile review-path cards from one-column repetition to a two-column layout with the contact path spanning the row.
- Removed the mobile hiring-packet summary from the visual flow because the card list already carries the same facts.

## Design Debt Register

_Items: 3 | Critical: 0 | Oldest: 2026-07-01_

| ID | Date | Source | Severity | What | Who is affected | Suggested fix | Status | Notes |
|----|------|--------|----------|------|----------------|---------------|--------|-------|
| DD-001 | 2026-07-01 | heuristic-evaluator | Minor | `mailto:` CTA has no visible fallback if the user's mail client is not configured | Recruiters on locked-down corporate devices, mobile users | Show a copyable email address near the first CTA or provide an adjacent `Email` contact link | Open | Deferred because the link itself works and the contact section has email later |
| DD-002 | 2026-07-01 | heuristic-evaluator | Minor | Browser title is narrower than visible role positioning | Recruiters using tabs/bookmarks, search result scanners | Align title/meta with `Security / SRE Engineer` positioning | Open | Deferred until copy/SEO pass |
| DD-003 | 2026-07-01 | heuristic-evaluator | Minor | Korean page mobile menu toggle accessible label is English-only: `Toggle navigation` | Korean screen-reader users, non-English users | Localize the accessible label, for example `메뉴 열기` / `메뉴 닫기` | Open | Deferred behind higher-priority mobile CTA/focus fixes |
