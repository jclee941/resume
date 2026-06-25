const { test, expect } = require('@playwright/test');

test.describe('Portfolio hiring copy', () => {
  test('should expose recruiter-ready proof and hiring actions above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expect(hero.getByText('보안 운영 · SRE · DevSecOps 검토 가능')).toBeVisible();
    await expect(
      hero.getByText('보안 인프라 경험을 실무 과제로 정리합니다.')
    ).toBeVisible();
    await expect(hero.getByText('채용 제안·면접 문의 환영')).toHaveCount(0);
    await expect(hero.getByText('거래소 보안 인프라 구축·운영')).toBeVisible();
    await expect(hero.getByRole('link', { name: '채용 논의' })).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=%EC%B1%84%EC%9A%A9%20%EC%A0%9C%EC%95%88%20%EB%98%90%EB%8A%94%20%EB%A9%B4%EC%A0%91%20%EB%AC%B8%EC%9D%98'
    );
    await expect(hero.getByRole('link', { name: '경력 근거' })).toHaveAttribute(
      'href',
      '#resume'
    );
    await expect(hero.getByRole('link', { name: '프로젝트 근거' })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(hero.getByText('증빙 프로젝트 보기')).toHaveCount(0);
  });

  test('should keep localized hiring copy aligned across English and Japanese pages', async ({
    page,
  }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const englishHero = page.locator('#hero');
    await expect(
      englishHero.getByText('Available for Security Ops, SRE, and DevSecOps review')
    ).toBeVisible();
    await expect(englishHero.getByRole('link', { name: 'Discuss a role' })).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=Hiring%20proposal%20or%20interview%20request'
    );
    await expect(englishHero.getByRole('link', { name: 'Review career evidence' })).toHaveAttribute(
      'href',
      '#resume'
    );
    await expect(
      englishHero.getByRole('link', { name: 'Review project evidence' })
    ).toHaveAttribute('href', '#projects');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expect(
      japaneseHero.getByText('セキュリティ運用・SRE・DevSecOpsを検討可能')
    ).toBeVisible();
    await expect(
      japaneseHero.getByText('セキュリティインフラの経験を実務課題として整理します。')
    ).toBeVisible();
    await expect(japaneseHero.getByRole('link', { name: '採用相談' })).toBeVisible();
    await expect(japaneseHero.getByRole('link', { name: 'プロジェクト根拠' })).toHaveAttribute(
      'href',
      '#projects'
    );
  });
});
