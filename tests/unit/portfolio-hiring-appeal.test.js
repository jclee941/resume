const fs = require('fs');
const path = require('path');

describe('portfolio hiring appeal copy', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const readPortfolioFile = (fileName) =>
    fs.readFileSync(path.join(portfolioDir, fileName), 'utf8');
  const buildHeroContent = (locale) =>
    require('../../apps/portfolio/lib/hero-content').buildHeroContent(locale);

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
    const html = buildHeroContent('ko');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '채용 문의' }),
      { href: '#resume', label: '경력 보기' },
      { href: '#projects', label: '프로젝트 보기' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(readPortfolioFile('index.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = buildHeroContent('en');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({
        href: expect.stringMatching(/^mailto:/),
        label: 'Contact about role',
      }),
      { href: '#resume', label: 'Career evidence' },
      { href: '#projects', label: 'Project evidence' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(readPortfolioFile('index-en.html')).toContain('<!-- HERO_CONTENT_PLACEHOLDER -->');
  });

  test('Japanese hero localizes recruiter proof and review-pack actions', () => {
    const html = buildHeroContent('ja');

    expect(html).toContain(
      '<p class="hero-availability">セキュリティ運用・SRE・DevSecOpsを検討可能</p>'
    );
    expect(html).toContain('<ul class="hero-proof-list" aria-label="代表的な業務証跡">');
    expect(html).toContain('取引所ネットワーク分離・エンドポイントセキュリティ構築・運用');
    expect(html).toContain('Splunk ES検知ルール・通知ワークフロー整理');
    expect(html).toContain('FortiManager API・IaCベースの運用自動化');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '採用相談' }),
      { href: '#resume', label: '経歴を見る' },
      { href: '#projects', label: 'プロジェクトを見る' },
      expect.objectContaining({ href: '/resume.pdf', label: '履歴書PDF' }),
    ]);

    expect(html).not.toMatch(/[\uac00-\ud7a3]{2,}/);
  });
});
