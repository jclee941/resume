import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
mapCareerToWanted,
syncWantedAbout,
syncWantedActivities,
syncWantedContactInfo,
syncWantedEducations,
} from '../wanted-sections.js';
import { syncCareerProjects, collectCareerProjects } from '../wanted-sections/career-projects.js';
import { CONFIG } from '../constants.js';
import { WANTED_ABOUT_LIMIT } from '../../../src/tools/platforms/wanted-sync-operations.js';
import { normalizePhone } from '@resume/shared/phone';
import { diffSkills, flattenSkills } from '../../skill-tag-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realSSoT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../../../../../packages/data/resumes/master/resume_data.json'),
    'utf8'
  )
);

function mockClient() {
  const calls = [];
  return {
    calls,
    updateResumeFields: async (resumeId, fields) => {
      calls.push({ resumeId, fields });
      return { ok: true };
    },
    addEducation: async (resumeId, payload) => {
      calls.push({ method: 'addEducation', resumeId, payload });
      return { ok: true };
    },
addActivity: async (resumeId, payload) => {
calls.push({ method: 'addActivity', resumeId, payload });
return { ok: true };
    },
    addProject: async (resumeId, careerId, payload) => {
      calls.push({ method: 'addProject', resumeId, careerId, payload });
      return { ok: true };
    },
    deleteProject: async (resumeId, careerId, projectId) => {
      calls.push({ method: 'deleteProject', resumeId, careerId, projectId });
      return { ok: true };
    },
  };
}

async function withApplyEnabled(fn) {
  const original = { APPLY: CONFIG.APPLY, DIFF_ONLY: CONFIG.DIFF_ONLY };
  CONFIG.APPLY = true;
  CONFIG.DIFF_ONLY = false;
  try {
    return await fn();
  } finally {
    CONFIG.APPLY = original.APPLY;
    CONFIG.DIFF_ONLY = original.DIFF_ONLY;
  }
}

