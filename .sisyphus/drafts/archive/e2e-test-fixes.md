# Draft: E2E Test Failure Fixes (24 failures)

## Requirements (confirmed)

### Failure Categories

| Category | Failures | Root Cause | Priority |
|----------|----------|------------|----------|
| SEO meta tags | 3 | `og-image.png` vs `.webp` mismatch | HIGH |
| JSON-LD schema | 1 | WebSite missing `potentialAction` | HIGH |
| Visual regression | 12 | Content changed, baselines stale | MEDIUM |
| Mobile touch | 6 | Element outside viewport on click | MEDIUM |
| Readable text | 3 | Small text count exceeds threshold | LOW |

**Total: 24 failures (possibly 25 - text size unclear)**

---

## Technical Decisions

### 1. SEO Failures (seo.spec.js lines 109, 219)

**Problem**: 
- Test expects: `og-image.webp`
- HTML has: `og-image.png` (primary) + `og-image.webp` (secondary)
- Test's `.first()` or attribute retrieval gets `.png` first

**Options**:
1. Fix HTML: Move webp to be first og:image → **CHOSEN**
2. Fix test: Accept either format

**Decision**: Fix HTML since webp is better format. Update:
- Line 27: `og-image.png` → `og-image.webp` (primary)
- Line 46: `twitter:image` → `og-image.webp`

### 2. JSON-LD WebSite Schema (seo.spec.js line 356)

**Problem**:
- Test expects `websiteSchema.potentialAction["@type"] === "SearchAction"`
- Current HTML (lines 145-152) has NO `potentialAction` field

**Fix**: Add potentialAction with SearchAction:
```json
"potentialAction": {
  "@type": "SearchAction",
  "target": "https://resume.jclee.me/?q={search_term_string}",
  "query-input": "required name=search_term_string"
}
```

### 3. Mobile Touch Interactions (mobile.spec.js lines 200-220)

**Problem**:
- Code: `page.locator("button, a[href]").first()`
- First button/link in DOM may be outside viewport
- `.click()` fails with "element outside viewport"

**Fix**: Add scroll before click:
```javascript
await clickable.scrollIntoViewIfNeeded();  // ADD THIS
await clickable.click();
```

### 4. Visual Regression (visual.spec.js - 12 tests)

**Problem**: Content/copy changed ("AIOps & Infrastructure Engineer" etc.)
**Fix**: Run snapshot update command:
```bash
npx playwright test visual.spec.js --update-snapshots
```

### 5. Readable Text Sizes (mobile.spec.js line 95)

**Problem**: `tooSmallCount >= 5` (threshold exceeded)
**Investigation needed**: Which elements have font-size < 14px?
**Options**:
1. Fix CSS: Increase min font-size
2. Relax threshold: 5 → 8
3. Filter out decorative elements

---

## Research Findings

### File Locations
- Source HTML: `/apps/portfolio/index.html`
- Generate script: `/apps/portfolio/generate-worker.js`
- Mobile tests: `/tests/e2e/mobile.spec.js`
- Visual tests: `/tests/e2e/visual.spec.js`
- SEO tests: `/tests/e2e/seo.spec.js`

### Key Lines
| File | Line | Issue |
|------|------|-------|
| `index.html` | 27 | og:image content (png) |
| `index.html` | 32 | og:image webp (secondary) |
| `index.html` | 46 | twitter:image (png) |
| `index.html` | 145-152 | WebSite JSON-LD (missing potentialAction) |
| `mobile.spec.js` | 217 | click without scrollIntoView |
| `mobile.spec.js` | 112 | font-size < 14 threshold |
| `seo.spec.js` | 109 | expects webp |
| `seo.spec.js` | 219 | expects webp |
| `seo.spec.js` | 356 | expects potentialAction |

---

## Open Questions

1. **Text size threshold**: Should we fix CSS or relax the test threshold?
   - Need to identify which elements have small fonts
   
2. **Visual snapshot update strategy**: 
   - Update all 12 at once, or review each diff first?

---

## Scope Boundaries

### INCLUDE
- Fix 4 specific SEO issues (og:image, twitter:image, potentialAction)
- Fix mobile touch test (scrollIntoView)
- Update visual snapshots
- Address text size issues

### EXCLUDE
- New features
- Refactoring beyond fixes
- Performance optimizations
- Changes to actual portfolio content (only test/meta fixes)
