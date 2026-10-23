const { generateAboutContent } = require('../../../../../apps/portfolio/lib/cards/about');
const { TEMPLATE_CACHE } = require('../../../../../apps/portfolio/lib/config');

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

describe('cards/about highlights block', () => {
  afterEach(() => {
    TEMPLATE_CACHE.dataHash = null;
    TEMPLATE_CACHE.aboutContentHtml = null;
  });

  test('renders one localized block with a list item per highlight', () => {
    const html = generateAboutContent(
      { careerHighlights: ['보안 운영 자동화', 'Linux·Terraform'] },
      'about-ko',
      'ko'
    );
    expect(html.match(/class="about-block"/g)).toHaveLength(1);
    expect(html).toContain('<span class="about-label">경력 하이라이트</span>');
    expect(html.match(/<li>.*?<\/li>/g)).toEqual([
      '<li>보안 운영 자동화</li>',
      '<li>Linux·<wbr>Terraform</li>',
    ]);
  });

  test.each([
    ['en', 'Career highlights'],
    ['ja', '経歴ハイライト'],
    ['fr', '경력 하이라이트'],
  ])('labels the %s block "%s"', (locale, label) => {
    const html = generateAboutContent({ careerHighlights: ['x'] }, `about-${locale}`, locale);
    expect(html).toContain(`<span class="about-label">${label}</span>`);
  });

  test('lets Japanese highlights wrap between words', () => {
    const html = generateAboutContent(
      { careerHighlights: ['情報セキュリティシステム運用を担当'] },
      'about-ja-breaks',
      'ja'
    );
    expect(html).toContain('<li>情報<wbr>セキュリティシステム<wbr>運用を担当</li>');
  });

  test.each([
    ['an empty list', { careerHighlights: [] }],
    ['no highlights', {}],
    ['a value that is not a list', { careerHighlights: 'text' }],
  ])('renders the About wrapper without a block for %s', (_, aboutData) => {
    const html = generateAboutContent(aboutData, 'about-empty', 'ko');
    expect(html).toContain('<div class="about-content">');
    expect(html).not.toContain('about-block');
  });

  test('renders nothing without About data', () => {
    expect(generateAboutContent(null, 'about-null', 'ko')).toBe('');
  });

  test('reuses the cached HTML while the data hash is unchanged', () => {
    TEMPLATE_CACHE.dataHash = 'about-cache';
    const first = generateAboutContent({ careerHighlights: ['first'] }, 'about-cache', 'ko');
    expect(generateAboutContent({ careerHighlights: ['second'] }, 'about-cache', 'ko')).toBe(first);
    expect(generateAboutContent({ careerHighlights: ['third'] }, 'about-other', 'ko')).toContain(
      '<li>third</li>'
    );
  });
});