describe('Wanted SSoT field mapping correctness', () => {
  it('mapCareerToWanted maps a representative real SSoT career to Wanted fields', () => {
    const career = realSSoT.careers[0];

    const mapped = mapCareerToWanted(career);

    assert.strictEqual(mapped.company.name, career.company);
    assert.strictEqual(mapped.company.type, 'CUSTOM');
    assert.strictEqual(mapped.job_role, career.role);
    assert.strictEqual(mapped.start_time, '2025-03-01');
    assert.strictEqual(mapped.end_time, '2026-02-01');
    assert.strictEqual(mapped.served, mapped.end_time === null);
    assert.strictEqual(mapped.employment_type, 'FULLTIME');
    assert.ok(
      ['number', 'string'].includes(typeof mapped.job_category_id),
      'job_category_id should be mapped to a Wanted category id or configured default'
    );
  });

  it('mapCareerToWanted treats current careers as served with null end_time', () => {
    const currentCareer = {
      ...realSSoT.careers[0],
      period: '2025.03 ~ 현재',
    };

    const mapped = mapCareerToWanted(currentCareer);

    assert.strictEqual(mapped.start_time, '2025-03-01');
    assert.strictEqual(mapped.end_time, null);
    assert.strictEqual(mapped.served, true);
  });

  it('syncWantedEducations maps school, major, and start_time from real SSoT education', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();

      await syncWantedEducations(client, realSSoT, { educations: [] }, 'resume-edu');

      assert.strictEqual(client.calls.length, 1);
      assert.strictEqual(client.calls[0].method, 'addEducation');
      assert.strictEqual(client.calls[0].payload.school_name, realSSoT.education.school);
      assert.strictEqual(client.calls[0].payload.major, realSSoT.education.major);
      assert.strictEqual(client.calls[0].payload.start_time, '2024-03-01');
    });
  });

  it('syncWantedEducations derives degree/major_type/end_time from SSoT metadata', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();

      await syncWantedEducations(client, realSSoT, { educations: [] }, 'resume-edu');

      const payload = client.calls[0].payload;
      // 4년제 → 학사; 재학중 → end_time null + is_attending true; majorType mapped.
      assert.strictEqual(payload.degree, '학사', 'degree derived from schoolType (4년제)');
      assert.strictEqual(payload.major_type, realSSoT.education.majorType, 'majorType mapped to major_type');
      assert.strictEqual(payload.end_time, null, '재학중 status yields null end_time');
      assert.strictEqual(payload.is_attending, true, '재학중 status yields is_attending true');
    });
  });

  it('syncWantedActivities maps certs (with metadata) + awards and skips preparing CKS', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();
      const expectedCerts = realSSoT.certifications.filter((c) => c.date && c.status !== '준비중');
      const expectedAwards = (realSSoT.awards || []).filter((a) => a.name);

      await syncWantedActivities(client, realSSoT, { activities: [] }, 'resume-act');

      assert.strictEqual(
        client.calls.length,
        expectedCerts.length + expectedAwards.length,
        'every dated cert AND every award is synced'
      );
      const ccnpCall = client.calls.find((call) => call.payload.title === 'CCNP');
      assert.ok(ccnpCall, 'CCNP certification should be mapped to a Wanted activity');
      assert.strictEqual(ccnpCall.payload.activity_type, 'CERTIFICATE');
      assert.strictEqual(ccnpCall.payload.start_time, '2020-08-01');
      // W-O3: credential metadata must be preserved, not dropped.
      assert.ok('credentialId' in ccnpCall.payload, 'credentialId is mapped');
      assert.ok('credentialUrl' in ccnpCall.payload, 'credentialUrl is mapped');
      assert.ok('expirationDate' in ccnpCall.payload, 'expirationDate is mapped');
      assert.ok('status' in ccnpCall.payload, 'status is mapped');
      assert.ok('note' in ccnpCall.payload, 'note is mapped');
      // Awards are synced as AWARD activities.
      if (expectedAwards.length > 0) {
        const awardCall = client.calls.find((call) => call.payload.activity_type === 'AWARD');
        assert.ok(awardCall, 'SSoT awards are synced as AWARD activities');
        assert.strictEqual(awardCall.payload.title, expectedAwards[0].name);
      }
      assert.ok(
        !client.calls.some((call) => call.payload.title === 'Certified Kubernetes Security Specialist (CKS)'),
        'CKS has null date and 준비중 status, so it should be skipped'
      );
    });
  });

  it('collectCareerProjects maps structured careers[].projects[] with tech + achievements', () => {
    const career = realSSoT.careers.find((c) => Array.isArray(c.projects) && c.projects.length > 0);
    assert.ok(career, 'real SSoT has a career with structured projects[]');
    const projects = collectCareerProjects(career);
    assert.strictEqual(projects.length, career.projects.length, 'every structured project is mapped');
    const first = projects[0];
    assert.strictEqual(first.title, career.projects[0].name, 'project name mapped to title');
    assert.ok(first.description.includes(career.projects[0].description), 'project description preserved');
    if (Array.isArray(career.projects[0].techStack) && career.projects[0].techStack.length) {
      assert.ok(first.description.includes(career.projects[0].techStack[0]), 'tech stack included');
    }
    if (Array.isArray(career.projects[0].achievements) && career.projects[0].achievements.length) {
      assert.ok(first.description.includes(career.projects[0].achievements[0]), 'achievements included');
    }
  });

  it('syncCareerProjects is non-destructive: keeps matching remote projects, adds new, deletes only stale', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();
      const career = realSSoT.careers.find((c) => Array.isArray(c.projects) && c.projects.length > 0);
      const desired = collectCareerProjects(career);
      // Remote already has the first desired project (by title) + a stale one.
      const existing = [
        { id: 'keep-1', title: desired[0].title },
        { id: 'stale-1', title: '이제 없는 프로젝트' },
      ];

      await syncCareerProjects(client, 'resume-1', 'career-1', career, existing);

      const deletes = client.calls.filter((c) => c.method === 'deleteProject');
      const adds = client.calls.filter((c) => c.method === 'addProject');
      // W-O2: must NOT delete the matching remote project (no destructive wipe).
      assert.ok(!deletes.some((d) => d.projectId === 'keep-1'), 'matching remote project kept');
      assert.ok(deletes.some((d) => d.projectId === 'stale-1'), 'stale remote project deleted');
      // The already-present project is not re-added; the rest are added.
      assert.ok(!adds.some((a) => a.payload.title === desired[0].title), 'existing project not re-added');
      assert.strictEqual(adds.length, desired.length - 1, 'only new projects are added');
    });
  });

  it('flattenSkills reads real SSoT skills and diffSkills surfaces unmapped skills explicitly', () => {
    const ssotSkills = flattenSkills(realSSoT.skills);

    assert.ok(ssotSkills.length > 0, 'flattenSkills should produce entries from real SSoT skills');
    assert.ok(ssotSkills.includes('Grafana'));

    const diff = diffSkills(ssotSkills, []);
    assert.ok(Array.isArray(diff.unmapped), 'diffSkills should return an unmapped list');
    assert.ok(diff.unmapped.length > 0, 'real SSoT unmapped skills should be surfaced, not dropped');
    assert.ok(
      diff.unmapped.includes('Elasticsearch/Kibana'),
      'expected current real unmapped skill to appear in diff.unmapped'
    );
  });

  it('syncWantedContactInfo maps email and normalized mobile from personal fields', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();

      await syncWantedContactInfo(client, realSSoT, { email: '', mobile: '' }, 'resume-contact');

      assert.strictEqual(client.calls.length, 1);
      assert.strictEqual(client.calls[0].fields.email, realSSoT.personal.email);
      assert.strictEqual(client.calls[0].fields.mobile, normalizePhone(realSSoT.personal.phone));
    });
  });

  it('syncWantedContactInfo maps SSoT profile links (linkedin/website/blog/github)', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();

      await syncWantedContactInfo(client, realSSoT, { email: '', mobile: '' }, 'resume-contact-links');

      const fields = client.calls[0].fields;
      assert.strictEqual(fields.linkedin, realSSoT.contact.linkedin, 'linkedin link mapped');
      assert.strictEqual(fields.website, realSSoT.contact.website, 'website link mapped');
      assert.strictEqual(fields.blog, realSSoT.contact.velog, 'velog mapped to blog');
      assert.ok(fields.github, 'github link mapped');
    });
  });

  it('RED: syncWantedAbout should prefer platformVariants.wanted.about when present', async () => {
    await withApplyEnabled(async () => {
      const client = mockClient();

      await syncWantedAbout(client, realSSoT, { about: '' }, 'resume-about-variant');

      assert.strictEqual(client.calls.length, 1);
      assert.strictEqual(
        client.calls[0].fields.about,
        realSSoT.platformVariants.wanted.about,
        'Wanted-specific platformVariants.wanted.about should be used instead of generic summary.profileStatement'
      );
    });
  });
});

