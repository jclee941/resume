'use strict';

const {
  generateAchievementsSection,
  generateExpertiseSection,
} = require('../../../../../apps/portfolio/lib/cards/evidence');

describe('cards/evidence generateAchievementsSection', () => {
  const data = {
    achievements: [
      '넥스트레이드 매매체결시스템 보안 인프라(FortiGate HA, 5계층 망분리)를 설계·운영하며 금융위 본인가 심사를 통과했습니다.',
      'Splunk ES 탐지 룰, n8n 알림, FortiManager 정책 조회를 하나의 보안 이벤트 인지·분류·알림 흐름으로 연결해 운영했습니다.',
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
  });

  it('renders expertise tags and core-competency items', () => {
    const html = generateExpertiseSection({
      expertise: ['보안', 'SRE', '클라우드 보안'],
      coreCompetencies: ['금융권 규제 환경 보안 인프라 경험', 'SIEM 탐지 룰 검토 경험'],
    });
    expect(html).toContain('expertise-tags');
    expect((html.match(/class="expertise-tag"/g) || []).length).toBe(3);
    expect(html).toContain('보안');
    expect((html.match(/class="competency-item"/g) || []).length).toBe(2);
    expect(html).toContain('SIEM 탐지 룰');
  });

  it('escapes HTML (XSS-safe)', () => {
    const html = generateExpertiseSection({ expertise: ['<b>x</b>'], coreCompetencies: ['<i>y</i> & z'] });
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('&amp;');
  });

  it('renders only expertise when coreCompetencies absent', () => {
    const html = generateExpertiseSection({ expertise: ['보안'] });
    expect(html).toContain('expertise-tags');
    expect(html).not.toContain('competency-item');
  });
});
