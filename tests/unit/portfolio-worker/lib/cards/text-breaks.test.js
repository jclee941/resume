const {
  formatAwardName,
  glueKoreanPhrases,
  keepHyphenatedTokens,
} = require('../../../../../apps/portfolio/lib/cards/text-breaks');

describe('cards/text-breaks', () => {
  it.each([
    ['운영할 수 있게 했다', '운영할\u00a0수\u00a0있게 했다'],
    ['코드로 바꿔 온 방식', '코드로 바꿔\u00a0온 방식'],
    ['그 시기에 시작했다', '그\u00a0시기에 시작했다'],
    ['자격증 2급을 땄다', '자격증\u00a02급을 땄다'],
    ['운영하고 있는 서비스', '운영하고\u00a0있는 서비스'],
    ['확인하는 데 썼다', '확인하는\u00a0데 썼다'],
  ])('joins the Korean phrase in %s', (input, expected) => {
    expect(glueKoreanPhrases(input)).toBe(expected);
  });

  it.each(['보안 정책을 정리했다', '서버 운영 경험', 'English text stays as it is', '日本語の文'])(
    'leaves %s unchanged',
    (input) => {
      expect(glueKoreanPhrases(input)).toBe(input);
    }
  );

  it('keeps short hyphenated tokens on one line and leaves long ones breakable', () => {
    expect(keepHyphenatedTokens('Wi-Fi and A-B-C, not infrastructure-as-a-service', 'k')).toBe(
      '<span class="k">Wi-Fi</span> and <span class="k">A-B-C</span>, not infrastructure-as-a-service'
    );
  });

  it('formats award names: escaped, year joined, Japanese seams breakable', () => {
    expect(formatAwardName('2026 全国ロボットコンテスト優秀賞')).toBe(
      '2026\u00a0全国<wbr>ロボットコンテスト<wbr>優秀賞'
    );
    expect(formatAwardName('<b>Award</b>')).toBe('&lt;b&gt;Award&lt;/b&gt;');
  });
});
