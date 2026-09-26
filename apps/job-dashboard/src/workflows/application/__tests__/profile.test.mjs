import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCoverLetterPrompt, getStoredResume } from '../profile.js';

const masterData = {
  skills: {
    security: { items: [{ name: 'FortiGate' }, { name: 'Splunk' }] },
    cloud: { items: [{ name: 'Cloudflare Workers' }] },
  },
  careers: [
    { company: 'Acme', role: 'Security Engineer' },
    { company: 'Beta', role: 'Infra Engineer' },
  ],
};

function ctxWithResumes(rows) {
  return {
    env: {
      JOB_DB: {
        prepare(sql) {
          assert.match(sql, /FROM resumes WHERE id = \?/);
          return { bind: (id) => ({ first: async () => rows[id] ?? null }) };
        },
      },
    },
  };
}

test('cover letter prompt uses the D1 master resume', async () => {
  const resume = await getStoredResume(
    ctxWithResumes({ master: { id: 'master', data: JSON.stringify(masterData) } })
  );

  assert.deepEqual(resume, {
    skills: 'FortiGate, Splunk, Cloudflare Workers',
    experience: 'Acme Security Engineer; Beta Infra Engineer',
  });
  const prompt = buildCoverLetterPrompt(
    {},
    { source: 'wanted', position: 'SRE', company: 'Corp' },
    resume
  );
  assert.match(prompt, /My Skills: FortiGate, Splunk, Cloudflare Workers/);
  assert.match(prompt, /My Experience: Acme Security Engineer; Beta Infra Engineer/);
});

test('cover letter prompt omits resume details when no master resume exists', async () => {
  assert.equal(await getStoredResume(ctxWithResumes({})), null);
});
