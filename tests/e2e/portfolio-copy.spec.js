const { test, expect } = require('@playwright/test');

test.describe('Portfolio hiring copy', () => {
  test('should expose recruiter-ready evidence and hiring actions above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expect(
      hero.getByText('보안 자동화 · 보안 인프라 역할의 면접 제안을 환영합니다')
    ).toBeVisible();
    await expect(
      hero.getByText(
        '채용 판단에 필요한 자동화 근거, 연락·PDF, 최근 보안 인프라 이력을 먼저 배치했습니다.'
      )
    ).toBeVisible();
    await expect(hero.getByText('보안 자동화 · 보안 인프라 · SIEM')).toBeVisible();
    await expect(hero.getByText('면접 제안 가능')).toBeVisible();
    await expect(hero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(hero.getByText('검토 가능')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: '면접 문의', exact: true })).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=%EC%B1%84%EC%9A%A9%20%EC%A0%9C%EC%95%88%20%EB%98%90%EB%8A%94%20%EB%A9%B4%EC%A0%91%20%EB%AC%B8%EC%9D%98'
    );
    await expect(hero.getByRole('link', { name: '경력 보기', exact: true })).toHaveAttribute(
      'href',
      '#resume'
    );
    await expect(hero.getByRole('link', { name: '프로젝트 보기', exact: true })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(
      hero.getByRole('link', { name: /jclee-bot PR 리뷰 · 시크릿 스캔 · ELK 로그/ })
    ).toHaveCount(0);
    await expect(
      hero.getByRole('link', { name: /jclee-bot PR 리뷰 · 시크릿 스캔 · Check Run/ })
    ).toBeVisible();
    await expect(hero.getByText('증빙 프로젝트 보기')).toHaveCount(0);
    await expect(hero.getByText('공개 운영 근거')).toHaveCount(0);
  });

  test('should keep localized hiring copy aligned across English and Japanese pages', async ({
    page,
  }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const englishHero = page.locator('#hero');
    await expect(
      englishHero.getByText(
        'Open to interview requests for security automation and security infrastructure roles'
      )
    ).toBeVisible();
    await expect(
      englishHero.getByText('Open to interview requests', { exact: true })
    ).toBeVisible();
    await expect(englishHero.locator('.hero-public-proof__label')).toContainText(
      'Public automation evidence'
    );
    await expect(englishHero.getByText('Public proof shortcuts')).toHaveCount(0);
    await expect(englishHero.getByText(/passed the FSC|passed licensing audits/i)).toHaveCount(0);
    await expect(
      englishHero.getByRole('link', { name: 'Interview request', exact: true })
    ).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=Hiring%20proposal%20or%20interview%20request'
    );
    await expect(
      englishHero.getByRole('link', { name: 'Career evidence', exact: true })
    ).toHaveAttribute('href', '#resume');
    await expect(
      englishHero.getByRole('link', { name: 'Project evidence', exact: true })
    ).toHaveAttribute('href', '#projects');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expect(
      japaneseHero.getByText('セキュリティ自動化・セキュリティ基盤の面接依頼を歓迎')
    ).toBeVisible();
    await expect(
      japaneseHero.getByText(
        '採用判断に必要な公開自動化根拠、連絡・履歴書PDF、直近の基盤構築を先に示します。'
      )
    ).toBeVisible();
    await expect(japaneseHero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(japaneseHero.getByText('確認可能')).toHaveCount(0);
    await expect(japaneseHero.getByText('証跡')).toHaveCount(0);
    await expect(japaneseHero.getByText(/通過|FSC本認可/)).toHaveCount(0);
    await expect(japaneseHero.locator('.hero-proof-list')).toHaveAttribute(
      'aria-label',
      '採用判断の主要根拠'
    );
    await expect(japaneseHero.getByRole('link', { name: '面接依頼', exact: true })).toBeVisible();
    await expect(
      japaneseHero.getByRole('link', { name: 'プロジェクト確認', exact: true })
    ).toHaveAttribute('href', '#projects');
  });
});
