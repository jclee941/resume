const fs = require('fs');
const path = require('path');

describe('portfolio hiring appeal copy', () => {
  const portfolioDir = path.join(__dirname, '../../apps/portfolio');
  const readPortfolioFile = (fileName) => fs.readFileSync(path.join(portfolioDir, fileName), 'utf8');
  const buildJapaneseTemplate = () =>
    require('../../apps/portfolio/lib/html-transformer').buildJapaneseTemplate(readPortfolioFile('index.html'));

  const extractHeroActions = (html) => {
    const groupMatch = html.match(/<div class="hero-cta"[^>]*>([\s\S]*?)<\/div>/);
    expect(groupMatch).not.toBeNull();

    return Array.from(groupMatch[1].matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)).map(([, href, label]) => ({
      href,
      label,
    }));
  };

  test('Korean hero gives recruiters a direct review-pack path', () => {
    const html = readPortfolioFile('index.html');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '채용 문의' }),
      { href: '#resume', label: '채용 검토 자료' },
      { href: '#projects', label: '증빙 프로젝트 보기' },
      expect.objectContaining({ href: '/resume.pdf', label: '이력서 PDF' }),
    ]);
    expect(html).toContain('id="resume"');
  });

  test('English hero gives recruiters a direct review-pack path', () => {
    const html = readPortfolioFile('index-en.html');

    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: 'Contact for hiring' }),
      { href: '#resume', label: 'Hiring review pack' },
      { href: '#projects', label: 'View proof projects' },
      expect.objectContaining({ href: '/resume.pdf', label: 'Resume PDF' }),
    ]);
    expect(html).toContain('id="resume"');
  });

  test('Japanese hero localizes recruiter proof and review-pack actions', () => {
    const html = buildJapaneseTemplate();

    expect(html).toContain('<p class="hero-availability">採用提案・面接相談を歓迎</p>');
    expect(html).toContain('<ul class="hero-proof-list" aria-label="代表的な業務証跡">');
    expect(html).toContain('Nextrade売買締結システムのセキュリティ構築・運用を継続担当');
    expect(html).toContain('FortiGate HA 5層ネットワーク分離、FSC本認可審査対応');
    expect(html).toContain('Splunk ES · n8n · FortiManager APIベースのセキュリティイベント自動化');
    expect(extractHeroActions(html)).toEqual([
      expect.objectContaining({ href: expect.stringMatching(/^mailto:/), label: '採用問い合わせ' }),
      { href: '#resume', label: '採用検討資料' },
      { href: '#projects', label: '証跡プロジェクトを見る' },
      expect.objectContaining({ href: '/resume.pdf', label: '履歴書PDF' }),
    ]);

    const heroBlock = html.slice(html.indexOf('<section id="hero"'), html.indexOf('</section>', html.indexOf('<section id="hero"')));
    expect(heroBlock).not.toMatch(/[\uac00-\ud7a3]{2,}/);
  });
});
