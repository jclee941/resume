const { generateAboutContent } = require('../../../../../apps/portfolio/lib/cards/about');

describe('cards/about technology wrapping', () => {
  test('adds soft breaks only at separators after escaping user content', () => {
    const html = generateAboutContent(
      { careerHighlights: ['Linux·Terraform·Splunk SPL·<script>'] },
      'about-technology-wrapping',
      'ko'
    );
    expect(html).toContain('<li>Linux·<wbr>Terraform·<wbr>Splunk SPL·<wbr>&lt;script&gt;</li>');
    expect(html).not.toContain('<script>');
  });
});
