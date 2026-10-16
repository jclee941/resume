const {
  generateProjectMore,
  withCoverLetterFold,
  renderDisclosureButton,
} = require('../../../../apps/portfolio/lib/cards/disclosures');
const { generateCoverLetterSection } = require('../../../../apps/portfolio/lib/cards/cover-letter');

const extras = (count) => '<li data-project-extra="true"></li>'.repeat(count);

describe('generateProjectMore()', () => {
  test.each([
    ['ko', '프로젝트 3개·심층 사례 더 보기', '접기'],
    ['en', 'Show 3 more projects', 'Show fewer'],
    ['ja', '他3件のプロジェクトを表示', '閉じる'],
  ])('%s labels name the action and carry the count', (locale, more, less) => {
    const html = generateProjectMore(`<li></li>${extras(3)}`, locale);
    expect(html).toContain('<div class="project-more">');
    expect(html).toContain('aria-expanded="false" aria-controls="project-list"');
    expect(html).toContain(
      `data-label-closed="${more}" data-label-open="${less}">${more}</button>`
    );
  });

  test('only Korean pages mention the case studies mounted after the list', () => {
    expect(generateProjectMore(extras(2), 'ko')).toContain('심층 사례');
    expect(generateProjectMore(extras(2), 'en')).not.toMatch(/case stud/i);
    expect(generateProjectMore(extras(2), 'ja')).not.toContain('詳細事例');
  });

  test('renders nothing without collapsed projects', () => {
    expect(generateProjectMore('<li></li>', 'ko')).toBe('');
    expect(generateProjectMore(undefined, 'ko')).toBe('');
  });
});

describe('withCoverLetterFold()', () => {
  const letter = (count) =>
    generateCoverLetterSection({
      headline: 'headline',
      paragraphs: Array.from({ length: count }, (_, index) => `paragraph ${index}`),
      closing: 'end',
    });

  test.each([
    ['ko', '나머지 4개 문단 읽기', '커버레터 접기'],
    ['en', 'Read the remaining 4 paragraphs', 'Fold the cover letter'],
    ['ja', '残り4段落を読む', 'カバーレターを閉じる'],
  ])(
    '%s folds every paragraph after the first behind a server-rendered toggle',
    (locale, more, less) => {
      const html = withCoverLetterFold(letter(5), locale);
      expect(html).toContain(
        '<ol class="cover-letter__paragraphs" id="cover-letter-paragraphs" data-fold>'
      );
      expect(html).toContain(
        `aria-controls="cover-letter-paragraphs" data-label-closed="${more}" data-label-open="${less}">${more}</button>`
      );
      expect(html.indexOf('</ol><button')).toBeGreaterThan(0);
      expect(html).not.toMatch(/\shidden[\s>=]/);
    }
  );

  test('leaves short letters unfolded', () => {
    expect(withCoverLetterFold(letter(2), 'ko')).toBe(letter(2));
    expect(withCoverLetterFold(letter(3), 'ko')).toContain('data-fold');
    expect(withCoverLetterFold('', 'ko')).toBe('');
  });
});

describe('renderDisclosureButton()', () => {
  test('escapes labels and keeps inner markup', () => {
    const html = renderDisclosureButton({
      className: 'x',
      controls: 'target',
      labels: { more: 'a "b" <c>', less: 'less' },
    });
    expect(html).toContain('data-label-closed="a &quot;b&quot; &lt;c&gt;"');
    expect(html).toContain('>a &quot;b&quot; &lt;c&gt;</button>');
  });
});
