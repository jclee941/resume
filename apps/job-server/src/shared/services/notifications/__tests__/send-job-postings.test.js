import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TelegramNotificationAdapter } from '../telegram-adapter.js';

const jobs = [
  { company: 'C1', position: 'SRE', url: 'https://x.test/1', source: 'jobkorea' },
  { company: 'C2', position: 'DevOps', url: 'https://x.test/2', source: 'saramin' },
];

describe('TelegramNotificationAdapter.sendJobPostings', () => {
  it('returns not_configured when token/chat are absent (no fetch)', async () => {
    const adapter = new TelegramNotificationAdapter({ env: {} });
    const res = await adapter.sendJobPostings(jobs);
    assert.equal(res.sent, false);
  });

  it('posts the formatted job list to the Telegram sendMessage endpoint when configured', async () => {
    const calls = [];
    const fakeFetch = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 42 } }),
        text: async () => '',
      };
    };
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      fetchImpl: fakeFetch,
    });

    const res = await adapter.sendJobPostings(jobs);

    assert.equal(res.sent, true);
    // one Telegram sendMessage call
    const send = calls.find((c) => /\/sendMessage$/.test(c.url));
    assert.ok(send, 'expected a sendMessage call');
    assert.equal(send.body.chat_id, 'C');
    assert.equal(send.body.parse_mode, 'HTML');
    // both job URLs present as anchors in the sent text
    assert.match(send.body.text, /<a href="https:\/\/x\.test\/1">/);
    assert.match(send.body.text, /<a href="https:\/\/x\.test\/2">/);
    // surfaces the Telegram message_id so callers can prove delivery
    assert.equal(res.results.telegram.messageId, 42);
  });
});

describe('TelegramNotificationAdapter.sendJobPostingsSeparately', () => {
  function makeFakeFetch() {
    const calls = [];
    const fakeFetch = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { message_id: calls.length } }),
        text: async () => '',
      };
    };
    return { calls, fakeFetch };
  }

  it('S4: sends exactly one message per short job (N jobs -> N sends)', async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      fetchImpl: fakeFetch,
    });

    const res = await adapter.sendJobPostingsSeparately(jobs);

    const sends = calls.filter((c) => /\/sendMessage$/.test(c.url));
    assert.equal(sends.length, jobs.length, 'one sendMessage per job');
    // each send carries exactly one job's anchor
    assert.match(sends[0].body.text, /<a href="https:\/\/x\.test\/1">/);
    assert.match(sends[1].body.text, /<a href="https:\/\/x\.test\/2">/);
    assert.equal(res.sent, jobs.length);
    assert.equal(res.failed, 0);
    assert.equal(res.messages, jobs.length);
  });

  it('S5: a single oversized job is length-split into multiple sends', async () => {
    const { calls, fakeFetch } = makeFakeFetch();
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      fetchImpl: fakeFetch,
    });

    // One job whose rendered message exceeds 4096 chars via a very long position.
    const bigJob = {
      company: 'BigCo',
      position: `Engineer ${'X'.repeat(6000)}`,
      url: 'https://x.test/big',
      source: 'wanted',
    };

    const res = await adapter.sendJobPostingsSeparately([bigJob, ...jobs]);

    const sends = calls.filter((c) => /\/sendMessage$/.test(c.url));
    // bigJob -> >1 send (split); plus 1 per short job
    assert.ok(sends.length > 1 + jobs.length, `expected splitting, got ${sends.length} sends`);
    // every chunk must be Telegram-safe length
    for (const s of sends) {
      assert.ok(s.body.text.length <= 4096, `chunk too long: ${s.body.text.length}`);
    }
    assert.equal(res.failed, 0);
  });

  it('returns not_configured (no sends, no throw) when token/chat absent', async () => {
    const adapter = new TelegramNotificationAdapter({ env: {} });
    const res = await adapter.sendJobPostingsSeparately(jobs);
    assert.equal(res.sent, 0);
  });
});