describe('syncWantedAbout — BUG-W1 regression', () => {
  it('does NOT truncate at 150 chars (legacy buggy limit)', async () => {
    const original = { APPLY: CONFIG.APPLY, DIFF_ONLY: CONFIG.DIFF_ONLY };
    CONFIG.APPLY = true;
    CONFIG.DIFF_ONLY = false;

    try {
      const client = mockClient();
      const longBody = 'A'.repeat(500); // 500 chars — well over old 150 limit, well under 3000
      const ssot = { summary: { profileStatement: longBody } };
      const resumeDetail = { about: '' };

      await syncWantedAbout(client, ssot, resumeDetail, 'resume-123');

      assert.strictEqual(client.calls.length, 1, 'should issue one update');
      const sentAbout = client.calls[0].fields.about;
      assert.strictEqual(
        sentAbout.length,
        500,
        `expected full 500-char content sent (not truncated to 150); got length ${sentAbout.length}`
      );
      assert.strictEqual(sentAbout, longBody);
    } finally {
      CONFIG.APPLY = original.APPLY;
      CONFIG.DIFF_ONLY = original.DIFF_ONLY;
    }
  });

  it('truncates at WANTED_ABOUT_LIMIT (3000) with ellipsis when input exceeds limit', async () => {
    const original = { APPLY: CONFIG.APPLY, DIFF_ONLY: CONFIG.DIFF_ONLY };
    CONFIG.APPLY = true;
    CONFIG.DIFF_ONLY = false;

    try {
      const client = mockClient();
      const oversized = 'B'.repeat(WANTED_ABOUT_LIMIT + 500); // 3500 chars
      const ssot = { summary: { profileStatement: oversized } };
      const resumeDetail = { about: '' };

      await syncWantedAbout(client, ssot, resumeDetail, 'resume-123');

      assert.strictEqual(client.calls.length, 1);
      const sent = client.calls[0].fields.about;
      assert.strictEqual(
        sent.length,
        WANTED_ABOUT_LIMIT,
        `expected exact ${WANTED_ABOUT_LIMIT} chars`
      );
      assert.ok(sent.endsWith('...'), 'truncated text should end with ellipsis');
      assert.ok(
        sent.startsWith('B'.repeat(WANTED_ABOUT_LIMIT - 3)),
        'prefix should be original content'
      );
    } finally {
      CONFIG.APPLY = original.APPLY;
      CONFIG.DIFF_ONLY = original.DIFF_ONLY;
    }
  });

  it('skips update when ssot and remote about are equal (idempotency)', async () => {
    const original = { APPLY: CONFIG.APPLY, DIFF_ONLY: CONFIG.DIFF_ONLY };
    CONFIG.APPLY = true;
    CONFIG.DIFF_ONLY = false;

    try {
      const client = mockClient();
      const same = 'identical content';
      const ssot = { summary: { profileStatement: same } };
      const resumeDetail = { about: same };

      const result = await syncWantedAbout(client, ssot, resumeDetail, 'resume-123');

      assert.strictEqual(client.calls.length, 0, 'no API call when content matches');
      assert.strictEqual(result.changes, 0);
    } finally {
      CONFIG.APPLY = original.APPLY;
      CONFIG.DIFF_ONLY = original.DIFF_ONLY;
    }
  });
});
