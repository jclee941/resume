const {
  buildProjectCaseNotes,
  buildProjectReviewRail,
  projectAnchor,
  projectLabelsFor,
} = require('../../../../apps/portfolio/lib/cards/project-review');

describe('project review cards', () => {
  const projects = [
    {
      id: 'elk-demo',
      title: 'ELK Live Demo',
      tagline: '운영 증거',
      tech: 'Elasticsearch, Kibana',
      description: '로그 탐색 경로를 만들었습니다. 대시보드와 알림 흐름을 연결했습니다. 운영 확인 근거를 남겼습니다.',
    },
    {
      title: 'Job Automation',
      tagline: '지원 자동화',
      tech: 'Node.js, Cloudflare',
      description: '채용 지원 흐름을 정리했습니다. 플랫폼별 입력을 검증했습니다.',
    },
    {
      title: 'jclee-bot',
      tagline: '자동화 계정',
      tech: 'GitHub Actions',
      description: '반복 운영 작업을 분리했습니다. 감사 가능한 커밋 흐름을 유지했습니다.',
    },
  ];

  test('detects localized labels from project copy', () => {
    expect(projectLabelsFor(projects).railTitle).toBe('채용 검토용 프로젝트 빠른 경로');
    expect(
      projectLabelsFor([
        {
          title: 'Ops',
          description: 'Jump to production evidence before reading the full list.',
        },
      ]).railTitle
    ).toBe('Fast paths for recruiter review');
    expect(
      projectLabelsFor([
        {
          title: '運用',
          description: '運用証跡が明確な事例です。',
        },
      ]).railTitle
    ).toBe('採用レビュー向けプロジェクト導線');
  });

  test('creates stable anchors from ids, titles, and fallback indexes', () => {
    expect(projectAnchor({ id: 'ELK Demo / Live' }, 0)).toBe('project-elk-demo-live');
    expect(projectAnchor({ title: '잡코리아 CCNP 보강' }, 1)).toBe('project-잡코리아-ccnp-보강');
    expect(projectAnchor({ id: '!!!' }, 2)).toBe('project-3');
  });

  test('builds escaped case notes with review target context', () => {
    const labels = projectLabelsFor(projects);
    const html = buildProjectCaseNotes(
      {
        title: '<script>alert(1)</script>',
        tagline: 'fallback',
        tech: '<b>ELK</b>',
        description:
          '<img src=x onerror=alert(1)> 문제를 정리했습니다. 역할을 나눴습니다. 증거를 남겼습니다.',
      },
      labels,
      '',
      'https://demo.example.com',
      []
    );

    expect(html).toContain('aria-label="&lt;script&gt;alert(1)&lt;/script&gt; 프로젝트 사례 요약"');
    expect(html).toContain('<dt>문제</dt>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; 문제를 정리했습니다.');
    expect(html).toContain('<dt>검토</dt><dd>운영 화면</dd>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
  });

  test('renders a three-project review rail with escaped anchors and summaries', () => {
    const html = buildProjectReviewRail(projects, projectLabelsFor(projects));

    expect(html).toContain('class="project-review-rail"');
    expect(html).toContain('href="#project-elk-demo"');
    expect(html).toContain('ELK Live Demo');
    expect(html).toContain('로그 탐색 경로를 만들었습니다.');
    expect((html.match(/project-review-rail__link/g) || []).length).toBe(3);
  });

  test('does not render the rail when there are fewer than three projects', () => {
    expect(buildProjectReviewRail(projects.slice(0, 2), projectLabelsFor(projects))).toBe('');
  });
});
