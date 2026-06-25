const fs = require('fs');
const path = require('path');

describe('portfolio hiring appeal copy', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const readPortfolioFile = (fileName) =>
    fs.readFileSync(path.join(portfolioDir, fileName), 'utf8');
  const buildJapaneseTemplate = () =>
    require('../../apps/portfolio/lib/html-transformer').buildJapaneseTemplate(
      readPortfolioFile('index.html')
    );

  const extractHeroActions = (html) => {
    const groupMatch = html.match(/<div class="hero-cta"[^>]*>([\s\S]*?)<\/div>/);
    expect(groupMatch).not.toBeNull();

    return Array.from(
      groupMatch[1].matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a\s*>/g)
    ).map(([, href, label]) => ({
      href,
      label: label.trim(),
    }));
  };

  test('Korean hero gives recruiters a direct review-pack path', () => {
    const html = readPortfolioFile('index.html');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '채용 논의' }),
      { href: '#resume', label: '경력 근거' },
      { href: '#projects', label: '프로젝트 근거' },
      expect.objectContaining({ href: '/resume.pdf', label: 'PDF' }),
    ]);
    expect(html).toContain('id="resume"');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = readPortfolioFile('index-en.html');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: 'Discuss a role' }),
      { href: '#resume', label: 'Review career evidence' },
      { href: '#projects', label: 'Review project evidence' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(html).toContain('id="resume"');
  });

  test('Japanese hero localizes recruiter proof and review-pack actions', () => {
    const html = buildJapaneseTemplate();

    expect(html).toContain(
      '<p class="hero-availability">セキュリティ運用・SRE・DevSecOpsを検討可能</p>'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="代表的な業務証跡">');
    expect(html).toContain('取引所セキュリティインフラの構築・運用');
    expect(html).toContain('ネットワーク分離・エンドポイントセキュリティ運用');
    expect(html).toContain('Splunk ES · n8n · FortiManager APIベースのセキュリティイベント自動化');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '採用相談' }),
      { href: '#resume', label: '経歴根拠' },
      { href: '#projects', label: 'プロジェクト根拠' },
      expect.objectContaining({ href: '/resume.pdf', label: 'PDF' }),
    ]);

    const heroBlock = html.slice(
      html.indexOf('<section id="hero"'),
      html.indexOf('</section>', html.indexOf('<section id="hero"'))
    );
    expect(heroBlock).not.toMatch(/[\uac00-\ud7a3]{2,}/);
  });
});
