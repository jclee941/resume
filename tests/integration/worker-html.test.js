const fs = require('fs');
const path = require('path');

describe('Worker-HTML Integration', () => {
  let workerCode;

  beforeAll(() => {
    // Read generated worker
    const workerPath = path.join(__dirname, '../../typescript/portfolio-worker/worker.js');
    workerCode = fs.readFileSync(workerPath, 'utf-8');
  });

  describe('HTML Embedding', () => {
    test('worker should contain HTML file as constant', () => {
      expect(workerCode).toContain('const INDEX_HTML');
    });

    test('embedded HTML should have reasonable size', () => {
      // Worker should have reasonable size (minification makes it smaller than source)
      // Just check it's not empty and has substantial content
      expect(workerCode.length).toBeGreaterThan(10000);
    });

    test('embedded HTML should not have unescaped template literals', () => {
      // Extract embedded HTML from worker
      const indexMatch = workerCode.match(/const INDEX_HTML = `([\s\S]*?)`;/);

      if (indexMatch) {
        const embeddedIndex = indexMatch[1];
        // Should not have unescaped ${ patterns
        const unescapedDollarBraces = (embeddedIndex.match(/[^\\]\$\{/g) || []).length;
        expect(unescapedDollarBraces).toBe(0);
      }
    });
  });

  describe('Worker Structure', () => {
    test('worker should export default object with fetch method', () => {
      expect(workerCode).toContain('export default');
      expect(workerCode).toContain('async fetch(request, env, ctx)');
    });

    test('worker should have routing logic', () => {
      expect(workerCode).toContain('url.pathname');
      expect(workerCode).toContain('new Response');
    });

    test('worker should return responses with security headers', () => {
      expect(workerCode).toContain('SECURITY_HEADERS');
      expect(workerCode).toContain('new Response');
      expect(workerCode).toContain('headers:');
    });
  });

  describe('Content Integrity', () => {
    test('embedded index.html should contain key portfolio elements', () => {
      // Check if worker contains critical content from index.html
      const criticalContent = ['Infrastructure', 'Security', 'Engineer', 'project-card'];

      criticalContent.forEach((content) => {
        expect(workerCode).toContain(content);
      });
    });

    test('embedded HTML should contain name', () => {
      expect(workerCode).toContain('이재철');
    });

    test('security headers should be complete', () => {
      const requiredHeaders = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Content-Security-Policy',
      ];

      requiredHeaders.forEach((header) => {
        expect(workerCode).toContain(header);
      });
    });
  });

  describe('Build Reproducibility', () => {
    test('regenerating worker should produce consistent output', () => {
      // Run generate-worker.js (side effect: regenerates worker.js)
      require('../../typescript/portfolio-worker/generate-worker.js');

      // Read newly generated worker
      const newWorkerCode = fs.readFileSync(
        path.join(__dirname, '../../typescript/portfolio-worker/worker.js'),
        'utf-8'
      );

      // Length should be consistent (some variance allowed for timestamps if any)
      const lengthDiff = Math.abs(workerCode.length - newWorkerCode.length);
      expect(lengthDiff).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    test('worker should not contain console.error or throw statements', () => {
      // Production worker should not have error handling that leaks info
      const hasConsoleError = workerCode.includes('console.error');
      const hasThrow = workerCode.includes('throw new Error');

      // These are acceptable in comments or embedded HTML, not in worker logic
      if (hasConsoleError || hasThrow) {
        // Verify they're only in embedded HTML, not worker code
        const workerLogic = workerCode.split('const INDEX_HTML')[0];
        expect(workerLogic).not.toContain('console.error');
        expect(workerLogic).not.toContain('throw new Error');
      }
    });

    test('worker should handle route pattern', () => {
      // Check for routing logic (flexible: supports both ROUTES object and if-else patterns)
      expect(workerCode).toContain('url.pathname');
      // Check for index route handling
      expect(workerCode).toMatch(/url\.pathname\s*===?\s*['"`]\/['"`]/);
      // Check for response creation
      expect(workerCode).toContain('new Response(');
      // Check for INDEX_HTML being served
      expect(workerCode).toContain('INDEX_HTML');
    });
  });
});
