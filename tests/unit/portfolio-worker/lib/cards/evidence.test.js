'use strict';

const {
  generateAchievementsSection,
  generateExpertiseSection,
} = require('../../../../../apps/portfolio/lib/cards/evidence');

describe('cards/evidence generateAchievementsSection', () => {
  const data = {
    achievements: [
      '넥스트레이드 매매체결시스템 보안 인프라(망분리·엔드포인트 보안)를 구축·운영하며 금융위 본인가 심사를 통과했습니다.',
      'Splunk ES 탐지 룰, 알림 워크플로, FortiManager 정책 조회를 하나의 보안 이벤트 인지·분류·알림 흐름으로 연결해 운영했습니다.',
      'Prometheus node_exporter로 Proxmox VM/CT 메트릭을 수집하고 Grafana-as-code로 관리했습니다.',
    ],
  };

  it('returns empty string for empty/invalid input', () => {
    expect(generateAchievementsSection(null)).toBe('');
    expect(generateAchievementsSection({})).toBe('');
    expect(generateAchievementsSection({ achievements: [] })).toBe('');
  });

  it('renders one card per achievement', () => {
    const html = generateAchievementsSection(data);
    expect(html).toContain('achievements-list');
    // one list item per achievement
    expect((html.match(/class="achievement-card"/g) || []).length).toBe(3);
    expect(html).toContain('금융위 본인가 심사');
    expect(html).toContain('Splunk ES');
  });

  it('escapes HTML in achievement text (XSS-safe)', () => {
    const html = generateAchievementsSection({
      achievements: ['<img src=x onerror=alert(1)> & "quote"'],
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
  });

  it('ignores non-string achievement entries gracefully', () => {
    const html = generateAchievementsSection({
      achievements: ['real one', null, 42, { x: 1 }],
    });
    expect((html.match(/class="achievement-card"/g) || []).length).toBe(1);
    expect(html).toContain('real one');
  });
});

describe('cards/evidence generateExpertiseSection', () => {
  it('returns empty string for empty/invalid input', () => {
    expect(generateExpertiseSection(null)).toBe('');
    expect(generateExpertiseSection({})).toBe('');
    expect(generateExpertiseSection({ expertise: [], coreCompetencies: [] })).toBe('');
    expect(generateExpertiseSection({ coreCompetencies: ['SIEM 탐지 룰 검토 경험'] })).toBe('');
  });

  it('renders expertise tags and leaves core competencies to the experience section', () => {
    const html = generateExpertiseSection(
      {
        expertise: ['보안', 'SRE', '클라우드 보안'],
        coreCompetencies: ['금융권 규제 환경 보안 인프라 경험', 'SIEM 탐지 룰 검토 경험'],
      },
      'ko'
    );
    expect(html).toContain('expertise-tags');
    expect(html).toContain('전문 분야');
    expect((html.match(/class="expertise-tag"/g) || []).length).toBe(3);
    expect((html.match(/about-subsection__heading/g) || []).length).toBe(1);
    expect(html).not.toContain('competency');
    expect(html).not.toContain('SIEM 탐지 룰');
  });

  it('escapes HTML (XSS-safe)', () => {
    const html = generateExpertiseSection({ expertise: ['<b>x</b> & y'] });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });

  it('localizes the heading for English and Japanese data', () => {
    expect(generateExpertiseSection({ expertise: ['Security'] }, 'en')).toContain(
      'Areas of expertise'
    );
    expect(generateExpertiseSection({ expertise: ['ネットワークセキュリティ'] }, 'ja')).toContain(
      '専門分野'
    );
  });

  it('uses explicit KO and JA locales even when content is English-heavy', () => {
    const englishHeavyData = { expertise: ['Security Engineering', 'SRE', 'Cloud Security'] };
    const koreanHtml = generateExpertiseSection(englishHeavyData, 'ko');
    const japaneseHtml = generateExpertiseSection(englishHeavyData, 'ja');

    expect(koreanHtml).toContain('전문 분야');
    expect(koreanHtml).not.toContain('Areas of expertise');
    expect(japaneseHtml).toContain('専門分野');
    expect(japaneseHtml).not.toContain('Areas of expertise');
  });

  it('defaults unknown or missing locales to English without scanning content', () => {
    const koreanData = { expertise: ['보안'] };

    expect(generateExpertiseSection(koreanData)).toContain('Areas of expertise');
    expect(generateExpertiseSection(koreanData, 'fr')).toContain('Areas of expertise');
  });
});
