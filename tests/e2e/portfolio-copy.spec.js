const { test, expect } = require('@playwright/test');

test.describe('Portfolio hiring copy', () => {
  test('should expose recruiter-ready proof and hiring actions above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expect(hero.getByText('보안 운영 · 보안 인프라 역할 중심으로 면접 제안 환영')).toBeVisible();
    await expect(
      hero.getByText(
        '거래소 보안 인프라 구축·운영, SIEM 알림, 장비 API 조회 근거를 먼저 볼 수 있게 정리했습니다.'
      )
    ).toBeVisible();
    await expect(hero.getByText('희망 역할: 보안 운영 · 보안 인프라')).toBeVisible();
    await expect(hero.getByText('면접 제안 가능')).toBeVisible();
    await expect(hero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(hero.getByText('검토 가능')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: '면접 문의', exact: true })).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=%EC%B1%84%EC%9A%A9%20%EC%A0%9C%EC%95%88%20%EB%98%90%EB%8A%94%20%EB%A9%B4%EC%A0%91%20%EB%AC%B8%EC%9D%98'
    );
    await expect(hero.getByRole('link', { name: '경력 확인', exact: true })).toHaveAttribute(
      'href',
      '#resume'
    );
    await expect(hero.getByRole('link', { name: '프로젝트 확인', exact: true })).toHaveAttribute(
      'href',
      '#projects'
    );
    await expect(
      hero.getByRole('link', { name: /jclee-bot PR 리뷰 · 시크릿 스캔 · ELK 로그/ })
    ).toBeVisible();
    await expect(hero.getByText('증빙 프로젝트 보기')).toHaveCount(0);
  });

  test('should keep localized hiring copy aligned across English and Japanese pages', async ({
    page,
  }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    const englishHero = page.locator('#hero');
    await expect(
      englishHero.getByText(
        'Open to interview requests for security operations and security infrastructure roles'
      )
    ).toBeVisible();
    await expect(
      englishHero.getByText('Open to interview requests', { exact: true })
    ).toBeVisible();
    await expect(englishHero.getByRole('link', { name: 'Interview request' })).toHaveAttribute(
      'href',
      'mailto:qws941@kakao.com?subject=Hiring%20proposal%20or%20interview%20request'
    );
    await expect(
      englishHero.getByRole('link', { name: 'Review career', exact: true })
    ).toHaveAttribute('href', '#resume');
    await expect(
      englishHero.getByRole('link', { name: 'Review projects', exact: true })
    ).toHaveAttribute('href', '#projects');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expect(
      japaneseHero.getByText('セキュリティ運用・セキュリティ基盤の面接相談を歓迎')
    ).toBeVisible();
    await expect(
      japaneseHero.getByText(
        '取引所セキュリティ基盤の構築・運用、SIEM通知、機器API照会の根拠を先に示します。'
      )
    ).toBeVisible();
    await expect(japaneseHero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(japaneseHero.getByText('確認可能')).toHaveCount(0);
    await expect(japaneseHero.getByRole('link', { name: '面接相談', exact: true })).toBeVisible();
    await expect(
      japaneseHero.getByRole('link', { name: 'プロジェクト確認', exact: true })
    ).toHaveAttribute('href', '#projects');
  });
});
