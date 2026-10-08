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
const EN_SSOT_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packages',
  'data',
  'resumes',
  'master',
  'resume_data_en.json'
);
const ssot = require(SSOT_PATH);
const enSsot = require(EN_SSOT_PATH);

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
    assert.ok(out.careers[0].role.length > 0, 'first career role is non-empty');
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
    // The timeline Impact source must carry real achievement bullets for at least one career;
    // the newest career may have no detailed sub-projects yet.
    assert.ok(
      out.careers.some((career) => career.achievements.length > 0),
      'a career has achievements'
    );
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

describe('generateWebData → platformVariants (job platform sync metadata)', () => {
  it('propagates SSoT platformVariants verbatim so JobKorea defaults do not drift', () => {
    const out = generateWebData(ssot);

    assert.deepEqual(out.platformVariants, ssot.platformVariants);
    assert.equal(
      out.platformVariants.jobkorea.defaultJobCode,
      ssot.platformVariants.jobkorea.defaultJobCode
    );
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
        company: enSsot.careers[i] ? enSsot.careers[i].company : `Company ${i}`,
      })),
    };
    const out = generateWebData(enSource, 'en');
    const populated = out.resume.filter((r) => Array.isArray(r.stats) && r.stats.length > 0);
    assert.equal(
      populated.length,
      out.resume.length,
      'every EN resume entry must have non-empty stats regardless of company language'
    );
    out.resume.forEach((card, i) => {
      assert.deepEqual(
        card.stats,
        generateWebData(enSsot, 'en').resume[i].stats,
        `EN resume[${i}] stats follow the career, not the source language`
      );
    });
  });

  it('S2c: stats arrays are isolated across generator calls', () => {
    const first = generateWebData(ssot, 'ko');
    first.resume[0].stats.push('mutated');
    first.resumeEn[0].stats.push('mutated-en');

    const second = generateWebData(ssot, 'ko');
    assert.ok(!second.resume[0].stats.includes('mutated'));
    assert.ok(!second.resumeEn[0].stats.includes('mutated-en'));
  });

  it('S2d: every locale emits stats per career card and the English fallback stays English', () => {
    for (const lang of ['ko', 'en', 'ja']) {
      const out = generateWebData(ssot, lang);
      assert.equal(out.resume.length, ssot.careers.length, `${lang} resume[] length`);
      out.resume.forEach((card, i) => {
        assert.ok(
          Array.isArray(card.stats) && card.stats.length > 0,
          `${lang} resume[${i}] has stats`
        );
        card.stats.forEach((stat) => assert.ok(typeof stat === 'string' && stat.length > 0));
      });
    }
    generateWebData(ssot, 'en').resume.forEach((card, i) => {
      card.stats.forEach((stat) => assert.match(stat, /^[\x20-\x7E]+$/, `en resume[${i}] stat`));
    });
    generateWebData(ssot, 'ko').resumeEn.forEach((card, i) => {
      assert.match(card.description, /^[\x20-\x7E]+$/, `resumeEn[${i}] fallback is English`);
    });
    generateWebData(enSsot, 'en').resume.forEach((card, i) => {
      assert.equal(card.description, enSsot.careers[i].description, `en resume[${i}]`);
    });
  });

  it('S2e: actual English locale cards use concrete copy, not the generic fallback', () => {
    const out = generateWebData(enSsot, 'en');

    out.resume.forEach((card, i) => {
      assert.equal(card.description, enSsot.careers[i].description, `resume[${i}] description`);
      assert.ok(Array.isArray(card.stats) && card.stats.length > 0, `resume[${i}] stats`);
      assert.doesNotMatch(card.description, /via automation|Automated security operations/i);
    });
  });
});
