const {
  buildJapaneseTemplate,
  injectPlaceholders,
  minifyHtml,
  escapeForTemplateLiteral,
  buildLocalizedHtml,
} = require('../../../../apps/portfolio/lib/html-transformer');

describe('html-transformer', () => {
  describe('injectPlaceholders', () => {
    test('replaces all placeholders including both CSS placeholder formats', () => {
      const html = `
        <style>/* CSS_PLACEHOLDER */</style>
        <!-- CSS_PLACEHOLDER -->
        <!-- HERO_CONTENT_PLACEHOLDER -->
        <!-- RESUME_DESCRIPTION_PLACEHOLDER -->
        <!-- RESUME_CARDS_PLACEHOLDER -->
        <!-- PROJECT_CARDS_PLACEHOLDER -->
        <!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->
        <!-- CERTIFICATION_CARDS_PLACEHOLDER -->
        <!-- SKILLS_LIST_PLACEHOLDER -->
        <!-- CONTACT_GRID_PLACEHOLDER -->
        <a href="<!-- RESUME_PDF_URL -->">PDF</a>
        <a href="<!-- RESUME_DOCX_URL -->">DOCX</a>
        <a href="<!-- RESUME_MD_URL -->">MD</a>
      `;

      const options = {
        cssContent: 'body { color: #111; }',
        heroContentHtml: '<section>hero</section>',
        resumeDescriptionHtml: '<p>resume desc</p>',
        resumeCardsHtml: '<li>resume card</li>',
        projectCardsHtml: '<li>project card</li>',
        infrastructureCardsHtml: '<li>infra card</li>',
        certCardsHtml: '<li>cert card</li>',
        skillsHtml: '<ul><li>skill</li></ul>',
        contactGridHtml: '<div>contact</div>',
        resumePdfUrl: '/resume.pdf',
        resumeDocxUrl: '/resume.docx',
        resumeMdUrl: '/resume.md',
      };

      const result = injectPlaceholders(html, options);

      expect(result).toContain(options.cssContent);
      expect(result).toContain(options.heroContentHtml);
      expect(result).toContain(options.resumeDescriptionHtml);
      expect(result).toContain(options.resumeCardsHtml);
      expect(result).toContain(options.projectCardsHtml);
      expect(result).toContain(options.infrastructureCardsHtml);
      expect(result).toContain(options.certCardsHtml);
      expect(result).toContain(options.skillsHtml);
      expect(result).toContain(options.contactGridHtml);
      expect(result).toContain(options.resumePdfUrl);
      expect(result).toContain(options.resumeDocxUrl);
      expect(result).toContain(options.resumeMdUrl);

      expect(result).not.toContain('CSS_PLACEHOLDER');
      expect(result).not.toContain('HERO_CONTENT_PLACEHOLDER');
    });

    test('leaves html unchanged when no placeholders are present', () => {
      const html = '<div>no placeholders here</div>';
      const result = injectPlaceholders(html, {});

      expect(result).toBe(html);
    });

    test('handles empty options object gracefully', () => {
      const html = '<div>safe</div>';
      expect(() => injectPlaceholders(html, {})).not.toThrow();
      expect(injectPlaceholders(html, {})).toBe('<div>safe</div>');
    });
  });

  describe('minifyHtml', () => {
    test('removes html comments and collapses whitespace', async () => {
      const html = `
        <div>
          <!-- remove this -->
          <span>  hello    world  </span>
        </div>
      `;

      const result = await minifyHtml(html);

      expect(typeof result).toBe('string');
      expect(result).not.toContain('<!-- remove this -->');
      expect(result).toContain('<span>hello world</span>');
    });

    test('handles empty input', async () => {
      const result = await minifyHtml('');

      expect(typeof result).toBe('string');
      expect(result).toBe('');
    });
  });

  describe('escapeForTemplateLiteral', () => {
    const escapePatterns = {
      BACKSLASH: /\\/g,
      BACKTICK: /`/g,
      DOLLAR_BRACE: /\$\{/g,
    };

    test('escapes in strict order: backslash, then backtick, then dollar-brace', () => {
      const input = '\\`${value}\\';
      const escaped = escapeForTemplateLiteral(input, escapePatterns);
      const wrongOrderEscaped = input
        .replace(escapePatterns.BACKTICK, '\\`')
        .replace(escapePatterns.BACKSLASH, '\\\\')
        .replace(escapePatterns.DOLLAR_BRACE, () => '\\${');

      expect(escaped).toBe('\\\\\\`\\${value}\\\\');
      expect(escaped).not.toBe(wrongOrderEscaped);
    });

    test('escapes mixed content', () => {
      const input = 'path\\to\\file `price` is $100 and ${name}';
      const escaped = escapeForTemplateLiteral(input, escapePatterns);

      expect(escaped).toBe('path\\\\to\\\\file \\`price\\` is $100 and \\${name}');
    });

    test('handles empty string', () => {
      expect(escapeForTemplateLiteral('', escapePatterns)).toBe('');
    });
  });

  describe('buildJapaneseTemplate', () => {
    test('marks only JA active when the KO language link spans lines', () => {
      const html = `
        <html lang="ko">
          <body>
            <ul class="lang-switcher" aria-label="언어 선택 / Language">
              <li>
                <a
                  href="/"
                  hreflang="ko"
                  aria-current="true"
                  class="lang-link lang-link--active"
                  lang="ko"
                  >KO</a
                >
              </li>
              <li><a href="/en/" hreflang="en" class="lang-link" lang="en">EN</a></li>
              <li><a href="/ja/" hreflang="ja" class="lang-link" lang="ja">JA</a></li>
            </ul>
          </body>
        </html>
      `;

      const result = buildJapaneseTemplate(html);
      const activeLabels = [
        ...result.matchAll(
          /<a\b[^>]*class="[^"]*lang-link--active[^"]*"[^>]*>\s*(KO|EN|JA)\s*<\/a\s*>/g
        ),
      ].map((match) => match[1]);
      const currentLabels = [
        ...result.matchAll(/<a\b[^>]*aria-current="true"[^>]*>\s*(KO|EN|JA)\s*<\/a\s*>/g),
      ].map((match) => match[1]);

      expect(activeLabels).toEqual(['JA']);
      expect(currentLabels).toEqual(['JA']);
    });
  });

  describe('buildLocalizedHtml', () => {
    test('injects placeholders, adds SRI to external scripts, and returns minified html', async () => {
      const html = `
        <html>
          <head>
            <!-- strip me -->
            <style>/* CSS_PLACEHOLDER */</style>
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-P9E8XY5K2L"></script>
            <script src="https://accounts.google.com/gsi/client" async defer></script>
          </head>
          <body>
            <!-- HERO_CONTENT_PLACEHOLDER -->
            <!-- RESUME_DESCRIPTION_PLACEHOLDER -->
            <!-- RESUME_CARDS_PLACEHOLDER -->
            <!-- PROJECT_CARDS_PLACEHOLDER -->
            <!-- INFRASTRUCTURE_CARDS_PLACEHOLDER -->
            <!-- CERTIFICATION_CARDS_PLACEHOLDER -->
            <!-- SKILLS_LIST_PLACEHOLDER -->
            <!-- CONTACT_GRID_PLACEHOLDER -->
            <a href="<!-- RESUME_PDF_URL -->">PDF</a>
            <a href="<!-- RESUME_DOCX_URL -->">DOCX</a>
            <a href="<!-- RESUME_MD_URL -->">MD</a>
          </body>
        </html>
      `;

      const output = await buildLocalizedHtml(html, {
        cssContent: 'body { margin: 0; }',
        heroContentHtml: '<section id="hero">hero</section>',
        resumeDescriptionHtml: '<p>desc</p>',
        resumeCardsHtml: '<li>resume</li>',
        projectCardsHtml: '<li>project</li>',
        infrastructureCardsHtml: '<li>infra</li>',
        certCardsHtml: '<li>cert</li>',
        skillsHtml: '<li>skill</li>',
        contactGridHtml: '<li>contact</li>',
        resumePdfUrl: '/resume.pdf',
        resumeDocxUrl: '/resume.docx',
        resumeMdUrl: '/resume.md',
      });

      expect(typeof output).toBe('string');
      expect(output).toContain('<section id="hero">hero</section>');
      expect(output).not.toContain('<!-- strip me -->');

      // GA gtag script should NOT have SRI (Google updates content frequently, breaking fixed hashes)
      expect(output).toContain('src="https://www.googletagmanager.com/gtag/js?id=G-P9E8XY5K2L"');
      expect(output).not.toMatch(/googletagmanager\.com[^>]*integrity=/);
      expect(output).toMatch(
        /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer(?:="defer")? integrity="sha384-[^"]+" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>/
      );
    });
  });
});
