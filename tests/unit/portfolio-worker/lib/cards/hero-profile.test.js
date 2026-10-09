const {
  generateHeroPortrait,
  generateHeroTrust,
} = require('../../../../../apps/portfolio/lib/cards/hero-profile');

describe('cards/hero-profile', () => {
  const photo = '/assets/profile-photo.jpg?v=0123456789ab';

  it('renders the portrait as a profile card with a localized alt text', () => {
    const ko = generateHeroPortrait({ hero: { title: '예시 이름' } }, 'ko', photo);
    const en = generateHeroPortrait({ hero: { title: 'Example Person' } }, 'en', photo);

    expect(ko).toContain('class="hero-portrait profile-card profile-card--photo"');
    expect(ko).toContain(`src="${photo}" alt="예시 이름 증명사진"`);
    expect(en).toContain('alt="Photo of Example Person"');
  });

  it('omits the portrait without a photo and escapes the photo URL', () => {
    expect(generateHeroPortrait({ hero: { title: 'x' } }, 'ko')).toBe('');
    expect(generateHeroPortrait({ hero: { title: 'x' } }, 'ko', '/a.jpg?"><script>')).toContain(
      'src="/a.jpg?&quot;&gt;&lt;script&gt;"'
    );
  });

  it('builds trust chips from the first two active certifications and every award, verbatim', () => {
    const html = generateHeroTrust(
      {
        certifications: [
          { name: 'Cert A', status: 'active' },
          { name: 'Cert B', status: '준비중' },
          { name: 'Cert C', status: 'active' },
          { name: 'Cert D', status: 'active' },
        ],
        awards: [{ name: '2026 예시 공모전 장려상' }, { name: '<b>Award</b>' }],
      },
      'ko'
    );
    const chips = [...html.matchAll(/<li class="hero-trust__item">([^<]*)<\/li>/g)].map(
      ([, text]) => text
    );

    expect(html).toContain('<ul class="hero-trust" aria-label="자격·수상">');
    expect(chips).toEqual([
      'Cert A',
      'Cert C',
      '2026 예시 공모전 장려상',
      '&lt;b&gt;Award&lt;/b&gt;',
    ]);
  });

  it('renders no trust list when there is nothing to show', () => {
    expect(generateHeroTrust({ certifications: [], awards: [] }, 'en')).toBe('');
    expect(generateHeroTrust(null, 'ja')).toBe('');
  });
});
