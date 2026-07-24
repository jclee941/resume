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

  it('R2: counts a job as failed when Telegram chunk fails even if automation webhook fallback succeeds', async () => {
    // Telegram endpoint always 500s; automation webhook succeeds. notify() would report
    // partial-success, but per-job success must be judged by TELEGRAM delivery only.
    const fakeFetch = async (url) => {
      if (/\/sendMessage$/.test(url)) {
        return { ok: false, status: 500, json: async () => ({}), text: async () => 'tg down' };
      }
      // automation webhook
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' };
    };
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      automationWebhookUrl: 'https://automation.test/webhook/x',
      fetchImpl: fakeFetch,
    });
    const res = await adapter.sendJobPostingsSeparately([jobs[0]]);
    assert.equal(res.sent, 0, 'telegram failed -> not counted as sent');
    assert.equal(res.failed, 1, 'job must be counted failed');
  });

  it('R4: stops sending remaining chunks of a job after the first chunk fails', async () => {
    let sendCount = 0;
    const fakeFetch = async (url) => {
      if (/\/sendMessage$/.test(url)) {
        sendCount += 1;
        // first chunk fails
        if (sendCount === 1) {
          return { ok: false, status: 400, json: async () => ({}), text: async () => 'bad' };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: { message_id: sendCount } }),
          text: async () => '',
        };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' };
    };
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      fetchImpl: fakeFetch,
    });
    // one oversized job that would split into multiple chunks
    const bigJob = {
      company: 'BigCo',
      position: `E ${'X'.repeat(9000)}`,
      url: 'https://x.test/big',
      source: 'wanted',
    };
    const res = await adapter.sendJobPostingsSeparately([bigJob]);
    assert.equal(res.failed, 1);
    // must NOT attempt the remaining chunks after the first failure
    assert.equal(sendCount, 1, `expected to stop after first failed chunk, attempted ${sendCount}`);
  });

  it('R3: waits and retries a rate-limited chunk instead of dropping it', async () => {
    let attempts = 0;
    const firstRateLimited = true;
    const fakeFetch = async (url) => {
      if (/\/sendMessage$/.test(url)) {
        attempts += 1;
        // First attempt: simulate the local rate-limit window being full by
        // pre-filling rateState before the call (see adapter wiring below).
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, result: { message_id: attempts } }),
          text: async () => '',
        };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' };
    };
    let slept = 0;
    // Shared rate-state object: the adapter reads/writes it, and the simulated
    // sleep "advances time" by clearing the saturated window on the same object.
    const rateState = { windowStartedAt: Date.now(), count: 20 };
    const sleepImpl = async () => {
      slept += 1;
      rateState.windowStartedAt = 0;
      rateState.count = 0;
    };
    const adapter = new TelegramNotificationAdapter({
      telegramToken: 'T',
      telegramChatId: 'C',
      fetchImpl: fakeFetch,
      sleepImpl,
    });
    // Force the rate limiter to report 'allowed: false' on the FIRST chunk by
    // saturating the in-memory window (resets on the simulated next window).
    adapter.rateState = rateState;

    const res = await adapter.sendJobPostingsSeparately([jobs[0]]);

    assert.ok(firstRateLimited);
    // It must have waited (slept) at least once for the rate-limit reset …
    assert.ok(slept >= 1, 'expected a wait on rate-limit before retry');
    // … and ultimately delivered the job (not silently dropped).
    assert.equal(res.sent, 1, 'rate-limited chunk must be retried and sent');
    assert.equal(res.failed, 0);
  });
});
