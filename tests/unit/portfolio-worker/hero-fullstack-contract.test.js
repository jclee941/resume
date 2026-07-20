const { HERO_CONTENT } = require('../../../apps/portfolio/lib/hero-content-data');
const { buildHeroContent } = require('../../../apps/portfolio/lib/hero-content');

const HERO_COPY = {
  ko: {
    name: '이재철',
    primaryTitle: '풀스택 엔지니어',
    supportingLine: '보안 자동화 · 엣지 인프라',
    proposition: '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다.',
    availability: '풀스택·백엔드·플랫폼 엔지니어 기회를 검토합니다.',
    ctas: ['대표 프로젝트 보기', '이력서 PDF'],
  },
  en: {
    name: 'Jaecheol Lee',
    primaryTitle: 'Full-Stack Engineer',
    supportingLine: 'Security Automation & Edge Infrastructure',
    proposition:
      'I design and operate products end to end, from user interfaces and APIs to data flows, deployment, and observability.',
    availability: 'Open to full-stack, backend, and platform engineering opportunities.',
    ctas: ['View featured builds', 'Resume PDF'],
  },
  ja: {
    name: '李在哲',
    primaryTitle: 'フルスタックエンジニア',
    supportingLine: 'セキュリティ自動化・エッジインフラ',
    proposition: 'ユーザー画面、API、データ、デプロイ、可観測性を一貫して設計・運用します。',
    availability:
      'フルスタック・バックエンド・プラットフォーム領域のご提案と面談依頼を検討しています。',
    ctas: ['注目プロジェクトを見る', '履歴書PDF'],
  },
};

const PROOF_LINKS = [
  ['#project-safetywallet-cf-workers-pwa', 'SafetyWallet'],
  ['#project-resume-portfolio', 'Resume Portfolio'],
  ['#project-ip-blacklist-platform', 'IP Blacklist'],
];

const OLD_PACKET_MARKERS = [
  'Security Automation / Infrastructure Engineer',
  'hiring-review-packet',
  'hero-review-path',
  'hero-proof-list',
  'role-quick-paths',
  '보안 자동화 역할 판단',
];

function heroLinks(html) {
  return [...html.matchAll(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, href, label]) => [href, label.replace(/<[^>]+>/g, '').replaceAll('\u2060', '').trim()]
  );
}

function contractViolations(locale, content, html) {
  const expected = HERO_COPY[locale];
  const visibleHtml = html.replaceAll('&amp;', '&');
  const expectedKeys = [
    'name',
    'primaryTitle',
    'supportingLine',
    'availability',
    'proposition',
    'primaryCta',
    'secondaryCta',
    'proofLinks',
  ];
  const violations = [];

  if (JSON.stringify(Object.keys(content)) !== JSON.stringify(expectedKeys)) violations.push('shape');
  for (const key of ['name', 'primaryTitle', 'supportingLine', 'availability', 'proposition']) {
    if (content[key] !== expected[key] || !visibleHtml.includes(expected[key])) violations.push(key);
  }
  if (JSON.stringify(heroLinks(html)) !== JSON.stringify([
    ['#projects', expected.ctas[0]],
    ['/resume.pdf', expected.ctas[1]],
    ...PROOF_LINKS,
  ])) violations.push('links');
  if (OLD_PACKET_MARKERS.some((marker) => html.includes(marker))) violations.push('old-packet');
  return violations;
}

describe('compact multilingual full-stack hero contract', () => {
  for (const locale of Object.keys(HERO_COPY)) {
    test(`${locale} uses exact copy, compact data, two CTAs, and three project proofs`, () => {
      expect(contractViolations(locale, HERO_CONTENT[locale], buildHeroContent(locale))).toEqual([]);
    });
  }

  test('Japanese primary CTA encodes an unbroken display label with exact accessible copy', () => {
    const html = buildHeroContent('ja');
    const link = html.match(/<a\s+[^>]*href="#projects"[^>]*>([^<]+)<\/a>/);

    expect(link).not.toBeNull();
    expect(link[0]).toContain('aria-label="注目プロジェクトを見る"');
    expect(link[1]).toBe('注\u2060目\u2060プ\u2060ロ\u2060ジ\u2060ェ\u2060ク\u2060ト\u2060を\u2060見\u2060る');
    expect(link[1].replaceAll('\u2060', '')).toBe(HERO_COPY.ja.ctas[0]);
  });

  test.each([
    ['old role', (html) => html.replace('Full-Stack Engineer', 'Security Automation / Infrastructure Engineer')],
    ['third CTA', (html) => html.replace('</div>', '<a href="#contact">Contact</a></div>')],
    ['missing proof anchor', (html) => html.replace('#project-ip-blacklist-platform', '#missing-project')],
    ['wrong locale', (html) => html.replace('Full-Stack Engineer', '풀스택 엔지니어')],
  ])('rejects %s fixture', (_label, mutate) => {
    expect(contractViolations('en', HERO_CONTENT.en, mutate(buildHeroContent('en')))).not.toEqual([]);
  });
});
