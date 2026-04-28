import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  resumeSchema,
  resumePersonalSchema,
  resumeCareerSchema,
  resumeProjectSchema,
  resumeCertificationSchema,
  resumeSkillItemSchema,
  resumeSkillCategorySchema,
  resumeProfileSchema,
  resumeSkillSchema,
} from '../resume.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSOT_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'resumes',
  'master',
  'resume_data.json'
);

const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));

describe('resume.js — API-boundary Zod schemas (audit Issue B resolution)', () => {
  describe('field name parity with SSoT', () => {
    it('resumePersonalSchema accepts SSoT personal block', () => {
      const result = resumePersonalSchema.safeParse(ssot.personal);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('resumeCareerSchema accepts SSoT careers[0] (period-string format)', () => {
      const result = resumeCareerSchema.safeParse(ssot.careers[0]);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('resumeCareerSchema accepts "현재" / "Present" / "現在" terminators', () => {
      for (const end of ['현재', 'Present', '現在']) {
        const result = resumeCareerSchema.safeParse({
          company: 'Test',
          period: `2024.01 ~ ${end}`,
        });
        assert.equal(result.success, true, `should accept ${end}`);
      }
    });

    it('resumeCareerSchema rejects malformed period', () => {
      const result = resumeCareerSchema.safeParse({
        company: 'Test',
        period: 'not a period',
      });
      assert.equal(result.success, false);
    });

    it('resumeProjectSchema accepts SSoT projects[0] (technologies, not techStack)', () => {
      const result = resumeProjectSchema.safeParse(ssot.projects[0]);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('resumeCertificationSchema accepts SSoT certs (date, not issueDate)', () => {
      const result = resumeCertificationSchema.safeParse(ssot.certifications[0]);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('resumeCertificationSchema accepts null expirationDate', () => {
      const result = resumeCertificationSchema.safeParse({
        name: 'Test',
        issuer: 'Org',
        date: '2024.01',
        expirationDate: null,
      });
      assert.equal(result.success, true);
    });

    it('resumeSkillItemSchema accepts SSoT skill items', () => {
      const item = ssot.skills.observability.items[0];
      const result = resumeSkillItemSchema.safeParse(item);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('resumeSkillCategorySchema accepts SSoT skills.observability', () => {
      const result = resumeSkillCategorySchema.safeParse(ssot.skills.observability);
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });
  });

  describe('resumeSchema (top-level slice)', () => {
    it('accepts a minimal valid slice (personal + careers only)', () => {
      const result = resumeSchema.safeParse({
        personal: ssot.personal,
        careers: ssot.careers,
      });
      assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    });

    it('uses SSoT key names (personal not profile, education not educations)', () => {
      // Old field names should fail
      const oldShape = resumeSchema.safeParse({
        profile: ssot.personal,
        careers: [],
        educations: [],
      });
      assert.equal(oldShape.success, false);
    });
  });

  describe('backward-compat aliases', () => {
    it('resumeProfileSchema is an alias for resumePersonalSchema', () => {
      assert.equal(resumeProfileSchema, resumePersonalSchema);
    });

    it('resumeSkillSchema is an alias for resumeSkillItemSchema', () => {
      assert.equal(resumeSkillSchema, resumeSkillItemSchema);
    });
  });
});
