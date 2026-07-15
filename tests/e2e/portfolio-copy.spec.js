const { test, expect } = require('@playwright/test');

const LOCALES = [
  {
    path: '/',
    primaryTitle: '풀스택 엔지니어',
    supportingLine: '보안 자동화 · 엣지 인프라',
    proposition: '사용자 화면부터 API, 데이터 흐름, 배포와 관측성까지 직접 설계하고 운영합니다.',
    availability: '풀스택 · 백엔드 · 플랫폼 엔지니어 포지션의 제안과 면접을 검토합니다.',
    ctas: ['대표 프로젝트 보기', '이력서 PDF'],
  },
  {
    path: '/en/',
    primaryTitle: 'Full-Stack Engineer',
    supportingLine: 'Security Automation & Edge Infrastructure',
    proposition:
      'I design and operate products end to end, from user interfaces and APIs to data flows, deployment, and observability.',
    availability: 'Open to full-stack, backend, and platform engineering opportunities.',
    ctas: ['View featured builds', 'Resume PDF'],
  },
  {
    path: '/ja/',
    primaryTitle: 'フルスタックエンジニア',
    supportingLine: 'セキュリティ自動化・エッジインフラ',
    proposition:
      'ユーザー画面からAPI、データフロー、デプロイ、可観測性まで、プロダクトを一貫して設計・運用します。',
    availability:
      'フルスタック・バックエンド・プラットフォームエンジニアのご提案を検討しています。',
    ctas: ['注目プロジェクトを見る', '履歴書PDF'],
  },
];

const PROOFS = [
  ['SafetyWallet', '#project-safetywallet-cf-workers-pwa'],
  ['Resume Portfolio', '#project-resume-portfolio'],
  ['IP Blacklist', '#project-ip-blacklist-platform'],
];

test.describe('Portfolio full-stack hero copy', () => {
  for (const locale of LOCALES) {
    test(`${locale.path} exposes the exact compact positioning and links`, async ({ page }) => {
      await page.goto(locale.path, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('#hero');

      await expect(hero.locator('.hero-role')).toHaveText(locale.primaryTitle);
      await expect(hero.locator('.hero-tagline')).toHaveText(locale.supportingLine);
      await expect(hero.locator('.hero-positioning')).toHaveText(locale.proposition);
      await expect(hero.locator('.hero-availability')).toHaveText(locale.availability);
      await expect(hero.locator('.hero-cta a')).toHaveCount(2);
      const primaryCta = hero.locator('.hero-cta a').nth(0);
      await expect(primaryCta).toHaveAttribute('href', '#projects');
      await expect(primaryCta).toHaveAccessibleName(locale.ctas[0]);
      expect((await primaryCta.textContent()).replaceAll('\u2060', '')).toBe(locale.ctas[0]);
      await expect(hero.locator('.hero-cta a').nth(1)).toHaveAttribute('href', '/resume.pdf');
      await expect(hero.locator('.hero-cta a').nth(1)).toHaveText(locale.ctas[1]);

      for (const [label, href] of PROOFS) {
        await expect(hero.getByRole('link', { name: label, exact: true })).toHaveAttribute(
          'href',
          href
        );
      }
      await expect(
        hero.locator(
          '.hero-proof-list, .hero-review-path, .hiring-review-packet, .role-quick-paths'
        )
      ).toHaveCount(0);
      await expect(hero).not.toContainText('Security Automation / Infrastructure Engineer');
    });
  }

  test('375px proof links preserve a 44px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const proofTargets = await page.locator('#hero .hero-public-proof a').evaluateAll((links) =>
      links.map((link) => ({
        height: link.getBoundingClientRect().height,
        minHeight: Number.parseFloat(getComputedStyle(link).minHeight),
      }))
    );

    expect(proofTargets).toHaveLength(3);
    for (const target of proofTargets) {
      expect(target.minHeight).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('1280px supporting line follows the primary title in the main hierarchy', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hierarchy = await page.evaluate(() => {
      const primaryTitle = document.querySelector('#hero .hero-role').getBoundingClientRect();
      const supportingLine = document.querySelector('#hero .hero-tagline').getBoundingClientRect();
      return {
        primaryTitle: { left: primaryTitle.left, right: primaryTitle.right, bottom: primaryTitle.bottom },
        supportingLine: {
          left: supportingLine.left,
          right: supportingLine.right,
          top: supportingLine.top,
        },
      };
    });

    expect(hierarchy.supportingLine.left).toBe(hierarchy.primaryTitle.left);
    expect(hierarchy.supportingLine.right).toBe(hierarchy.primaryTitle.right);
    expect(hierarchy.supportingLine.top).toBeGreaterThanOrEqual(hierarchy.primaryTitle.bottom);
  });
});
