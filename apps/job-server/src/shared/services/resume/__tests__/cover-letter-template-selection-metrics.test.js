import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplateFallback } from '../cover-letter-generator/template-selection.js';

const bannedMetricPattern =
  /\b\d+(?:[.,]\d+)?\s*(?:%|percent)\b|\b\d+\s*\+\b|\b\d+\s+(?:detection rules|server|servers)\b|가용성\s*\d|서버\s*\d+/i;

const cases = [
  {
    language: 'ko',
    title: 'Korean fallback template',
  },
  {
    language: 'en',
    title: 'English fallback template',
  },
];

describe('buildTemplateFallback metric policy', () => {
  it('rejects hardcoded quantified metrics in fallback templates', () => {
    const resumeData = {
      personal: { name: 'Jin Lee', portfolio: 'https://example.com' },
      summary: { totalExperience: '5 years' },
      skills: {},
    };
    const jobPosting = {
      title: 'Platform Engineer',
      company: { name: 'Acme Cloud' },
      requirements: 'Cloudflare Workers',
    };

    const matches = cases.flatMap(({ language, title }) => {
      const template = buildTemplateFallback(resumeData, jobPosting, { language });
      const match = template.match(bannedMetricPattern);
      return match ? [`${title}: ${match[0]}`] : [];
    });

    assert.equal(
      matches.length,
      0,
      `fallback templates must not contain banned quantified metrics; found ${matches.join(', ')}`
    );
  });
});
