const { test, expect } = require('@playwright/test');
const { waitForPortfolioReady } = require('./fixtures/portfolio-qa');

const SECTIONS = [
  'hero',
  'projects',
  'skills',
  'resume',
  'operated',
  'about',
  'cover-letter',
  'certifications',
  'contact',
];
const PROJECTS = [
  'project-safetywallet-cf-workers-pwa',
  'project-resume-portfolio',
  'project-ip-blacklist-platform',
];
const CAPABILITIES = [
  ['product-ui', 'safetywallet-cf-workers-pwa,resume-portfolio'],
  ['backend-api', 'safetywallet-cf-workers-pwa,ip-blacklist-platform,jclee-bot-github-app'],
  [
    'data-workflows',
    'safetywallet-cf-workers-pwa,ip-blacklist-platform,content-automation-pipeline',
  ],
  ['delivery-operations', 'resume-portfolio,terraform-homelab-iac,observability-platform'],
  [
    'security-reliability',
    'safetywallet-cf-workers-pwa,security-alert-system,firewall-policy-automation',
  ],
];
const KO = {
  primary: '풀스택 엔지니어',
  supporting: '보안 자동화 · 엣지 인프라',
  proposition: '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다.',
  ctas: ['대표 프로젝트 보기', '이력서 PDF'],
  labels: ['제품 UI', '백엔드·API', '데이터·워크플로', '배포·운영', '보안·신뢰성'],
};
const LOCALES = [
  ['root', '/', KO],
  ['ko', '/ko/', KO],
  [
    'en',
    '/en/',
    {
      primary: 'Full-Stack Engineer',
      supporting: 'Security Automation & Edge Infrastructure',
      proposition:
        'I design and operate products end to end, from user interfaces and APIs to data flows, deployment, and observability.',
      ctas: ['View featured builds', 'Resume PDF'],
      labels: [
        'Product UI',
        'Backend & API',
        'Data & Workflows',
        'Delivery & Operations',
        'Security & Reliability',
      ],
    },
  ],
  [
    'ja',
    '/ja/',
    {
      primary: 'フルスタックエンジニア',
      supporting: 'セキュリティ自動化・エッジインフラ',
      proposition:
        'ユーザー画面からAPI、データフロー、デプロイ、可観測性まで、プロダクトを一貫して設計・運用します。',
      ctas: ['注目プロジェクトを見る', '履歴書PDF'],
      labels: [
        'プロダクトUI',
        'バックエンド・API',
        'データ・ワークフロー',
        'デリバリー・運用',
        'セキュリティ・信頼性',
      ],
    },
  ],
];
const OLD_ROLE =
  '<html data-portfolio-ready="true"><body><main><section id="hero"><p class="hero-role">Security Automation Engineer</p></section></main></body></html>';

async function open(page, pathname) {
  if (process.env.REBRAND_CONTRACT_FIXTURE === 'old-role') {
    await page.route('**/*', (route) =>
      route.request().resourceType() === 'document'
        ? route.fulfill({ status: 200, contentType: 'text/html', body: OLD_ROLE })
        : route.continue()
    );
  }
  const response = await page.goto(pathname, { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await waitForPortfolioReady(page);
}

test.describe('full-stack rebrand content contract', () => {
  for (const [id, pathname, expected] of LOCALES) {
    test(`${id} exposes exact hero, IA, projects, and capability mapping`, async ({ page }) => {
      await open(page, pathname);
      await expect(page.locator('.hero-role')).toHaveText(expected.primary);
      await expect(page.locator('.hero-tagline')).toHaveText(expected.supporting);
      await expect(page.locator('.hero-positioning')).toHaveText(expected.proposition);
      const ctas = page.locator('#hero .hero-cta a');
      expect(
        await ctas.evaluateAll((links) =>
          links.map(
            (link) => link.getAttribute('aria-label') || link.textContent.replace(/\u2060/g, '')
          )
        )
      ).toEqual(expected.ctas);
      expect(
        await ctas.evaluateAll((links) => links.map((link) => link.getAttribute('href')))
      ).toEqual(['#projects', '/resume.pdf']);
      expect(
        await page
          .locator('main > section[id]')
          .evaluateAll((nodes) => nodes.map((node) => node.id))
      ).toEqual(SECTIONS);
      expect(
        (
          await page
            .locator('#projects li.project-item')
            .evaluateAll((nodes) => nodes.map((node) => node.id))
        ).slice(0, 3)
      ).toEqual(PROJECTS);
      const controls = page.locator('[data-capability-control]');
      await expect(controls).toHaveText(expected.labels);
      expect(
        await controls.evaluateAll((nodes) => nodes.map((node) => node.dataset.capabilityControl))
      ).toEqual(CAPABILITIES.map(([capability]) => capability));
      for (const [capability, ids] of CAPABILITIES) {
        const actual = await page
          .locator(`#projects li.project-item[data-capabilities~="${capability}"]`)
          .evaluateAll((nodes) => nodes.map((node) => node.id.replace(/^project-/, '')).sort());
        expect(actual).toEqual(ids.split(',').sort());
      }
    });
  }
});
