const { test, expect } = require('@playwright/test');

const koStories = {
  about: '수작업을 줄이는 방식으로 보안 운영을 배워 온 엔지니어입니다.',
  resume:
    '폐쇄망 운영에서 금융권 보안 운영까지, 같은 질문은 반복되었습니다: 무엇을 자동화할 수 있는가.',
  certifications:
    'Linux 기반을 다시 다진 뒤, 보안·네트워크·컨테이너 보안으로 학습 축을 확장했습니다.',
  projects: '현장에서 만난 반복 문제를 개인 프로젝트와 운영 도구로 다시 검증했습니다.',
  'case-studies': '단일 기능보다 중요한 것은 장애, 감사, 인계까지 버티는 구조였습니다.',
  skills: '기술 스택은 목적지가 아니라, 운영 문제를 자동화하기 위해 선택한 도구 목록입니다.',
  status: '포트폴리오도 문서가 아니라 운영 중인 서비스로 감시합니다.',
  infrastructure: '홈랩은 자동화 가설을 먼저 검증하는 운영 실험실입니다.',
  'site-security': '말로 설명한 보안 원칙은 이 사이트의 헤더, 세션, CI에도 적용했습니다.',
  observability: '운영 근거는 감이 아니라 메트릭, 로그, 대시보드로 남깁니다.',
  contact: '다음 문제도 운영 문제에서 출발해 자동화 가능한 구조로 바꾸고 싶습니다.',
  guestbook: '방문자의 흔적도 입력 방어와 로그 흐름 안에서 안전하게 남깁니다.',
};

const enStorySmoke = {
  about: 'I learned security operations by turning manual work into repeatable systems.',
  infrastructure:
    'The homelab is the operations lab where automation assumptions are validated first.',
};

async function safeGoto(page, url = '/') {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (!response || response.status() >= 500) {
    test.skip(true, 'Server unavailable');
  }
}

test.describe('section storytelling intros', () => {
  test('KO page renders exactly one terminal-comment story for each target section', async ({ page }) => {
    await safeGoto(page, '/');

    for (const [sectionId, story] of Object.entries(koStories)) {
      const stories = page.locator(`#${sectionId} .section-cmd__story`);
      await expect(stories).toHaveCount(1);
      await expect(stories).toHaveText(story);
    }
  });

  test('KO page keeps hero and cover-letter free of section story intros', async ({ page }) => {
    await safeGoto(page, '/');

    await expect(page.locator('#hero .section-cmd__story')).toHaveCount(0);
    await expect(page.locator('#cover-letter .section-cmd__story')).toHaveCount(0);
  });

  test('EN page renders terminal-comment stories on representative sections', async ({ page }) => {
    await safeGoto(page, '/en/');

    for (const [sectionId, story] of Object.entries(enStorySmoke)) {
      const stories = page.locator(`#${sectionId} .section-cmd__story`);
      await expect(stories).toHaveCount(1);
      await expect(stories).toHaveText(story);
    }
  });
});
