const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { generateWebData } = require('../resume-web-data-generator.js');

const SSOT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'data',
  'resumes',
  'master',
  'resume_data.json'
);
const ssot = require(SSOT_PATH);

describe('generateWebData → careers[] (SSoT timeline data)', () => {
  it('S1: emits a top-level careers[] with one entry per SSoT career', () => {
    const out = generateWebData(ssot);
    assert.ok(Array.isArray(out.careers), 'careers must be an array');
    assert.equal(out.careers.length, ssot.careers.length, 'careers length must match SSoT');
  });

  it('S1: each career preserves SSoT data fields verbatim (no drift)', () => {
    const out = generateWebData(ssot);
    out.careers.forEach((career, i) => {
      const src = ssot.careers[i];
      assert.equal(career.company, src.company, `careers[${i}].company`);
      assert.equal(career.companyUrl, src.companyUrl, `careers[${i}].companyUrl`);
      assert.equal(career.period, src.period, `careers[${i}].period`);
      assert.equal(career.role, src.role, `careers[${i}].role`);
      assert.equal(career.myRole, src.myRole, `careers[${i}].myRole`);
      assert.equal(career.description, src.description, `careers[${i}].description`);
    });
  });

  it('S2: drift guard — first career role + segmented company URLs match live SSoT', () => {
    const out = generateWebData(ssot);
    assert.equal(out.careers[0].role, ssot.careers[0].role);
    assert.match(out.careers[0].role, /SOC/);
    [3, 4, 5].forEach((i) => {
      if (ssot.careers[i] && ssot.careers[i].companyUrl) {
        assert.equal(out.careers[i].companyUrl, ssot.careers[i].companyUrl);
        assert.ok(
          /^https?:\/\//.test(out.careers[i].companyUrl),
          `careers[${i}].companyUrl must be a real URL`
        );
      }
    });
  });

  it('S3: edge — empty careers[] produces careers:[] without throwing', () => {
    const out = generateWebData({ ...ssot, careers: [] });
    assert.ok(Array.isArray(out.careers));
    assert.equal(out.careers.length, 0);
  });

  it('S4: derives achievements[] from SSoT career.projects[].achievements (no drift)', () => {
    const out = generateWebData(ssot);
    out.careers.forEach((career, i) => {
      const expected = (ssot.careers[i].projects || [])
        .flatMap((p) => p.achievements || [])
        .filter((a) => typeof a === 'string' && a.length > 0);
      assert.deepEqual(career.achievements, expected, `careers[${i}].achievements`);
    });
    // First career must carry real achievement bullets (the timeline Impact source).
    assert.ok(out.careers[0].achievements.length > 0, 'first career has achievements');
  });

  it('S4: career with no projects yields achievements:[] (no throw)', () => {
    const src = {
      ...ssot,
      careers: [{ company: 'X', period: 'p', role: 'r', myRole: 'm', description: 'd' }],
    };
    const out = generateWebData(src);
    assert.deepEqual(out.careers[0].achievements, []);
  });

  it('does not regress the existing resume[] card output', () => {
    const out = generateWebData(ssot);
    assert.ok(Array.isArray(out.resume), 'resume[] still present');
    assert.equal(out.resume.length, ssot.careers.length);
    assert.equal(out.resume[0].title, ssot.careers[0].company);
  });
});

describe('generateWebData → coverLetter (unsurfaced SSoT asset)', () => {
  it('S1: propagates SSoT coverLetter verbatim (ko/en/ja parity, no drift)', () => {
    const out = generateWebData(ssot);
    assert.ok(ssot.coverLetter, 'SSoT must define coverLetter (test precondition)');
    assert.deepEqual(
      out.coverLetter,
      ssot.coverLetter,
      'out.coverLetter must equal SSoT coverLetter verbatim'
    );
  });

  it('S1: coverLetter carries all three locales each with headline/paragraphs/closing', () => {
    const out = generateWebData(ssot);
    ['ko', 'en', 'ja'].forEach((lang) => {
      const cl = out.coverLetter && out.coverLetter[lang];
      assert.ok(cl, `coverLetter.${lang} must be present`);
      assert.equal(typeof cl.headline, 'string', `coverLetter.${lang}.headline is string`);
      assert.ok(cl.headline.length > 0, `coverLetter.${lang}.headline non-empty`);
      assert.ok(
        Array.isArray(cl.paragraphs) && cl.paragraphs.length > 0,
        `coverLetter.${lang}.paragraphs non-empty array`
      );
      assert.equal(typeof cl.closing, 'string', `coverLetter.${lang}.closing is string`);
    });
  });

  it('S5: edge — source without coverLetter yields coverLetter:null (no throw)', () => {
    const { coverLetter: _omit, ...noCl } = ssot;
    const out = generateWebData(noCl);
    assert.equal(out.coverLetter, null);
  });
});

describe('generateWebData → resume[].stats (the ACTUAL static-card render path)', () => {
  // data-processor.js builds EN/JA static cards from projectDataEn.resume[] /
  // projectDataJa.resume[] (the `resume` array of each per-language data_*.json),
  // NOT from resumeEn[]. So `resume[].stats` is what reaches the rendered
  // <span class="tag"> badges. It must be populated regardless of the source
  // language's company names.
  it('S2: resume[].stats populated for KO source (Korean company names)', () => {
    const out = generateWebData(ssot, 'ko');
    const populated = out.resume.filter((r) => Array.isArray(r.stats) && r.stats.length > 0);
    assert.equal(populated.length, out.resume.length, 'every KO resume entry has stats');
  });

  it('S2b: resume[].stats populated for EN source (English company names)', () => {
    const enSource = {
      ...ssot,
      careers: ssot.careers.map((c, i) => ({
        ...c,
        company: ['ITCEN CTS Co., Ltd.', 'Gaonnuri Information System Co., Ltd.',
          'Quantec Investment Management', 'Jointree Co., Ltd.',
          'Metanet M Platform Co., Ltd.', 'MTData Co., Ltd.'][i] || `Company ${i}`,
      })),
    };
    const out = generateWebData(enSource, 'en');
    const populated = out.resume.filter((r) => Array.isArray(r.stats) && r.stats.length > 0);
    assert.equal(
      populated.length,
      out.resume.length,
      'every EN resume entry must have non-empty stats regardless of company language'
    );
    assert.ok(
      out.resume[0].stats.includes('Splunk ES'),
      'EN resume[0] stats reflect the actual role (Splunk ES detection/response), in English'
    );
  });
});
