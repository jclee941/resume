'use strict';

const { generateProfileBento } = require('../../../../../apps/portfolio/lib/cards/profile');

describe('cards/profile generateProfileBento', () => {
  const full = {
    education: {
      school: '예시대학교',
      major: '예시학과',
      status: '재학중',
      startDate: '2024.03',
    },
    languages: [
      { name: 'Korean', level: 'Native' },
      { name: 'English', level: 'Working proficiency' },
    ],
    awards: [{ name: '예시 공모전 우수상', organization: '예시대학교', year: '2026' }],
    ossContributions: [{ name: 'example-project', url: 'https://github.com/example-user/example' }],
    military: { status: '예시복무', period: '2000.01 - 2001.12' },
  };

  it('returns empty string for empty/invalid input', () => {
    expect(generateProfileBento(null)).toBe('');
    expect(generateProfileBento({})).toBe('');
  });

  it('renders all five cards with localized KO labels by default', () => {
    const html = generateProfileBento(full);
    expect(html).toContain('profile-bento');
    ['학력', '어학', '수상', '오픈소스', '병역'].forEach((label) => {
      expect(html).toContain(`profile-card__label">${label}<`);
    });
    // Terminal-style '>' prefixes are gone from reader-facing labels.
    expect(html).not.toContain('&gt;');
  });

  it('renders localized EN and JA labels', () => {
    const en = generateProfileBento(full, 'en');
    ['Education', 'Languages', 'Awards', 'Open source', 'Military service'].forEach((label) => {
      expect(en).toContain(`profile-card__label">${label}<`);
    });
    const ja = generateProfileBento(full, 'ja');
    ['学歴', '語学', '受賞', 'オープンソース', '兵役'].forEach((label) => {
      expect(ja).toContain(`profile-card__label">${label}<`);
    });
  });

  it('includes real SSoT values', () => {
    const html = generateProfileBento(full);
    expect(html).toContain(full.education.school);
    expect(html).toContain(full.languages[0].name);
    expect(html).toContain(full.awards[0].name);
    expect(html).toContain(full.ossContributions[0].name);
    expect(html).toContain(full.military.status);
  });

  it('shows the expected graduation month after the start month', () => {
    const html = generateProfileBento({
      education: {
        school: '예시대학교',
        status: '졸업 예정',
        startDate: '2024.03',
        endDate: '2027.02',
      },
    });
    expect(html).toContain('(졸업 예정) 2024.03 ~ 2027.02');
  });

  it('renders the profile photo first, with a localized alt text', () => {
    const photo = '/assets/profile-photo.jpg?v=0123456789ab';
    const ko = generateProfileBento({ ...full, hero: { title: '예시 이름' } }, 'ko', photo);
    const en = generateProfileBento({ ...full, hero: { title: 'Example Person' } }, 'en', photo);

    expect(ko.indexOf('profile-card--photo')).toBeLessThan(ko.indexOf('profile-card__label'));
    expect(ko).toContain(`src="${photo}" alt="예시 이름 증명사진"`);
    expect(en).toContain('alt="Photo of Example Person"');
  });

  it('omits the photo card without a photo and escapes the photo URL', () => {
    expect(generateProfileBento(full, 'ko')).not.toContain('<img');
    expect(generateProfileBento(full, 'ko', '/a.jpg?"><script>')).toContain(
      'src="/a.jpg?&quot;&gt;&lt;script&gt;"'
    );
  });

  it('omits the award year when the official award name already carries it', () => {
    const html = generateProfileBento({
      awards: [
        {
          name: '2026 예시 공모전 장려상',
          organization: '예시대학교',
          year: '2026',
        },
        { name: '공로상', organization: '테스트기관', year: '2025' },
      ],
    });
    expect(html).toContain(
      '2026 예시 공모전 장려상 <span class="profile-card__muted">예시대학교</span></li>'
    );
    expect(html).toContain(
      '공로상 <span class="profile-card__muted">테스트기관</span> (2025)</li>'
    );
  });

  it('links OSS contributions with safe https url + noopener', () => {
    const html = generateProfileBento(full);
    expect(html).toContain('href="https://github.com/example-user/example"');
    expect(html).toContain('rel="noopener"');
  });

  it('neutralizes a non-http OSS url to #', () => {
    const html = generateProfileBento({
      ossContributions: [{ name: 'evil', url: 'javascript:alert(1)' }],
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('escapes HTML in user-controlled fields', () => {
    const html = generateProfileBento({
      education: { school: '<script>x</script>' },
    });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('omits sections that have no data', () => {
    const html = generateProfileBento({ military: { status: '예시복무' } });
    expect(html).toContain('profile-card__label">병역<');
    expect(html).not.toContain('학력');
    expect(html).not.toContain('수상');
  });
});
