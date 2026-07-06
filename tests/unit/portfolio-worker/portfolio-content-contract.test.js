const fs = require('fs');
const path = require('path');

const { buildHeroContent } = require('../../../apps/portfolio/lib/hero-content');
const { HERO_CONTENT } = require('../../../apps/portfolio/lib/hero-content-data');

const PORTFOLIO_DIR = path.resolve(__dirname, '../../../apps/portfolio');
const TARGET_ROLE = 'Security Automation / Infrastructure Engineer';

function readPortfolioFile(fileName) {
  return fs.readFileSync(path.join(PORTFOLIO_DIR, fileName), 'utf8');
}

function extractTagContent(html, tagPattern) {
  const match = html.match(tagPattern);
  return match ? match[1] : '';
}

function extractMetaContent(html, propertyName, propertyValue) {
  const tagMatch = html.match(
    new RegExp(`<meta\\s+${propertyName}="${propertyValue}"[\\s\\S]*?>`, 'i')
  );
  if (!tagMatch) return '';
  return extractTagContent(tagMatch[0], /content="([^"]+)"/i);
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function visibleText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('portfolio first-screen hiring decision contract', () => {
  test('KO and EN metadata names the security automation/infrastructure role', () => {
    for (const fileName of ['index.html', 'index-en.html']) {
      const html = readPortfolioFile(fileName);
      const title = extractTagContent(html, /<title>([^<]+)<\/title>/i);
      const ogTitle = extractMetaContent(html, 'property', 'og:title');
      const twitterTitle = extractMetaContent(html, 'name', 'twitter:title');
      const personJobTitle = extractTagContent(html, /"jobTitle": "([^"]+)"/i);
      const namedStructuredData = Array.from(html.matchAll(/"name": "([^"]+)"/g)).map(
        ([, name]) => name
      );

      for (const metadataValue of [title, ogTitle, twitterTitle, personJobTitle]) {
        expect(metadataValue).toContain(TARGET_ROLE);
      }
      expect(namedStructuredData).toEqual(
        expect.arrayContaining([expect.stringContaining(TARGET_ROLE)])
      );
    }
  });

  test('localized hero content frames a hiring decision through public evidence and contact/PDF', () => {
    expect(
      Object.fromEntries(
        Object.entries(HERO_CONTENT).map(([locale, content]) => [locale, content.role])
      )
    ).toEqual({
      ko: TARGET_ROLE,
      en: TARGET_ROLE,
      ja: TARGET_ROLE,
    });

    const expectations = {
      ko: ['채용 판단', '공개 자동화 근거', '연락·PDF', '면접 제안'],
      en: [
        'hiring decision',
        'public automation evidence',
        'contact and resume PDF',
        'interview request',
      ],
      ja: ['採用判断', '公開自動化根拠', '連絡・履歴書PDF', '面接依頼'],
    };

    for (const [locale, requiredTerms] of Object.entries(expectations)) {
      const html = buildHeroContent(locale);

      for (const term of requiredTerms) {
        expect(html).toContain(term);
      }

      expect(html).toContain('jclee-bot');
      expect(html).toContain('Grafana');
      expect(html).toContain('ELK');
    }
  });

  test('first-screen labels and summaries avoid dominant review-workflow language', () => {
    const ko = visibleText(buildHeroContent('ko'));
    const en = visibleText(buildHeroContent('en'));
    const ja = visibleText(buildHeroContent('ja'));

    expect(countMatches(ko, /검토/g)).toBeLessThanOrEqual(1);
    expect(countMatches(en, /\breview path\b/gi)).toBe(0);
    expect(countMatches(en, /\breview\b/gi)).toBeLessThanOrEqual(1);
    expect(countMatches(ja, /レビュー/g)).toBe(0);
    expect(ja).not.toMatch(/\b(Security Ops|Security Infra|Ops Visibility|Ops Workflow)\b/);
  });

  test('public proof details explain why each artifact is useful to hiring leads', () => {
    const combinedHero = ['ko', 'en', 'ja'].map((locale) => buildHeroContent(locale)).join('\n');

    expect(combinedHero).toMatch(/PR (?:리뷰|review)|PR確認/);
    expect(combinedHero).toMatch(/시크릿 스캔|secrets scan|シークレットスキャン/);
    expect(combinedHero).toMatch(/Check Run|check runs|チェックラン/);
    expect(combinedHero).toMatch(/메트릭.*로그|metrics.*logs|メトリクス.*ログ/);
    expect(combinedHero).toMatch(/관측성|observability|可観測性/);
    expect(combinedHero).toMatch(
      /보안 이벤트 수집|security event collection|セキュリティイベント収集/
    );
    expect(combinedHero).toMatch(/분류|triage|トリアージ/);
    expect(combinedHero).toMatch(/추적|tracking|追跡/);
  });
});
