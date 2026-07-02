const fs = require('fs');
const path = require('path');

const sourcePath = path.join(
  __dirname,
  '../../../apps/portfolio/src/scripts/modules/project-cards.js'
);

describe('project deep-dive public context', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  test('renders deep-dive cards inside a labelled public section', () => {
    expect(source).toContain("section.className = 'case-study-deep-dives'");
    expect(source).toContain("section.setAttribute('aria-labelledby', 'case-study-heading')");
    expect(source).toContain('case-study-deep-dives__title');
    expect(source).toContain('case-study-deep-dives__description');
  });

  test('uses localized case-study heading and CTA copy', () => {
    expect(source).toContain('Operational case studies');
    expect(source).toContain('운영 사례 심층 검토');
    expect(source).toContain('運用事例の詳細');
    expect(source).toContain('Review details');
    expect(source).toContain('상세 검토');
    expect(source).toContain('詳細を見る');
  });
});
