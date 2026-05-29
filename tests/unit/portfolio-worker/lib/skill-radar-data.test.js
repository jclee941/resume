'use strict';

const {
  buildSkillRadarData,
  LEVEL_MAP,
} = require('../../../../apps/portfolio/lib/skill-radar-data');

describe('skill-radar-data', () => {
  const sample = {
    observability: {
      title: 'Observability',
      icon: 'Activity',
      items: [
        { name: 'Grafana', level: 'expert' },
        { name: 'Loki', level: 'advanced' },
      ],
    },
    security: {
      title: 'Security',
      icon: 'Shield',
      items: [{ name: 'FortiGate', level: 'expert' }],
    },
    empty: { title: 'Empty', icon: 'Code', items: [] },
  };

  it('returns {} for invalid input', () => {
    expect(buildSkillRadarData(null)).toEqual({});
    expect(buildSkillRadarData(undefined)).toEqual({});
    expect(buildSkillRadarData('nope')).toEqual({});
  });

  it('keeps only categories with items', () => {
    const out = buildSkillRadarData(sample);
    expect(Object.keys(out).sort()).toEqual(['observability', 'security']);
    expect(out.empty).toBeUndefined();
  });

  it('maps level strings to the numeric scale', () => {
    const out = buildSkillRadarData(sample);
    expect(out.observability.skills[0].level).toBe(LEVEL_MAP.expert);
    expect(out.observability.skills[1].level).toBe(LEVEL_MAP.advanced);
  });

  it('defaults unknown level to 60', () => {
    const out = buildSkillRadarData({
      x: { title: 'X', icon: 'Code', items: [{ name: 'Foo', level: 'wizard' }] },
    });
    expect(out.x.skills[0].level).toBe(60);
  });

  it('resolves known lucide icon names to inline SVG', () => {
    const out = buildSkillRadarData(sample);
    expect(out.observability.icon).toContain('<svg');
    expect(out.security.icon).toContain('<svg');
  });

  it('falls back to a generic SVG for unknown icon names', () => {
    const out = buildSkillRadarData({
      x: { title: 'X', icon: 'NoSuchIcon', items: [{ name: 'A', level: 'expert' }] },
    });
    expect(out.x.icon).toContain('<svg');
  });

  it('synthesizes an evidence string from the proficiency tier', () => {
    const out = buildSkillRadarData(sample);
    expect(out.observability.skills[0].evidence).toBe('Expert proficiency');
    expect(out.observability.skills[1].evidence).toBe('Advanced proficiency');
  });

  it('preserves all skill names', () => {
    const out = buildSkillRadarData(sample);
    expect(out.observability.skills.map((s) => s.name)).toEqual(['Grafana', 'Loki']);
  });
});
