const fs = require('node:fs');
const path = require('node:path');

const { validateResumeData } = require('../../../tools/scripts/utils/validate-resume-data.js');
const { generateWebData } = require('../../../tools/scripts/utils/resume-web-data-generator.js');

const masterDir = path.join(__dirname, '../../../packages/data/resumes/master');
const resume = JSON.parse(fs.readFileSync(path.join(masterDir, 'resume_data.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(masterDir, 'resume_schema.json'), 'utf8'));
const evidenceKeys = [
  'userSurface',
  'backendApi',
  'dataAsync',
  'securityReliability',
  'deliveryOperations',
  'architectureSteps',
];

let validatePortfolioData;

beforeAll(async () => {
  ({ validatePortfolioData } = await import('../../../packages/schemas/src/portfolio.js'));
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function projectById(source, id) {
  return source.personalProjects.find((project) => project.id === id);
}

function portfolioFixture(fullStackEvidence) {
  return {
    resumeDownload: { pdfUrl: '/resume.pdf', docxUrl: '/resume.docx', mdUrl: '/resume.md' },
    resume: [],
    projects: [
      {
        title: 'Project',
        tech: 'Node.js',
        description: 'Description',
        fullStackEvidence,
      },
    ],
    certifications: [],
    skills: {},
  };
}

describe('full-stack evidence schema', () => {
  test('defines the exact optional evidence shape and architecture bounds', () => {
    const evidenceSchema = schema.properties.personalProjects.items.properties.fullStackEvidence;
    expect(evidenceSchema).toMatchObject({ type: 'object', additionalProperties: false });
    expect(Object.keys(evidenceSchema.properties)).toEqual(evidenceKeys);
    for (const key of evidenceKeys.slice(0, 5)) {
      expect(evidenceSchema.properties[key]).toMatchObject({ type: 'string', minLength: 1 });
    }
    expect(evidenceSchema.properties.architectureSteps).toMatchObject({
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: { type: 'string', minLength: 1 },
    });
  });

  test.each([
    ['unknown key', { backendApi: 'API', unknownLayer: 'not supported' }],
    ['empty string', { backendApi: '' }],
    ['one architecture step', { architectureSteps: ['only'] }],
    ['seven architecture steps', { architectureSteps: ['1', '2', '3', '4', '5', '6', '7'] }],
  ])('portfolio boundary rejects %s', (_label, evidence) => {
    expect(() => validatePortfolioData(portfolioFixture(evidence))).toThrow(/projects\.0/);
  });

  test('portfolio boundary and web projection preserve supported evidence unchanged', () => {
    const evidence = {
      backendApi: 'Cloudflare Workers and Hono API',
      architectureSteps: ['client', 'edge'],
    };
    const parsed = validatePortfolioData(portfolioFixture(evidence));
    expect(parsed.projects[0].fullStackEvidence).toEqual(evidence);

    const source = {
      ...resume,
      personalProjects: [projectById(resume, 'resume-portfolio')],
    };
    expect(generateWebData(source).projects[0].fullStackEvidence).toEqual(
      source.personalProjects[0].fullStackEvidence
    );
  });

  test('canonical JSON schema rejects an unknown key, empty value, and too few steps', () => {
    const fixtures = [
      { backendApi: 'API', unknownLayer: 'not supported' },
      { backendApi: '' },
      { architectureSteps: ['only'] },
    ];
    for (const fullStackEvidence of fixtures) {
      const candidate = clone(resume);
      projectById(candidate, 'resume-portfolio').fullStackEvidence = fullStackEvidence;
      expect(validateResumeData(candidate, schema).valid).toBe(false);
    }
  });
});
