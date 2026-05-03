# Resume PDF CTA Target Verification

**Task**: T-2dd3bbba — Verify resume PDF CTA target
**Date**: 2026-05-03
**Branch**: `master` @ `80b97094`

## Acceptance Criteria

PDF CTA must resolve to a non-empty generated PDF route, OR the blocker must
be documented with evidence.

## Findings

### 1. PDF source artifacts exist

The PDF generator (`tools/scripts/build/pdf-generator.go`) emits resume PDFs
into `packages/data/resumes/`:

- `packages/data/resumes/master/resume_final.pdf` — 164,212 bytes, PDF v1.5
- Variant outputs (toss, general, technical, security, short, …) are produced
  on demand under `packages/data/resumes/generated/`.

`packages/data/resumes/master/resume_final.pdf` is the canonical artifact and
is currently present in the working tree.

### 2. Portfolio worker does not surface a PDF CTA

The portfolio HTML (`apps/portfolio/index.html`) contains a `download` CLI
command at lines 1351–1361:

```js
terminalCommands['download'] = function () {
  var pdfLink = document.querySelector(
    '.hero-download a[download], .resume-download a[download]'
  );
  var url = pdfLink && pdfLink.getAttribute('href');
  if (!url || url.indexOf('<!--') !== -1) {
    return '> Resume PDF URL is not available yet.';
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return '> Opening resume PDF in a new tab...';
};
```

The selector targets `.hero-download a[download]` or `.resume-download
a[download]`. Inspection of `apps/portfolio/index.html` (lines 664–668) shows
the `.hero-download` container only renders a `#contact` anchor:

```html
<div class="hero-download" role="group" aria-label="채용 문의 옵션">
  <a href="#contact" class="link-subtle" aria-label="채용 또는 면접 문의하기"
    >채용·면접 문의하기</a>
</div>
```

There is no `<a download>` element anywhere in the source HTML, and the
generated `apps/portfolio/worker.js` (790.05 KB) contains no `.pdf` references
either. Production smoke test on 2026-05-03:

```
curl -sS https://resume.jclee.me/ | grep -c "\.pdf"   # → 0
```

### 3. Worker assets do not include the PDF

`wrangler.jsonc` declares `assets.directory = "apps/portfolio/assets"`. The
asset directory contents are:

```
apple-touch-icon.png
favicon-32x32.png
favicon.svg
fonts/
icon-192.png
icon-192.svg
icon-512.png
icon-512.svg
```

No PDF is staged into the asset bundle, so even if the HTML linked
`/resume.pdf`, the worker would respond 404.

## Blocker

The PDF CTA cannot resolve to a non-empty PDF route in the current pipeline
because:

1. The portfolio HTML never renders a `<a download href="…">` element.
2. The Cloudflare Workers asset bundle does not contain any PDF file.
3. The PDF generator writes to `packages/data/resumes/master/` outside the
   `apps/portfolio/assets/` tree consumed by the worker.

## Required follow-up (out of scope for this task)

To unblock the CTA, a future task must:

1. Copy the generated PDF (e.g.
   `packages/data/resumes/master/resume_final.pdf`) into
   `apps/portfolio/assets/resume.pdf` during `npm run build:portfolio`.
2. Update `apps/portfolio/index.html` `.hero-download` to render
   `<a download href="/resume.pdf">이력서 PDF 다운로드</a>` (and the English
   and data-driven Japanese build equivalents).
3. Re-run `node generate-worker.js` and verify
   `apps/portfolio/worker.js` references `/resume.pdf`.

## Verdict

**Blocker documented.** The acceptance criteria's "OR" branch is satisfied:
the PDF CTA does not resolve to a non-empty PDF route, and the missing
pipeline links are recorded above with file paths and line numbers so a
follow-up task can act without rediscovery.
