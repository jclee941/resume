'use strict';

const {
  filterSections,
  emphasizeContent,
  joinSections,
} = require('../../../tools/scripts/build/resume-variant-content');
const { CONFIG } = require('../../../tools/scripts/build/resume-variant-config');

describe('resume variant content', () => {
  it.each(Object.entries(CONFIG.variants))(
    'preserves identity and credential tables in the %s variant',
    (_name, config) => {
      const sections = {
        header: '# candidate-id',
        certifications: '## credentials\n\n| id | date |\n| --- | --- |\n| c1 | 2020.08 |',
        수상: '## awards\n\n| id |\n| --- |\n| a1 |',
      };

      const filtered = filterSections(sections, config);
      const output = emphasizeContent(joinSections(Object.values(filtered)), config.emphasis);

      for (const section of Object.values(sections)) {
        expect(output).toContain(section);
      }
    }
  );

  it('joins sections with a single rule, dropping the dividers the sections carry', () => {
    const joined = joinSections(['## 연락처\n- 이메일: a@b.c\n\n---\n', '---\n## 학력\n학교', '']);

    expect(joined).toBe('## 연락처\n- 이메일: a@b.c\n\n---\n\n## 학력\n학교');
  });

  it('keeps blank lines when emphasizing so rules never touch the text around them', () => {
    const content = emphasizeContent('## 요약\n- 보안 운영\n\n---\n\n## 기술\n무관한 문장', [
      '보안',
    ]);

    expect(content).toBe('## 요약\n- 보안 운영\n\n---\n\n## 기술');
    expect(content).not.toMatch(/---\n---/);
  });
});
