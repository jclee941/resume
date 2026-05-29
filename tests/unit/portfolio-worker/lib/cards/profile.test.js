'use strict';

const { generateProfileBento } = require('../../../../../apps/portfolio/lib/cards/profile');

describe('cards/profile generateProfileBento', () => {
  const full = {
    education: { school: '한양사이버대학교', major: '컴퓨터공학과', status: '재학중', startDate: '2024.03' },
    languages: [
      { name: 'Korean', level: 'Native' },
      { name: 'English', level: 'Working proficiency' },
    ],
    awards: [{ name: '자율주행 경진대회 우수상', organization: '한양사이버대학교', year: '2026' }],
    ossContributions: [{ name: 'resume-portfolio', url: 'https://github.com/jclee941/resume' }],
    military: { status: '사회복무요원', period: '2014.12 - 2016.12' },
  };

  it('returns empty string for empty/invalid input', () => {
    expect(generateProfileBento(null)).toBe('');
    expect(generateProfileBento({})).toBe('');
  });

  it('renders all five cards when data is present', () => {
    const html = generateProfileBento(full);
    expect(html).toContain('profile-bento');
    ['education', 'languages', 'awards', 'open_source', 'military'].forEach((label) => {
      expect(html).toContain(`&gt; ${label}`);
    });
  });

  it('includes real SSoT values', () => {
    const html = generateProfileBento(full);
    expect(html).toContain('한양사이버대학교');
    expect(html).toContain('Korean');
    expect(html).toContain('자율주행 경진대회 우수상');
    expect(html).toContain('resume-portfolio');
    expect(html).toContain('사회복무요원');
  });

  it('links OSS contributions with safe https url + noopener', () => {
    const html = generateProfileBento(full);
    expect(html).toContain('href="https://github.com/jclee941/resume"');
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
    const html = generateProfileBento({ military: { status: '사회복무요원' } });
    expect(html).toContain('&gt; military');
    expect(html).not.toContain('&gt; education');
    expect(html).not.toContain('&gt; awards');
  });
});
