const { execFileSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { waitForPortfolioReady } = require('./fixtures/portfolio-qa');

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
const KO = {
  title: '이재철 | 풀스택 엔지니어',
  jobTitle: '풀스택 엔지니어',
  description:
    '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다.',
  keywords:
    '이재철, Jaecheol Lee, 풀스택 엔지니어, Full-Stack Engineering, TypeScript, JavaScript, Next.js, Cloudflare Workers, Backend APIs, PostgreSQL, Data Workflows, Security Automation, Edge Infrastructure, Observability, DevOps',
  availability: '풀스택 · 백엔드 · 플랫폼 엔지니어 포지션의 제안과 면접을 검토합니다.',
  publicUrl: 'https://resume.jclee.me/',
  language: 'ko-KR',
  manifest: '/manifest.json',
  og: '/og-image.webp',
};
const LOCALES = [
  ['root', '/', KO],
  ['ko', '/ko/', KO],
  [
    'en',
    '/en/',
    {
      title: 'Jaecheol Lee | Full-Stack Engineer',
      jobTitle: 'Full-Stack Engineer',
      description:
        "Jaecheol Lee's full-stack engineering portfolio, covering user interfaces, APIs, data flows, deployment, and observability with depth in security automation and edge infrastructure.",
      keywords:
        'Jaecheol Lee, Full-Stack Engineer, Full-Stack Engineering, TypeScript, JavaScript, Next.js, Cloudflare Workers, Backend APIs, PostgreSQL, Data Workflows, Security Automation, Edge Infrastructure, Observability, DevOps',
      availability: 'Open to full-stack, backend, and platform engineering opportunities.',
      publicUrl: 'https://resume.jclee.me/en/',
      language: 'en-US',
      manifest: '/manifest_en.json',
      og: '/og-image-en.webp',
    },
  ],
  [
    'ja',
    '/ja/',
    {
      title: '李在哲 | フルスタックエンジニア',
      jobTitle: 'フルスタックエンジニア',
      description:
        'ユーザー画面、API、データフロー、デプロイ、可観測性まで扱う李在哲のフルスタックポートフォリオ。セキュリティ自動化とエッジインフラの経験を信頼性につなげます。',
      keywords:
        '李在哲, Jaecheol Lee, フルスタックエンジニア, Full-Stack Engineering, TypeScript, JavaScript, Next.js, Cloudflare Workers, Backend APIs, PostgreSQL, Data Workflows, Security Automation, Edge Infrastructure, Observability, DevOps',
      availability:
        'フルスタック・バックエンド・プラットフォームエンジニアのご提案を検討しています。',
      publicUrl: 'https://resume.jclee.me/ja/',
      language: 'ja-JP',
      manifest: '/manifest.json',
      og: '/og-image-ja.webp',
    },
  ],
];
const expectedSha =
  process.env.REBRAND_EXPECTED_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
  throw new Error('REBRAND_EXPECTED_SHA must be a canonical lowercase 40-hex commit SHA');
}

async function open(page, pathname) {
  const response = await page.goto(pathname, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await waitForPortfolioReady(page);
}

test.describe('full-stack rebrand artifact contract', () => {
  for (const [id, pathname, expected] of LOCALES) {
    test(`${id} exposes exact metadata, Twitter, keywords, JSON-LD, manifest, and OG`, async ({
      page,
      request,
    }) => {
      await open(page, pathname);
      await expect(page).toHaveTitle(expected.title);
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]) {
        await expect(page.locator(selector)).toHaveAttribute('content', expected.description);
      }
      await expect(page.locator('meta[name="keywords"]')).toHaveAttribute(
        'content',
        expected.keywords
      );
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        await expect(page.locator(selector)).toHaveAttribute('content', expected.title);
      }
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image'
      );
      await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute(
        'content',
        expected.publicUrl
      );
      for (const name of ['creator', 'site']) {
        await expect(page.locator(`meta[name="twitter:${name}"]`)).toHaveAttribute(
          'content',
          '@jclee941'
        );
      }
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', expected.manifest);
      const schemas = await page
        .locator('script[type="application/ld+json"]')
        .evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent)));
      const person = schemas.find((schema) => schema['@type'] === 'Person');
      const website = schemas.find((schema) => schema['@type'] === 'WebSite');
      expect({
        jobTitle: person.jobTitle,
        knowsAbout: person.knowsAbout,
        seeks: person.seeks.name,
      }).toEqual({
        jobTitle: expected.jobTitle,
        knowsAbout: KNOWS_ABOUT,
        seeks: expected.availability,
      });
      expect({
        name: website.name,
        description: website.description,
        url: website.url,
        language: website.inLanguage,
      }).toEqual({
        name: expected.title,
        description: expected.description,
        url: expected.publicUrl,
        language: expected.language,
      });
      const twitterImage = new URL(
        await page.locator('meta[name="twitter:image"]').getAttribute('content')
      );
      expect(twitterImage.pathname).toBe(expected.og);
      const image = await request.get(expected.og);
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toMatch(/^image\/webp/);
      expect((await image.body()).byteLength).toBeGreaterThan(10_000);
    });
  }

  test('approved manifests retain exact identities', async ({ request }) => {
    for (const expected of [KO, LOCALES[2][2]]) {
      const response = await request.get(expected.manifest);
      expect(response.status()).toBe(200);
      const manifest = await response.json();
      expect({ name: manifest.name, description: manifest.description }).toEqual({
        name: expected.title,
        description: expected.description,
      });
    }
  });

  test('public PDF carries the complete approved heading, summary, and capability line', async ({
    request,
  }) => {
    const response = await request.get('/resume.pdf');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^application\/pdf/);
    const body = await response.body();
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    const text = execFileSync('pdftotext', ['-', '-'], { input: body, encoding: 'utf8' })
      .replace(/\s*[・·]\s*/g, '·')
      .replace(/\s+([을를이가은는과와의에])(?=\s|[,.])/g, '$1')
      .replace(/\s+/g, ' ');
    expect(text).toContain('이재철 풀스택 엔지니어');
    expect(text).toContain(
      '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다. 개인 프로젝트에서는 TypeScript·Cloudflare Workers·Python·PostgreSQL을 연결해 제품을 엔드투엔드로 구축했고, 실무에서는 금융권 보안 인프라와 자동화·관측성을 담당했습니다. 풀스택·백엔드·플랫폼 엔지니어 포지션을 검토합니다.'
    );
    expect(text).toContain(
      '핵심 역량: 제품 UI·PWA·백엔드·API·PostgreSQL·D1 데이터 모델·비동기 워크플로·엣지 배포·관측성·보안·신뢰성'
    );
  });

  test('health endpoint reports the exact expected build SHA', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    expect((await response.json()).git_sha).toBe(expectedSha);
  });
});
