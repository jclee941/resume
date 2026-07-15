const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const { buildHeroContent } = require('../../apps/portfolio/lib/hero-content');

const PORTFOLIO_DIR = path.join(__dirname, '../../apps/portfolio');
const PROOF_LINKS = [
  ['#project-safetywallet-cf-workers-pwa', 'SafetyWallet'],
  ['#project-resume-portfolio', 'Resume Portfolio'],
  ['#project-ip-blacklist-platform', 'IP Blacklist'],
];

const LOCALE_COPY = {
  ko: [
    '풀스택 엔지니어',
    '보안 자동화 · 엣지 인프라',
    '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다.',
    '풀스택 · 백엔드 · 플랫폼 엔지니어 포지션의 제안과 면접을 검토합니다.',
    '대표 프로젝트 보기',
    '이력서 PDF',
  ],
  en: [
    'Full-Stack Engineer',
    'Security Automation & Edge Infrastructure',
    'I design and operate products end to end, from user interfaces and APIs to data flows, deployment, and observability.',
    'Open to full-stack, backend, and platform engineering opportunities.',
    'View featured builds',
    'Resume PDF',
  ],
  ja: [
    'フルスタックエンジニア',
    'セキュリティ自動化・エッジインフラ',
    'ユーザー画面からAPI、データフロー、デプロイ、可観測性まで、プロダクトを一貫して設計・運用します。',
    'フルスタック・バックエンド・プラットフォームエンジニアのご提案を検討しています。',
    '注目プロジェクトを見る',
    '履歴書PDF',
  ],
};

function extractLinks(html) {
  return [...html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(
    ([, href, label]) => [href, label.replaceAll('\u2060', '')]
  );
}

describe('portfolio full-stack hero copy', () => {
  for (const [locale, copy] of Object.entries(LOCALE_COPY)) {
    test(`${locale} hero uses the approved compact positioning`, () => {
      const html = buildHeroContent(locale);
      const visibleHtml = html.replaceAll('&amp;', '&');

      for (const value of copy) expect(visibleHtml).toContain(value);
      expect(extractLinks(html)).toEqual([
        ['#projects', copy[4]],
        ['/resume.pdf', copy[5]],
        ...PROOF_LINKS,
      ]);
    });
  }

  test('source templates retain the generated hero placeholder', () => {
    for (const fileName of ['index.html', 'index-en.html']) {
      expect(fs.readFileSync(path.join(PORTFOLIO_DIR, fileName), 'utf8')).toContain(
        '<!-- HERO_CONTENT_PLACEHOLDER -->'
      );
    }
  });

  test('compact hero omits recruiter packet and old role blocks', () => {
    const html = Object.keys(LOCALE_COPY).map(buildHeroContent).join('\n');

    expect(html).not.toContain('Security Automation / Infrastructure Engineer');
    expect(html).not.toMatch(/hero-proof-list|hero-review-path|hiring-review-packet|role-quick-paths/);
    expect(html).not.toContain('보안 자동화 역할 판단');
  });

  test('client role evidence labels avoid stale operations copy', () => {
    const moduleUrl = pathToFileURL(
      path.join(PORTFOLIO_DIR, 'src/scripts/modules/recruiter-enhancements-data.js')
    ).href;
    const script = `
      const module = await import(${JSON.stringify(moduleUrl)});
      process.stdout.write(JSON.stringify(module.ROLE_PROFILES));
    `;
    const roleProfiles = JSON.parse(
      execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', script], {
        encoding: 'utf8',
      })
    );
    const roleCopy = roleProfiles.flatMap((role) => [role.label, ...Object.values(role.proof || {})]);

    expect(roleCopy).toContain('Automation');
    expect(roleCopy).not.toContain('Automation Workflow');
    expect(roleCopy.join('\n')).not.toMatch(/Security Ops|Ops Visibility/);
  });
});
