import { readFileSync } from 'node:fs';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const analyzeWithClaudeMock = mock.fn(async () => 'mocked-ai-cover-letter');
globalThis.__analyzeWithClaudeMock = analyzeWithClaudeMock;

const coverLetterSource = readFileSync(
  new URL('../cover-letter-generator.js', import.meta.url),
  'utf8'
).replace(
  /import\s*\{[^}]*\}\s*from\s*['"]\.\.\/matching\/ai-matcher\.js['"]\s*;?/,
  'const { analyzeWithClaude } = { analyzeWithClaude: globalThis.__analyzeWithClaudeMock };'
);
const coverLetterEncoded = Buffer.from(coverLetterSource).toString('base64');
const { generateCoverLetter } = await import(`data:text/javascript;base64,${coverLetterEncoded}`);

const fullResume = {
  personal: { name: 'Jin Lee' },
  summary: {
    totalExperience: '5 years',
    profileStatement: 'SRE and platform engineer',
    expertise: ['cloud platform', 'automation'],
  },
  skills: {
    backend: {
      items: [{ name: 'Node.js' }, { name: 'PostgreSQL' }],
    },
    devops: {
      items: [{ name: 'Kubernetes' }, { name: 'Terraform' }],
    },
  },
};

const jobWithArrayRequirements = {
  position: 'Platform Engineer',
  company: { name: 'Acme Cloud' },
  requirements: ['Node.js experience', 'Kubernetes operations'],
  description: 'Operate platform services',
  detail: 'Own CI/CD and production reliability',
};

