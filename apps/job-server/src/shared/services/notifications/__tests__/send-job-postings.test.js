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
