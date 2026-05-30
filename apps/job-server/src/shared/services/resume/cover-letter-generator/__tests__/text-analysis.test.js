import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getMatchedSkills, inferDomain } from '../text-analysis.js';

const resumeData = {
  summary: {
    expertise: ['보안', 'SRE', 'SIEM/SOAR', '클라우드 보안'],
  },
  skills: {
    observability: {
      items: [{ name: 'Grafana' }, { name: 'Prometheus' }, { name: 'Splunk' }],
    },
    secrets: {
      items: [{ name: '1Password (홈랩 운영)' }],
    },
    devops: {
      items: [{ name: 'Kubernetes' }, { name: 'Terraform' }],
    },
  },
};

describe('getMatchedSkills', () => {
  it('does not match a noisy skill on a single weak shared token', () => {
    // The job text shares only the generic token "운영" with "1Password (홈랩 운영)".
    // A single weak token overlap must NOT surface an irrelevant skill.
    const jobPosting = {
      position: '인프라 엔지니어 (Senior SRE)',
      description: '인프라 엔지니어 (Senior SRE)',
      requirements: '보안/인프라/클라우드 운영, SRE, DevOps',
    };

    const matched = getMatchedSkills(resumeData, jobPosting);

    assert.ok(
      !matched.includes('1Password (홈랩 운영)'),
      `noisy skill leaked into matched skills: ${JSON.stringify(matched)}`
    );
  });

  it('still matches a genuinely relevant skill', () => {
    const jobPosting = {
      position: 'Observability Engineer',
      description: 'Grafana and Prometheus operations',
      requirements: 'Grafana, Prometheus, Splunk',
    };

    const matched = getMatchedSkills(resumeData, jobPosting);

    assert.ok(matched.includes('Grafana'), `expected Grafana in ${JSON.stringify(matched)}`);
  });

  it('returns an empty list when nothing genuinely matches (no noise fallback)', () => {
    const jobPosting = {
      position: '영업 매니저',
      description: '신규 고객 발굴 및 영업 관리',
      requirements: '영업 경력',
    };

    const matched = getMatchedSkills(resumeData, jobPosting);

    assert.equal(matched.length, 0, `expected no matches, got ${JSON.stringify(matched)}`);
  });
});

describe('inferDomain', () => {
  it('uses curated expertise, not raw noisy skills', () => {
    const domain = inferDomain(resumeData);
    assert.ok(domain.includes('보안'));
    assert.ok(!domain.includes('1Password'));
  });
});