describe('generateCoverLetter', () => {
  beforeEach(() => {
    mock.restoreAll();
    analyzeWithClaudeMock.mock.mockImplementation(async () => 'mocked-ai-cover-letter');
  });

  it('returns AI response when analyzeFn returns non-empty output', async () => {
    const analyzeFn = mock.fn(async () => '  AI generated letter  ');

    const result = await generateCoverLetter(fullResume, jobWithArrayRequirements, { analyzeFn });

    assert.equal(result.fallback, false);
    assert.equal(result.language, 'en');
    assert.equal(result.coverLetter, 'AI generated letter');
    assert.equal(analyzeFn.mock.calls.length, 1);
    assert.equal(analyzeFn.mock.calls[0].arguments[1], '');
  });

  it('falls back to English template when analyzeFn returns empty string', async () => {
    const analyzeFn = mock.fn(async () => '   ');

    const result = await generateCoverLetter(fullResume, jobWithArrayRequirements, {
      analyzeFn,
      language: 'en',
    });

    assert.equal(result.fallback, true);
    assert.equal(result.language, 'en');
    assert.ok(result.coverLetter.includes('Dear Hiring Manager,'));
    assert.ok(
      result.coverLetter.includes('With 5 years of experience in cloud platform, automation')
    );
    assert.ok(result.coverLetter.includes('- Kubernetes'));
  });

  it('falls back to Korean template when analyzeFn returns null', async () => {
    const analyzeFn = mock.fn(async () => null);

    const result = await generateCoverLetter(fullResume, jobWithArrayRequirements, {
      analyzeFn,
      language: 'ko',
    });

    assert.equal(result.fallback, true);
    assert.equal(result.language, 'ko');
    assert.ok(result.coverLetter.includes('채용 담당자님께,'));
    assert.ok(result.coverLetter.includes('5년의 cloud platform, automation 경험'));
    assert.ok(result.coverLetter.includes('감사합니다.'));
  });

  it('builds prompt with professional style by default', async () => {
    const analyzeFn = mock.fn(async () => 'ok');

    await generateCoverLetter(fullResume, jobWithArrayRequirements, { analyzeFn });

    const prompt = analyzeFn.mock.calls[0].arguments[0];
    assert.ok(prompt.includes('Style: professional'));
    assert.ok(
      prompt.includes('Keep the tone professional, concise, and specific to business impact.')
    );
  });

  it('builds prompt with concise style and string requirement/company', async () => {
    const analyzeFn = mock.fn(async () => 'ok');
    const jobPosting = {
      title: 'Site Reliability Engineer',
      company: 'Mono Inc',
      requirements: 'Terraform and Kubernetes',
      preferred: 'Observability',
    };

    await generateCoverLetter(fullResume, jobPosting, { analyzeFn, style: 'concise' });

    const prompt = analyzeFn.mock.calls[0].arguments[0];
    assert.ok(prompt.includes('Style: concise'));
    assert.ok(prompt.includes('Keep the letter concise and direct, with short paragraphs.'));
    assert.ok(prompt.includes('Company: Mono Inc'));
    assert.ok(prompt.includes('Requirements: Terraform and Kubernetes'));
  });

  it('builds prompt with detailed style in Korean', async () => {
    const analyzeFn = mock.fn(async () => 'ok');

    await generateCoverLetter(fullResume, jobWithArrayRequirements, {
      analyzeFn,
      language: 'ko',
      style: 'detailed',
    });

    const prompt = analyzeFn.mock.calls[0].arguments[0];
    assert.ok(prompt.includes('- 언어: 한국어'));
    assert.ok(prompt.includes('- 스타일: detailed'));
    assert.ok(
      prompt.includes('Use a detailed style with concrete examples and measurable outcomes.')
    );
  });

  it('uses parsed decimal years from summary when fallback is generated', async () => {
    const analyzeFn = mock.fn(async () => '');
    const resume = {
      personal: { name: 'Kim' },
      summary: { totalExperience: '3.5', expertise: ['systems'] },
      skills: {},
    };

    const result = await generateCoverLetter(resume, jobWithArrayRequirements, { analyzeFn });

    assert.equal(result.fallback, true);
    assert.ok(result.coverLetter.includes('With 3.5 years of experience in systems'));
  });

  it('uses zero years when totalExperience is missing', async () => {
    const analyzeFn = mock.fn(async () => '');
    const resume = {
      personal: { name: 'NoExp' },
      summary: {},
      skills: {},
    };

    const result = await generateCoverLetter(resume, jobWithArrayRequirements, { analyzeFn });

    assert.ok(result.coverLetter.includes('With 0 years of experience'));
  });

  it('infers domain from skills when expertise is absent', async () => {
    const analyzeFn = mock.fn(async () => '');
    const resume = {
      personal: { name: 'Skill User' },
      summary: { totalExperience: '2 years' },
      skills: {
        group1: {
          items: [{ name: 'Go' }, { name: 'Redis' }, { name: 'Kafka' }, { name: 'Docker' }],
        },
      },
    };

    const result = await generateCoverLetter(resume, jobWithArrayRequirements, { analyzeFn });

    assert.ok(result.coverLetter.includes('in Go, Redis, Kafka'));
  });

  it('uses default domain and fallback qualification line when no skills exist', async () => {
    const analyzeFn = mock.fn(async () => '');
    const resume = {
      personal: { name: 'Default Person' },
      summary: { totalExperience: null },
      skills: {},
    };
    const jobPosting = {
      title: 'Generalist',
      company: 'Org',
      requirements: 'Communication',
      description: 'General operations',
    };

    const result = await generateCoverLetter(resume, jobPosting, { analyzeFn });

    assert.ok(result.coverLetter.includes('infrastructure and automation'));
    assert.ok(result.coverLetter.includes('- Broad hands-on experience aligned with this role'));
  });

  it('uses Korean fallback qualification line when no matched skills exist', async () => {
    const analyzeFn = mock.fn(async () => '');
    const resume = {
      personal: { name: '홍길동' },
      summary: { totalExperience: null },
      skills: {},
    };

    const result = await generateCoverLetter(
      resume,
      { title: '운영', company: '회사' },
      {
        analyzeFn,
        language: 'ko',
      }
    );

    assert.ok(result.coverLetter.includes('- 직무 연관 경험 다수 보유'));
  });

  it('builds fallback with optional-field defaults and title/company string requirement', async () => {
    const analyzeFn = mock.fn(async () => '');
    const minimalResume = {
      personal: {},
      summary: {},
      skills: {},
    };
    const minimalJob = {
      title: 'Reliability Engineer',
      company: 'String Company',
      requirements: 'Logging and alerting',
    };

    const result = await generateCoverLetter(minimalResume, minimalJob, { analyzeFn });

    assert.equal(result.fallback, true);
    assert.ok(result.coverLetter.includes('Reliability Engineer role at String Company'));
    assert.ok(result.coverLetter.includes('With 0 years of experience'));
    assert.ok(result.coverLetter.includes('Best regards,\nCandidate'));
  });

  it('uses module analyzeWithClaude when analyzeFn option is not provided', async () => {
    analyzeWithClaudeMock.mock.mockImplementation(async () => '  module default output  ');

    const result = await generateCoverLetter(fullResume, jobWithArrayRequirements);

    assert.equal(result.fallback, false);
    assert.equal(result.coverLetter, 'module default output');
    assert.equal(analyzeWithClaudeMock.mock.calls.length, 1);
    assert.equal(analyzeWithClaudeMock.mock.calls[0].arguments[1], '');
  });
});
