const { test, expect } = require('@playwright/test');

test.describe('Portfolio hiring copy', () => {
  test('should expose recruiter-ready evidence and hiring actions above the fold', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hero = page.locator('#hero');
    await expect(
      hero.getByText('보안 자동화 · 보안 인프라 면접 제안 가능')
    ).toBeVisible();
    await expect(
      hero.getByText(
        '넥스트레이드 보안 인프라 구축·자동화와 공개 자동화 프로젝트, 연락처·이력서 PDF를 한 화면에 정리했습니다.'
      )
    ).toBeVisible();
    await expect(hero.getByText('보안 자동화 · 보안 인프라 · SIEM')).toBeVisible();
    await expect(hero.locator('.hiring-review-packet__status')).toHaveText('면접 제안 가능');
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
      'Public automation projects'
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
      englishHero.getByRole('link', { name: 'Career detail', exact: true })
    ).toHaveAttribute('href', '#resume');
    await expect(
      englishHero.getByRole('link', { name: 'Project detail', exact: true })
    ).toHaveAttribute('href', '#projects');

    await page.goto('/ja/', { waitUntil: 'domcontentloaded' });
    const japaneseHero = page.locator('#hero');
    await expect(
      japaneseHero.getByText('セキュリティ自動化・セキュリティ基盤の面接依頼を歓迎')
    ).toBeVisible();
    await expect(
      japaneseHero.getByText(
        '直近のセキュリティ基盤構築、公開プロジェクト、連絡先・履歴書PDFを1ページにまとめました。'
      )
    ).toBeVisible();
    await expect(japaneseHero.getByText(/SRE|DevSecOps/)).toHaveCount(0);
    await expect(japaneseHero.getByText('確認可能')).toHaveCount(0);
    await expect(japaneseHero.getByText('証跡')).toHaveCount(0);
    await expect(japaneseHero.getByText(/通過|FSC本認可/)).toHaveCount(0);
    await expect(japaneseHero.locator('.hero-proof-list')).toHaveAttribute(
      'aria-label',
      '経歴サマリー'
    );
    await expect(japaneseHero.getByRole('link', { name: '面接依頼', exact: true })).toBeVisible();
    await expect(
      japaneseHero.getByRole('link', { name: 'プロジェクト確認', exact: true })
    ).toHaveAttribute('href', '#projects');
  });
});
