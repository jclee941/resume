const fs = require('fs');
const path = require('path');

const { buildJapaneseTemplate } = require('../../../apps/portfolio/lib/html-transformer');

const ROOT = path.resolve(__dirname, '../../..');
const PORTFOLIO = path.join(ROOT, 'apps/portfolio');
const read = (file) => fs.readFileSync(path.join(PORTFOLIO, file), 'utf8');

const KNOWS_ABOUT = [
  'Full-Stack Engineering',
  'TypeScript',
  'JavaScript',
  'Next.js',
  'Cloudflare Workers',
  'Backend APIs',
  'PostgreSQL',
  'Data Workflows',
  'Security Automation',
  'Edge Infrastructure',
  'Observability',
  'DevOps',
];

const LOCALES = {
  ko: {
    html: () => read('index.html'),
    title: '이재철 | 풀스택 엔지니어',
    description:
      '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다.',
    jobTitle: '풀스택 엔지니어',
    availability: '풀스택 · 백엔드 · 플랫폼 엔지니어 포지션의 제안과 면접을 검토합니다.',
    canonical: 'https://resume.jclee.me/',
  },
  en: {
    html: () => read('index-en.html'),
    title: 'Jaecheol Lee | Full-Stack Engineer',
    description:
      "Jaecheol Lee's full-stack engineering portfolio, covering user interfaces, APIs, data flows, deployment, and observability with depth in security automation and edge infrastructure.",
    jobTitle: 'Full-Stack Engineer',
    availability: 'Open to full-stack, backend, and platform engineering opportunities.',
    canonical: 'https://resume.jclee.me/en/',
  },
  ja: {
    html: () => buildJapaneseTemplate(read('index.html')),
    title: '李在哲 | フルスタックエンジニア',
    description:
      'ユーザー画面、API、データフロー、デプロイ、可観測性まで扱う李在哲のフルスタックポートフォリオ。セキュリティ自動化とエッジインフラの経験を信頼性につなげます。',
    jobTitle: 'フルスタックエンジニア',
    availability:
      'フルスタック・バックエンド・プラットフォームエンジニアのご提案を検討しています。',
    canonical: 'https://resume.jclee.me/ja/',
  },
};

function tag(html, pattern) {
  return html.match(pattern)?.[1] || '';
}

function meta(html, key, value) {
  const element =
    html.match(new RegExp(`<meta\\s+${key}="${value}"[\\s\\S]*?\\/>`, 'i'))?.[0] || '';
  return tag(element, /content="([^"]+)"/i);
}

function schema(html, type) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, json]) => JSON.parse(json))
    .find((item) => item['@type'] === type);
}

function assertLocale(html, expected) {
  if (tag(html, /<title>([^<]+)<\/title>/i) !== expected.title) throw new Error('title');
  if (meta(html, 'name', 'description') !== expected.description) throw new Error('description');
  if (meta(html, 'property', 'og:title') !== expected.title) throw new Error('og:title');
  if (meta(html, 'property', 'og:description') !== expected.description)
    throw new Error('og:description');
  if (meta(html, 'name', 'twitter:title') !== expected.title) throw new Error('twitter:title');
  if (meta(html, 'name', 'twitter:description') !== expected.description)
    throw new Error('twitter:description');
  if (tag(html, /<link rel="canonical" href="([^"]+)" \/>/i) !== expected.canonical)
    throw new Error('canonical');
  for (const language of ['ko-KR', 'en-US', 'ja-JP', 'x-default']) {
    if (!html.includes(`hreflang="${language}"`)) throw new Error(`hreflang:${language}`);
  }
  const person = schema(html, 'Person');
  if (person.jobTitle !== expected.jobTitle) throw new Error('jobTitle');
  if (person.seeks.name !== expected.availability) throw new Error('seeks');
  if (JSON.stringify(person.knowsAbout) !== JSON.stringify(KNOWS_ABOUT))
    throw new Error('knowsAbout');
  const website = schema(html, 'WebSite');
  if (website.name !== expected.title || website.description !== expected.description)
    throw new Error('website');
  if (/Security Automation \/ Infrastructure Engineer|8 years|8년차|8年目/.test(html))
    throw new Error('stale identity');
}

describe('full-stack metadata contract', () => {
  test.each(Object.entries(LOCALES))(
    '%s metadata is exact and locale-complete',
    (_locale, data) => {
      assertLocale(data.html(), data);
    }
  );

  test('manifests use exact public titles and descriptions', () => {
    const ko = JSON.parse(read('manifest.json'));
    const en = JSON.parse(read('manifest_en.json'));
    expect({ name: ko.name, description: ko.description }).toEqual({
      name: LOCALES.ko.title,
      description: LOCALES.ko.description,
    });
    expect({ name: en.name, description: en.description }).toEqual({
      name: LOCALES.en.title,
      description: LOCALES.en.description,
    });
  });

  test('OG source contains only locale name, primary title, and supporting line copy', () => {
    const source = read('generate-og-image.js');
    for (const value of [
      '이재철',
      '풀스택 엔지니어',
      '보안 자동화 · 엣지 인프라',
      'Jaecheol Lee',
      'Full-Stack Engineer',
      'Security Automation & Edge Infrastructure',
      '李在哲',
      'フルスタックエンジニア',
      'セキュリティ自動化・エッジインフラ',
    ])
      expect(source).toContain(value);
    expect(source).not.toMatch(/stats|8 years|8년차|8年目|Financial Security Infrastructure/);
  });

  test('mutation fixtures reject JA jobTitle, missing hreflang, old title, and tenure metrics', () => {
    const html = LOCALES.ja.html();
    const mutations = [
      html.replace(LOCALES.ja.jobTitle, 'Backend Engineer'),
      html.replace(/<link rel="alternate" hreflang="en-US"[^>]+>\s*/i, ''),
      html.replace(LOCALES.ja.title, '李在哲 | Security Automation Engineer'),
      `${html}<span>8 years</span>`,
    ];
    for (const mutated of mutations) expect(() => assertLocale(mutated, LOCALES.ja)).toThrow();
  });
});
