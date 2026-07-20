const { test, expect } = require('@playwright/test');

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

const LOCALES = [
  {
    path: '/',
    title: '이재철 | 풀스택 엔지니어',
    description:
      '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다.',
    jobTitle: '풀스택 엔지니어',
    availability: '풀스택·백엔드·플랫폼 엔지니어 기회를 검토합니다.',
  },
  {
    path: '/ko/',
    title: '이재철 | 풀스택 엔지니어',
    description:
      '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 설계·운영하는 이재철의 풀스택 포트폴리오. 보안 자동화와 엣지 인프라 경험을 제품 전반의 신뢰성으로 연결합니다.',
    jobTitle: '풀스택 엔지니어',
    availability: '풀스택·백엔드·플랫폼 엔지니어 기회를 검토합니다.',
  },
  {
    path: '/en/',
    title: 'Jaecheol Lee | Full-Stack Engineer',
    description:
      "Jaecheol Lee's full-stack engineering portfolio, covering user interfaces, APIs, data flows, deployment, and observability with depth in security automation and edge infrastructure.",
    jobTitle: 'Full-Stack Engineer',
    availability: 'Open to full-stack, backend, and platform engineering opportunities.',
  },
  {
    path: '/ja/',
    title: '李在哲 | フルスタックエンジニア',
    description:
      'ユーザー画面、API、データフロー、デプロイ、可観測性まで扱う李在哲のフルスタックポートフォリオ。セキュリティ自動化とエッジインフラの経験を信頼性につなげます。',
    jobTitle: 'フルスタックエンジニア',
    availability:
      'フルスタック・バックエンド・プラットフォーム領域のご提案と面談依頼を検討しています。',
  },
];

test.describe('full-stack public metadata', () => {
  for (const expected of LOCALES) {
    test(`${expected.path} exposes one exact identity`, async ({ page }) => {
      await page.goto(expected.path, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(expected.title);
      for (const selector of [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ])
        await expect(page.locator(selector)).toHaveAttribute('content', expected.description);
      for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
        await expect(page.locator(selector)).toHaveAttribute('content', expected.title);
      }

      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      const objects = schemas.map((content) => JSON.parse(content));
      const person = objects.find((item) => item['@type'] === 'Person');
      const website = objects.find((item) => item['@type'] === 'WebSite');
      expect(person.jobTitle).toBe(expected.jobTitle);
      expect(person.seeks.name).toBe(expected.availability);
      expect(person.knowsAbout).toEqual(KNOWS_ABOUT);
      expect({ name: website.name, description: website.description }).toEqual({
        name: expected.title,
        description: expected.description,
      });
      expect((await page.locator('head').innerText()).includes('8 years')).toBe(false);
    });
  }

  test('locale manifests expose the approved public identity', async ({ request }) => {
    for (const expected of [LOCALES[0], LOCALES[2]]) {
      const path = expected.path === '/' ? '/manifest.json' : '/manifest_en.json';
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      const manifest = await response.json();
      expect({ name: manifest.name, description: manifest.description }).toEqual({
        name: expected.title,
        description: expected.description,
      });
    }
  });
});
