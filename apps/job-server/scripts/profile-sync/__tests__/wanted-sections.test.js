import { describe, it } from 'node:test';
import assert from 'node:assert';
import { syncWantedAbout } from '../wanted-sections.js';
import { CONFIG } from '../constants.js';
import { WANTED_ABOUT_LIMIT } from '../../../src/tools/platforms/wanted-sync-operations.js';

function mockClient() {
  const calls = [];
  return {
    calls,
    updateResumeFields: async (resumeId, fields) => {
      calls.push({ resumeId, fields });
      return { ok: true };
    },
  };
}

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
      assert.strictEqual(sent.length, WANTED_ABOUT_LIMIT, `expected exact ${WANTED_ABOUT_LIMIT} chars`);
      assert.ok(sent.endsWith('...'), 'truncated text should end with ellipsis');
      assert.ok(sent.startsWith('B'.repeat(WANTED_ABOUT_LIMIT - 3)), 'prefix should be original content');
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
