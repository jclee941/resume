import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { jobMatcherTool } from '../job-matcher.js';

const mockResumeData = {
  personal: { address: '서울특별시 강남구' },
  summary: {
    totalExperience: '8년',
    profileStatement: '협업과 자동화 중심으로 보안 인프라를 운영했습니다.',
  },
  careers: [{ description: '팀 협업 기반으로 인프라 자동화 개선' }],
  skills: {
    cloud: {
      items: [{ name: 'Python' }, { name: 'Terraform' }, { name: 'Kubernetes' }],
    },
  },
};

describe('jobMatcherTool enhanced scoring', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('returns detailedScore with weighted categories', async () => {
    const result = await jobMatcherTool.execute({
      title: 'DevOps Engineer',
      company: 'Acme',
      requirements: 'Python, Terraform, Kubernetes, 3-5년',
      description: '협업 문화와 복지, 유연근무, 원격근무 제공',
      location: '서울특별시 강남구',
      benefits: '원격근무, 교육비 지원',
      culture: '협업과 주도성을 중시',
      experience: '3-5년',
      __readFile: async () => JSON.stringify(mockResumeData),
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.match.detailedScore);
    assert.strictEqual(typeof result.match.detailedScore.technicalSkills, 'number');
    assert.strictEqual(typeof result.match.detailedScore.experienceLevel, 'number');
    assert.strictEqual(typeof result.match.detailedScore.location, 'number');
    assert.strictEqual(typeof result.match.detailedScore.companyCulture, 'number');
    assert.strictEqual(typeof result.match.detailedScore.benefits, 'number');
    assert.strictEqual(typeof result.match.detailedScore.finalScore, 'number');
    assert.ok(Array.isArray(result.match.matched_skills));
    assert.ok(Array.isArray(result.match.recommendations));
  });

  it('caps score at 40 when required skills are completely missing', async () => {
    const result = await jobMatcherTool.execute({
      title: 'Embedded Systems Engineer',
      company: 'FactoryX',
      requirements: 'Rust, Embedded C, RTOS, FPGA',
      description: '반드시 Rust 및 FPGA 실무 경험 필요',
      location: '부산광역시 해운대구',
      experience: '10-12년',
      __readFile: async () => JSON.stringify(mockResumeData),
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.match.score <= 40);
    assert.strictEqual(result.match.detailedScore.capApplied, true);
  });

  it('parses experience expressions and keeps interface compatibility', async () => {
    const result = await jobMatcherTool.execute({
      title: 'Platform Engineer',
      company: 'RemoteCo',
      requirements: ['경력 무관', 'Python', 'Terraform'],
      description: '원격 근무 가능, 협업 문화',
      location: '제주특별자치도',
      experience: '경력 무관',
      __readFile: async () => JSON.stringify(mockResumeData),
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.match.detailedScore.experienceLevel >= 90);
    assert.strictEqual(result.match.detailedScore.location, 70);
    assert.ok(Object.hasOwn(result.match, 'matched_skills'));
    assert.ok(Object.hasOwn(result.match, 'matched_keywords'));
    assert.ok(Object.hasOwn(result.match, 'gaps'));
    assert.ok(Object.hasOwn(result.match, 'recommendations'));
  });
});
