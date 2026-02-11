const fs = require('fs');
const path = require('path');

describe('Worker Generator', () => {
  const webDir = path.join(__dirname, '../../../typescript/portfolio-worker');
  const workerPath = path.join(webDir, 'worker.js');

  beforeAll(() => {
    // Run generate-worker.js before tests
    require('../../../typescript/portfolio-worker/generate-worker.js');
  });

  describe('worker.js generation', () => {
    test('worker.js should be created', () => {
      expect(fs.existsSync(workerPath)).toBe(true);
    });

    test('worker.js should contain INDEX_HTML constant', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('const INDEX_HTML');
    });

    test('worker.js should have security headers', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('SECURITY_HEADERS');
      expect(workerContent).toContain('X-Content-Type-Options');
      expect(workerContent).toContain('X-Frame-Options');
      expect(workerContent).toContain('Content-Security-Policy');
    });

    test('worker.js should have routing logic', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('INDEX_HTML');
      expect(workerContent).toContain('url.pathname');
      expect(workerContent).toContain('new Response');
    });
  });

  describe('HTML escaping', () => {
    test('backticks should be escaped in embedded HTML', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');

      // Should not contain unescaped backticks within template literals
      // This is a simplified check - actual implementation may vary
      const templateLiteralMatches = workerContent.match(/const INDEX_HTML = `[\s\S]*?`;/g);

      if (templateLiteralMatches) {
        templateLiteralMatches.forEach((match) => {
          // Count unescaped backticks (not preceded by backslash)
          const unescapedBackticks = (match.match(/[^\\]`/g) || []).length;
          // Should have exactly 2 (opening and closing of template literal)
          expect(unescapedBackticks).toBeLessThanOrEqual(2);
        });
      }
    });

    test('dollar signs should be escaped in embedded HTML', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');

      // Extract only the HTML template literal (INDEX_HTML)
      const htmlTemplateRegex = /const INDEX_HTML = `([\s\S]*?)`;/g;
      let htmlMatch;
      let hasUnescapedDollarInHtml = false;

      while ((htmlMatch = htmlTemplateRegex.exec(workerContent)) !== null) {
        const htmlContent = htmlMatch[1];
        // Check for unescaped ${...} patterns in HTML content
        // This would break the worker's template literal if not escaped
        if (htmlContent.match(/(?<!\\)\$\{/)) {
          hasUnescapedDollarInHtml = true;
          break;
        }
      }

      // HTML content should NOT have unescaped ${...} patterns
      expect(hasUnescapedDollarInHtml).toBeFalsy();
    });
  });

  describe('Worker export', () => {
    test('should export default object with fetch method', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('export default');
      expect(workerContent).toContain('async fetch(request, env, ctx)');
    });

    test('should use new Response with proper headers', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('new Response');
      expect(workerContent).toContain('headers:');
    });
  });

  describe('Security', () => {
    test('should include all required security headers', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');

      const requiredHeaders = [
        'Content-Type',
        'Cache-Control',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Content-Security-Policy',
      ];

      requiredHeaders.forEach((header) => {
        expect(workerContent).toContain(header);
      });
    });

    test('X-Frame-Options should be DENY', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('"X-Frame-Options": "DENY"');
    });

    test('X-Content-Type-Options should be nosniff', () => {
      const workerContent = fs.readFileSync(workerPath, 'utf-8');
      expect(workerContent).toContain('"X-Content-Type-Options": "nosniff"');
    });
  });
});
