const {
  injectPlaceholders,
  minifyHtml,
  escapeForTemplateLiteral,
  buildLocalizedHtml,
} = require('../../../../typescript/portfolio-worker/lib/html-transformer');

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
        <script>const chatData = /* RESUME_CHAT_DATA_B64_PLACEHOLDER */ '';</script>
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
        resumeChatDataBase64: "'YmFzZTY0'",
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
      expect(result).toContain(options.resumeChatDataBase64);

      expect(result).not.toContain('CSS_PLACEHOLDER');
      expect(result).not.toContain('HERO_CONTENT_PLACEHOLDER');
      expect(result).not.toContain('RESUME_CHAT_DATA_B64_PLACEHOLDER');
    });

    test('uses default chat data when chat payload is empty string or falsy', () => {
      const html = "<script>const chatData = /* RESUME_CHAT_DATA_B64_PLACEHOLDER */ '';</script>";

      expect(injectPlaceholders(html, { resumeChatDataBase64: '' })).toContain(
        "const chatData = '';"
      );
      expect(injectPlaceholders(html, { resumeChatDataBase64: null })).toContain(
        "const chatData = '';"
      );
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
      DOLLAR: /\$/g,
    };

    test('escapes in strict order: backslash, then backtick, then dollar', () => {
      const input = '\\`$\\';
      const escaped = escapeForTemplateLiteral(input, escapePatterns);
      const wrongOrderEscaped = input
        .replace(escapePatterns.BACKTICK, '\\`')
        .replace(escapePatterns.BACKSLASH, '\\\\')
        .replace(escapePatterns.DOLLAR, '\\$');

      expect(escaped).toBe('\\\\\\`\\$\\\\');
      expect(escaped).not.toBe(wrongOrderEscaped);
    });

    test('escapes mixed content', () => {
      const input = 'path\\to\\file `price` is $100';
      const escaped = escapeForTemplateLiteral(input, escapePatterns);

      expect(escaped).toBe('path\\\\to\\\\file \\`price\\` is \\$100');
    });

    test('handles empty string', () => {
      expect(escapeForTemplateLiteral('', escapePatterns)).toBe('');
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
            <script>const chatData = /* RESUME_CHAT_DATA_B64_PLACEHOLDER */ '';</script>
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
        resumeChatDataBase64: "'YWJj'",
      });

      expect(typeof output).toBe('string');
      expect(output).toContain('<section id="hero">hero</section>');
      expect(output).not.toContain('<!-- strip me -->');

      expect(output).toMatch(
        /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-P9E8XY5K2L" integrity="sha384-[^"]+" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>/
      );
      expect(output).toMatch(
        /<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer(?:="defer")? integrity="sha384-[^"]+" crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>/
      );
    });
  });
});
