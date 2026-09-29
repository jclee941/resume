'use strict';

const {
  emphasizeContent,
  joinSections,
} = require('../../../tools/scripts/build/resume-variant-content');

describe('resume variant content', () => {
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
