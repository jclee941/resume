import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import getJobDetailTool from '../get-job-detail.js';
import jobMatcherTool from '../job-matcher.js';
import { coverLetterTool } from '../cover-letter.js';
import { generateCoverLetter } from '../../shared/services/resume/cover-letter-generator.js';

const mockResumeData = {
  personal: { name: '홍길동', address: '서울특별시 강남구' },
  summary: {
    totalExperience: '8년',
    profileStatement: '보안 인프라와 자동화 중심의 경력',
    expertise: ['보안 인프라', '자동화'],
  },
  skills: {
    automation: {
      items: [{ name: 'Python' }, { name: 'Terraform' }, { name: 'Kubernetes' }],
    },
  },
  careers: [{ description: '협업 기반 인프라 자동화 프로젝트 수행' }],
};

const mockJob = {
  id: 123,
  position: 'DevOps Engineer',
  company: { name: 'Acme' },
  requirements: 'Python, Terraform, CI/CD',
  detail: '클라우드 인프라 자동화 및 운영',
  preferred: '협업 경험',
  benefits: '유연근무, 원격근무',
  intro: '자율적이고 협업 중심 문화',
  location: '서울특별시 강남구',
};

describe('cover letter generation', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('uses Claude-generated content when available', async () => {
    const result = await generateCoverLetter(mockResumeData, mockJob, {
      language: 'en',
      style: 'professional',
      analyzeFn: async () => 'AI generated cover letter',
    });

    assert.strictEqual(result.fallback, false);
    assert.strictEqual(result.language, 'en');
    assert.strictEqual(result.coverLetter, 'AI generated cover letter');
  });

  it('falls back to template when Claude is unavailable', async () => {
    const result = await generateCoverLetter(mockResumeData, mockJob, {
      language: 'en',
      style: 'professional',
      analyzeFn: async () => null,
    });

    assert.strictEqual(result.fallback, true);
    assert.match(result.coverLetter, /Dear Hiring Manager,/);
    assert.match(result.coverLetter, /DevOps Engineer/);
    assert.match(result.coverLetter, /Acme/);
  });

  it('wanted_cover_letter tool returns cover letter and match score', async () => {
    const getJobDetailMock = mock.method(getJobDetailTool, 'execute', async () => ({
      success: true,
      job: mockJob,
    }));
    mock.method(jobMatcherTool, 'execute', async () => ({
      success: true,
      match: { score: 87 },
    }));

    const result = await coverLetterTool.execute({
      job_id: 123,
      language: 'ko',
      style: 'concise',
      __readFile: async () => JSON.stringify(mockResumeData),
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.matchScore, 87);
    assert.match(result.coverLetter, /DevOps Engineer|Acme|채용 담당자님께,/);
    assert.strictEqual(getJobDetailMock.mock.calls[0].arguments[0].job_id, 123);
  });

  it('returns failure when job detail fetch fails', async () => {
    mock.method(getJobDetailTool, 'execute', async () => ({
      success: false,
      error: 'job not found',
    }));

    const result = await coverLetterTool.execute({ job_id: 999 });

    assert.deepStrictEqual(result, {
      success: false,
      error: 'Failed to fetch job detail: job not found',
    });
  });

  it('defines wanted_cover_letter schema with required job_id', () => {
    assert.strictEqual(coverLetterTool.name, 'wanted_cover_letter');
    assert.deepStrictEqual(coverLetterTool.inputSchema.required, ['job_id']);
    assert.strictEqual(coverLetterTool.inputSchema.properties.job_id.type, 'number');
  });
});
