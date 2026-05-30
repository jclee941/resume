import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createJobPostingsMessage } from '../formatters.js';

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
});
