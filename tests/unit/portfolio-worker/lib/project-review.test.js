const {
  buildProjectReviewRail,
  projectAnchor,
  projectLabelsFor,
} = require('../../../../apps/portfolio/lib/cards/project-review');

describe('project review cards', () => {
  const projects = [
    {
      id: 'safetywallet-cf-workers-pwa',
      title: 'SafetyWallet',
      tagline: '제품 근거',
      tech: 'Next.js, Workers',
      description: '사용자 화면과 API를 연결했습니다.',
    },
    {
      id: 'resume-portfolio',
      title: 'Resume Portfolio',
      tagline: '엣지 배포',
      tech: 'Cloudflare Workers',
      description: '다국어 콘텐츠를 빌드합니다.',
    },
    {
      id: 'ip-blacklist-platform',
      title: 'IP Blacklist',
      tagline: '백엔드 근거',
      tech: 'Flask, PostgreSQL',
      description: '소스 어댑터와 데이터 모델을 연결했습니다.',
    },
  ];

  test('detects exact localized capability labels from project copy', () => {
    expect(projectLabelsFor(projects).railTitle).toBe('풀스택 구현 사례');
    expect(
      projectLabelsFor([{ description: 'Product evidence across the complete stack.' }])
        .railTitle
    ).toBe('End-to-end project work');
    expect(projectLabelsFor([{ description: '運用根拠が明確な事例です。' }]).railTitle).toBe(
      'フルスタック開発事例'
    );
  });

  test('creates stable anchors from ids, titles, and fallback indexes', () => {
    expect(projectAnchor({ id: 'ELK Demo / Live' }, 0)).toBe('project-elk-demo-live');
    expect(projectAnchor({ title: '잡코리아 CCNP 보강' }, 1)).toBe('project-잡코리아-ccnp-보강');
    expect(projectAnchor({ id: '!!!' }, 2)).toBe('project-3');
  });

  test('renders the exact three featured links without sentence inference', () => {
    const html = buildProjectReviewRail(projects, projectLabelsFor(projects));

    expect(html).toContain('class="project-review-rail"');
    expect(
      [...html.matchAll(/class="project-review-rail__link" href="#([^"]+)"/g)].map(
        (match) => match[1]
      )
    ).toEqual(projects.map(({ id }) => `project-${id}`));
    expect(html).toContain('SafetyWallet');
    expect(html).toContain('제품 근거');
    expect((html.match(/project-review-rail__link/g) || []).length).toBe(3);
  });

  test('does not render the rail when there are fewer than three projects', () => {
    expect(buildProjectReviewRail(projects.slice(0, 2), projectLabelsFor(projects))).toBe('');
  });
});
