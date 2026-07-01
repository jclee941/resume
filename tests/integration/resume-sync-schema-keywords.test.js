const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(ROOT, 'packages/data/resumes/master/resume_schema.json');
const RESUME_PATHS = [
  'packages/data/resumes/master/resume_data.json',
  'packages/data/resumes/master/resume_data_en.json',
  'packages/data/resumes/master/resume_data_ja.json',
].map((relativePath) => path.join(ROOT, relativePath));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function schemaProperties(section) {
  return readJson(SCHEMA_PATH).properties[section].items.properties;
}

function hasType(schema, type) {
  const actual = schema.type;
  return Array.isArray(actual) ? actual.includes(type) : actual === type;
}

describe('Resume schema live-field contract', () => {
  test('defines live career extension fields used by resume data', () => {
    const careerProperties = schemaProperties('careers');

    expect(careerProperties.companyUrl).toMatchObject({ format: 'uri' });
    expect(hasType(careerProperties.companyUrl, 'string')).toBe(true);
    expect(hasType(careerProperties.companyUrl, 'null')).toBe(true);
    expect(hasType(careerProperties.continuousEngagement, 'string')).toBe(true);
    expect(hasType(careerProperties.continuousEngagement, 'boolean')).toBe(true);
    expect(careerProperties.jobkoreaJobCode).toMatchObject({ type: 'string' });
  });

  test('defines JobKorea platform default job code used by resume data', () => {
    const jobkoreaProperties = readJson(SCHEMA_PATH).properties.platformVariants.properties.jobkorea.properties;

    expect(jobkoreaProperties.defaultJobCode).toMatchObject({ type: 'string' });
  });

  test('defines live personal project extension fields used by resume data', () => {
    const projectProperties = schemaProperties('personalProjects');

    for (const key of ['url', 'githubUrl', 'demoUrl']) {
      expect(projectProperties[key]).toMatchObject({ format: 'uri' });
      expect(hasType(projectProperties[key], 'string')).toBe(true);
      expect(hasType(projectProperties[key], 'null')).toBe(true);
    }
    expect(projectProperties.dashboards).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'url'],
      },
    });
    expect(projectProperties.dashboards.items.properties.url).toMatchObject({ format: 'uri' });
    expect(projectProperties.language).toMatchObject({ type: 'string' });
    expect(projectProperties.highlights).toMatchObject({
      type: 'array',
      items: { type: 'string' },
    });
    expect(projectProperties.featured).toMatchObject({ type: 'boolean' });
    expect(projectProperties.displayOrder).toMatchObject({ type: 'integer' });
  });

  test('defines live certification and language extension fields used by resume data', () => {
    const certificationProperties = schemaProperties('certifications');
    const languageProperties = schemaProperties('languages');

    expect(certificationProperties.credentialId).toMatchObject({
      type: ['string', 'null'],
    });
    expect(certificationProperties.note).toMatchObject({
      type: ['string', 'null'],
    });
    expect(languageProperties.note).toMatchObject({
      type: 'string',
    });
  });

  test('covers live KO/EN/JA fields without fixture-only assumptions', () => {
    const schema = readJson(SCHEMA_PATH);
    const careerProperties = schema.properties.careers.items.properties;
    const projectProperties = schema.properties.personalProjects.items.properties;
    const certificationProperties = schema.properties.certifications.items.properties;
    const languageProperties = schema.properties.languages.items.properties;

    for (const resumePath of RESUME_PATHS) {
      const resume = readJson(resumePath);
      for (const career of resume.careers) {
        for (const key of ['companyUrl', 'continuousEngagement', 'jobkoreaJobCode']) {
          if (Object.hasOwn(career, key)) {
            expect(careerProperties).toHaveProperty(key);
          }
        }
      }
      for (const project of resume.personalProjects) {
        for (const key of [
          'url',
          'githubUrl',
          'demoUrl',
          'dashboards',
          'language',
          'highlights',
          'featured',
          'displayOrder',
        ]) {
          if (Object.hasOwn(project, key)) {
            expect(projectProperties).toHaveProperty(key);
          }
        }
      }
      for (const certification of resume.certifications) {
        for (const key of ['credentialId', 'note']) {
          if (Object.hasOwn(certification, key)) {
            expect(certificationProperties).toHaveProperty(key);
          }
        }
      }
      for (const language of resume.languages) {
        if (Object.hasOwn(language, 'note')) {
          expect(languageProperties).toHaveProperty('note');
        }
      }
    }
  });
});
