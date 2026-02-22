/**
 * Unit tests for typescript/portfolio-worker/lib/templates.js
 */

const {
  generateLink,
  extractInlineHashes,
} = require('../../../../typescript/portfolio-worker/lib/templates');

describe('Templates Module', () => {
  describe('generateLink', () => {
    test('should generate basic link', () => {
      const link = generateLink({
        url: 'https://example.com',
        text: 'Click me',
        className: 'link-class',
        ariaLabel: 'Example link',
      });

      expect(link).toContain('href="https://example.com"');
      expect(link).toContain('Click me');
      expect(link).toContain('class="link-class"');
      expect(link).toContain('aria-label="Example link"');
    });

    test('should generate external link with target blank', () => {
      const link = generateLink({
        url: 'https://example.com',
        text: 'External',
        className: 'link',
        ariaLabel: 'External link',
        isExternal: true,
      });

      expect(link).toContain('target="_blank"');
      expect(link).toContain('rel="noopener noreferrer"');
    });

    test('should not include external attributes by default', () => {
      const link = generateLink({
        url: 'https://example.com',
        text: 'Internal',
        className: 'link',
        ariaLabel: 'Internal link',
      });

      expect(link).not.toContain('target="_blank"');
      expect(link).not.toContain('rel="noopener noreferrer"');
    });

    test('should generate download link', () => {
      const link = generateLink({
        url: 'https://example.com/file.pdf',
        text: 'Download',
        className: 'download-link',
        ariaLabel: 'Download file',
        isDownload: true,
      });

      expect(link).toContain(' download');
    });

    test('should not include download attribute by default', () => {
      const link = generateLink({
        url: 'https://example.com',
        text: 'Normal',
        className: 'link',
        ariaLabel: 'Normal link',
      });

      expect(link).not.toContain(' download');
    });

    test('should handle both external and download', () => {
      const link = generateLink({
        url: 'https://example.com/file.pdf',
        text: 'External Download',
        className: 'link',
        ariaLabel: 'External download link',
        isExternal: true,
        isDownload: true,
      });

      expect(link).toContain('target="_blank"');
      expect(link).toContain(' download');
    });

    test('should return valid HTML anchor tag', () => {
      const link = generateLink({
        url: 'https://test.com',
        text: 'Test',
        className: 'test',
        ariaLabel: 'Test',
      });

      expect(link).toMatch(/^<a.*>.*<\/a>$/);
    });
  });

  describe('extractInlineHashes', () => {
    test('should extract script hash from inline script', () => {
      const html = '<html><script>console.log("test");</script></html>';
      const { scriptHashes, styleHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(1);
      expect(scriptHashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
      expect(styleHashes).toHaveLength(0);
    });

    test('should extract style hash from inline style', () => {
      const html = '<html><style>body { color: red; }</style></html>';
      const { scriptHashes, styleHashes } = extractInlineHashes(html);

      expect(styleHashes).toHaveLength(1);
      expect(styleHashes[0]).toMatch(/^'sha256-[A-Za-z0-9+/=]+'$/);
      expect(scriptHashes).toHaveLength(0);
    });

    test('should extract multiple script hashes', () => {
      const html =
        '<html><script>console.log(1);</script><script>console.log(2);</script></html>';
      const { scriptHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(2);
    });

    test('should extract multiple style hashes', () => {
      const html = '<html><style>body{}</style><style>.class{}</style></html>';
      const { styleHashes } = extractInlineHashes(html);

      expect(styleHashes).toHaveLength(2);
    });

    test('should not extract external scripts (with src)', () => {
      const html =
        '<html><script src="external.js"></script><script>inline();</script></html>';
      const { scriptHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(1);
    });

    test('should handle JSON-LD scripts', () => {
      const html =
        '<html><script type="application/ld+json">{"@type":"Person"}</script></html>';
      const { scriptHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(1);
    });

    test('should return empty arrays for no inline content', () => {
      const html = '<html><body>No scripts or styles</body></html>';
      const { scriptHashes, styleHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(0);
      expect(styleHashes).toHaveLength(0);
    });

    test('should handle empty script tag', () => {
      const html = '<html><script></script></html>';
      const { scriptHashes } = extractInlineHashes(html);

      // Empty scripts should not generate hash
      expect(scriptHashes).toHaveLength(0);
    });

    test('should handle empty style tag', () => {
      const html = '<html><style></style></html>';
      const { styleHashes } = extractInlineHashes(html);

      // Empty styles should not generate hash
      expect(styleHashes).toHaveLength(0);
    });

    test('should preserve whitespace in hash calculation', () => {
      const html1 = '<script>console.log("test");</script>';
      const html2 = '<script>  console.log("test");  </script>';

      const { scriptHashes: hashes1 } = extractInlineHashes(html1);
      const { scriptHashes: hashes2 } = extractInlineHashes(html2);

      // Different whitespace should produce different hashes
      expect(hashes1[0]).not.toBe(hashes2[0]);
    });

    test('should handle multiline scripts', () => {
      const html = `<script>
        function test() {
          return true;
        }
      </script>`;
      const { scriptHashes } = extractInlineHashes(html);

      expect(scriptHashes).toHaveLength(1);
    });

    test('should handle multiline styles', () => {
      const html = `<style>
        .class {
          color: red;
          background: blue;
        }
      </style>`;
      const { styleHashes } = extractInlineHashes(html);

      expect(styleHashes).toHaveLength(1);
    });
  });
});
