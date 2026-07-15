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

  test('localized hero content leads with full-stack identity and featured project proof', () => {
    expect(
      Object.fromEntries(
        Object.entries(HERO_CONTENT).map(([locale, content]) => [locale, content.primaryTitle])
      )
    ).toEqual({
      ko: '풀스택 엔지니어',
      en: 'Full-Stack Engineer',
      ja: 'フルスタックエンジニア',
    });

    for (const locale of Object.keys(HERO_CONTENT)) {
      const html = buildHeroContent(locale);
      expect(html).toContain('#project-safetywallet-cf-workers-pwa');
      expect(html).toContain('#project-resume-portfolio');
      expect(html).toContain('#project-ip-blacklist-platform');
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

  test('hero exposes only the approved project proof links', () => {
    const combinedHero = ['ko', 'en', 'ja'].map((locale) => buildHeroContent(locale)).join('\n');

    expect(combinedHero).toContain('SafetyWallet');
    expect(combinedHero).toContain('Resume Portfolio');
    expect(combinedHero).toContain('IP Blacklist');
    expect(combinedHero).not.toMatch(/jclee-bot|Grafana|ELK/);
  });

  test('hero no longer renders recruiter role chips', () => {
    for (const locale of ['ko', 'en', 'ja']) {
      const html = buildHeroContent(locale);
      expect(html).not.toMatch(/role-chip|role-quick-paths/);
    }
  });
});
