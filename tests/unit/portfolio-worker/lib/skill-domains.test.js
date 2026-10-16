const {
  generateSkillDomainCards,
  skillCountText,
} = require('../../../../apps/portfolio/lib/cards/skill-domains');
const { ICON_PATHS } = require('../../../../apps/portfolio/lib/icons');

const item = (name) => ({ name, level: 'expert' });
const skills = {
  security: {
    title: 'Group One',
    icon: 'Shield',
    items: [item('Alpha'), item('한글 항목'), item('<Beta>')],
  },
  mystery: {
    title: 'Group Two',
    icon: 'Code',
    items: Array.from({ length: 11 }, (_, index) => item(`Skill ${index}`)),
  },
  empty: { title: 'Nothing', icon: 'Code', items: [] },
};

describe('generateSkillDomainCards()', () => {
  const html = generateSkillDomainCards(skills, 'en');
  const [security, mystery] = html.split('</article>');

  test('renders one card per non-empty domain in data order', () => {
    expect(html.match(/<article /g)).toHaveLength(2);
    expect(security).toContain('data-domain="security"');
    expect(mystery).toContain('data-domain="mystery"');
    expect(html).not.toContain('Nothing');
  });

  test('card structure matches the hydrated contract', () => {
    expect(security).toContain(
      '<article class="skill-domain-card" data-domain="security" aria-labelledby="skill-domain-security">'
    );
    expect(security).toContain(
      '<h3 class="skill-domain-card__title" id="skill-domain-security">Group One</h3>'
    );
    expect(security).toContain('<ul class="skill-list" aria-labelledby="skill-domain-security">');
    expect(security).toContain(
      '<div class="skill-domain-card__icon" aria-hidden="true"><svg class="portfolio-icon"'
    );
  });

  test('tall domains, CJK pills and escaping', () => {
    expect(mystery).toContain('skill-domain-card skill-domain-card--tall');
    expect(security).not.toContain('--tall');
    expect(security).toContain('<li class="skill-item" data-skill="Alpha">Alpha</li>');
    expect(security).toContain(
      '<li class="skill-item skill-item--cjk" data-skill="한글 항목">한글 항목</li>'
    );
    expect(security).toContain('&lt;Beta&gt;');
  });

  test('icons come from the shared icon source and unknown domains fall back to layers', () => {
    expect(security).toContain(ICON_PATHS.shield);
    expect(mystery).toContain(ICON_PATHS.layers);
  });

  test.each([
    ['ko', 1, '1개 기술'],
    ['ko', 3, '3개 기술'],
    ['en', 1, '1 skill'],
    ['en', 3, '3 skills'],
    ['ja', 3, '3件のスキル'],
  ])('%s count text for %i', (locale, count, expected) => {
    expect(skillCountText(count, locale)).toBe(expected);
  });

  test('empty or invalid input renders nothing', () => {
    expect(generateSkillDomainCards(null, 'ko')).toBe('');
    expect(generateSkillDomainCards({}, 'ko')).toBe('');
  });
});
