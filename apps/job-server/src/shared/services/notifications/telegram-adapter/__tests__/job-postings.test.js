import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createJobPostingsMessage } from '../formatters.js';
import { TELEGRAM_MAX_LENGTH } from '../constants.js';

const jobs = [
  {
    company: '㈜유니포인트',
    position: '네트워크보안 엔지니어',
    url: 'https://www.jobkorea.co.kr/Recruit/GI_Read/1',
    source: 'jobkorea',
    matchScore: 47,
  },
  {
    company: '(주)널리소프트',
    position: '인프라 엔지니어 (Senior SRE)',
    url: 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=2',
    source: 'saramin',
  },
];

describe('createJobPostingsMessage', () => {
  it('returns an HTML message with a clickable URL per job', () => {
    const msg = createJobPostingsMessage(jobs);
    assert.equal(msg.parse_mode, 'HTML');
    // each job rendered as an anchor to its URL
    assert.match(msg.text, /<a href="https:\/\/www\.jobkorea\.co\.kr\/Recruit\/GI_Read\/1">/);
    assert.match(msg.text, /<a href="https:\/\/www\.saramin\.co\.kr\/zf_user\/jobs\/relay\/view\?rec_idx=2">/);
    // company + position appear
    assert.match(msg.text, /유니포인트/);
    assert.match(msg.text, /인프라 엔지니어/);
  });

  it('includes a header with the count of postings', () => {
    const msg = createJobPostingsMessage(jobs);
    assert.match(msg.text, /2\uac74|2 jobs|2건/);
    assert.match(msg.text, /\uacf5\uace0|Job|\ucc44\uc6a9/);
  });

  it('handles an empty list without crashing', () => {
    const msg = createJobPostingsMessage([]);
    assert.equal(msg.parse_mode, 'HTML');
    assert.match(msg.text, /\uc5c6|0|None|no/i);
  });

  it('escapes HTML special chars in company/position to prevent breakage', () => {
    const msg = createJobPostingsMessage([
      { company: 'A & B <Corp>', position: 'Dev <ops>', url: 'https://x.test/1', source: 'jobkorea' },
    ]);
    assert.match(msg.text, /A &amp; B &lt;Corp&gt;/);
    assert.match(msg.text, /Dev &lt;ops&gt;/);
    // the URL itself stays usable inside href
    assert.match(msg.text, /<a href="https:\/\/x\.test\/1">/);
  });

  it('limits the number of rendered jobs and notes the remainder', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      company: `C${i}`,
      position: `P${i}`,
      url: `https://x.test/${i}`,
      source: 'jobkorea',
    }));
    const msg = createJobPostingsMessage(many, { limit: 10 });
    const anchorCount = (msg.text.match(/<a href=/g) || []).length;
    assert.equal(anchorCount, 10);
    assert.match(msg.text, /15|\uc678|more|\ub354/);
  });

  it('keeps long messages Telegram-safe and never splits an HTML tag', () => {
    // Reproduces the limit>=15 failure: many postings with long real-world
    // saramin URLs previously overflowed TELEGRAM_MAX_LENGTH and got sliced
    // mid-<a> tag, triggering Telegram 400 'can't parse entities'.
    const longUrl = (i) =>
      `https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=search&rec_idx=5390${i}878&location=ts&searchword=%EB%B3%B4%EC%95%88+%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4&searchType=search&paid_fl=n&search_uuid=153c1b3d-2ec2-4ceb-80fc-385ab4c9373e`;
    const many = Array.from({ length: 50 }, (_, i) => ({
      company: `주식회사 테스트기업${i} (보안·인프라)`,
      position: `[2026 하반기] IT 보안 엔지니어 모집 (신입/경력) #${i}`,
      url: longUrl(i),
      source: 'saramin',
      matchScore: 70 + (i % 20),
    }));

    const msg = createJobPostingsMessage(many, { limit: 15 });

    // Hard length cap respected (no oversized body sent to Telegram).
    assert.ok(
      msg.text.length <= TELEGRAM_MAX_LENGTH,
      `message length ${msg.text.length} exceeds ${TELEGRAM_MAX_LENGTH}`
    );

    // Tags stay balanced: every <a ...> has a closing </a>, no dangling tag.
    const open = (msg.text.match(/<a\s/g) || []).length;
    const close = (msg.text.match(/<\/a>/g) || []).length;
    assert.equal(open, close, 'unbalanced <a> tags would break Telegram HTML parse');

    // No truncation marker splitting a tag, and message does not end mid-tag.
    assert.doesNotMatch(msg.text, /<a[^>]*$/, 'message must not end inside an <a> tag');

    // Still communicates that more postings exist beyond what was rendered.
    assert.match(msg.text, /외|more|더/);
  });
});
