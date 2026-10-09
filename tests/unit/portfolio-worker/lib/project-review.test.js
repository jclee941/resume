const projectReview = require('../../../../apps/portfolio/lib/cards/project-review');

const { buildProjectCaseNotes, projectAnchor, projectLabelsFor } = projectReview;

describe('project review cards', () => {
  const projects = [
    {
      id: 'elk-demo',
      title: 'ELK Live Demo',
      tagline: '운영 근거',
      tech: 'Elasticsearch, Kibana',
      description:
        '로그 탐색 경로를 만들었습니다. 대시보드와 알림 흐름을 연결했습니다. 운영 확인 근거를 남겼습니다.',
    },
  ];

  test('detects localized problem / what-I-did / result labels from project copy', () => {
    expect(projectLabelsFor(projects)).toMatchObject({
      problem: '문제',
      role: '한 일',
      proof: '결과',
    });
    expect(
      projectLabelsFor([{ title: 'Ops', description: 'Production evidence for the team.' }])
    ).toMatchObject({ problem: 'Problem', role: 'What I did', proof: 'Result' });
    expect(
      projectLabelsFor([{ title: '運用', description: '運用根拠が明確な事例です。' }])
    ).toMatchObject({ problem: '課題', role: '担当', proof: '結果' });
  });

  test('creates stable anchors from ids, titles, and fallback indexes', () => {
    expect(projectAnchor({ id: 'ELK Demo / Live' }, 0)).toBe('project-elk-demo-live');
    expect(projectAnchor({ title: '예시 ABC 보강' }, 1)).toBe('project-예시-abc-보강');
    expect(projectAnchor({ id: '!!!' }, 2)).toBe('project-3');
  });

  test('builds three escaped case-note rows without a review-target row', () => {
    const html = buildProjectCaseNotes(
      {
        title: '<script>alert(1)</script>',
        tagline: 'fallback',
        tech: '<b>ELK</b>',
        description:
          '<img src=x onerror=alert(1)> 문제를 정리했습니다. 역할을 나눴습니다. 근거를 남겼습니다.',
      },
      projectLabelsFor(projects)
    );

    expect(html).toContain('aria-label="&lt;script&gt;alert(1)&lt;/script&gt; 프로젝트 사례 요약"');
    expect(html.match(/<dt>/g)).toHaveLength(3);
    expect(html).toContain(
      '<dt>문제</dt><dd>&lt;img src=x onerror=alert(1)&gt; 문제를 정리했습니다.</dd>'
    );
    expect(html).toContain('<dt>한 일</dt><dd>역할을 나눴습니다.</dd>');
    expect(html).toContain('<dt>결과</dt><dd>근거를 남겼습니다.</dd>');
    expect(html).not.toContain('<dt>검토</dt>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
  });

  test('no longer exposes the recruiter review rail', () => {
    expect(projectReview.buildProjectReviewRail).toBeUndefined();
  });
});
