import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { splitForTelegram } from '../message-splitter.js';
import { TELEGRAM_MAX_LENGTH } from '../constants.js';

function hasDanglingTag(chunk) {
  // an unclosed '<' that never reaches a '>' before end of chunk
  const lastOpen = chunk.lastIndexOf('<');
  if (lastOpen === -1) return false;
  return chunk.indexOf('>', lastOpen) === -1;
}

function anchorBalanced(chunk) {
  const opens = (chunk.match(/<a\b[^>]*>/gi) || []).length;
  const closes = (chunk.match(/<\/a>/gi) || []).length;
  return opens === closes;
}

describe('splitForTelegram', () => {
  it('S2: returns a single unchanged chunk when text is within the limit', () => {
    const text = '🔍 <b>지원할만한 공고</b>\n\n1. <a href="https://x.com/1">A — B</a> [wanted] · 80%';
    const chunks = splitForTelegram(text);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0], text);
  });

  it('S1: splits text exceeding the limit into multiple safe chunks', () => {
    // Build a long HTML message of many anchored lines, well over 4096 chars.
    const lines = [];
    for (let i = 0; i < 400; i += 1) {
      lines.push(`${i + 1}. <a href="https://www.example.com/job/${i}">Position ${i} — Company ${i}</a> [wanted] · 7${i % 10}%`);
    }
    const text = `🔍 <b>지원할만한 공고</b>\n\n${lines.join('\n')}`;
    assert.ok(text.length > TELEGRAM_MAX_LENGTH, 'fixture must exceed the limit');

    const chunks = splitForTelegram(text);
    assert.ok(chunks.length > 1, 'must split into multiple chunks');
    for (const chunk of chunks) {
      assert.ok(chunk.length <= TELEGRAM_MAX_LENGTH, `chunk too long: ${chunk.length}`);
      assert.ok(!hasDanglingTag(chunk), 'chunk must not end inside an HTML tag');
      assert.ok(anchorBalanced(chunk), 'chunk must not split an <a>…</a> entity');
    }
  });

  it('S1b: never splits inside a single <a> entity even when one line is huge', () => {
    const huge = `<a href="https://www.example.com/huge">${'X'.repeat(TELEGRAM_MAX_LENGTH + 500)}</a>`;
    const chunks = splitForTelegram(huge);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= TELEGRAM_MAX_LENGTH, `chunk too long: ${chunk.length}`);
      assert.ok(!hasDanglingTag(chunk), 'chunk must not end inside an HTML tag');
    }
  });

  it('S1c: empty input returns an empty array', () => {
    assert.deepEqual(splitForTelegram(''), []);
    assert.deepEqual(splitForTelegram(null), []);
  });

  it('S1d: oversized escaped anchor degrades to plain text without leaking a broken entity tag', () => {
    // A single anchor whose escaped label alone exceeds the limit. After
    // strip-to-plain + hard-split, no chunk may end inside an HTML tag.
    const label = `${'R&amp;D '.repeat(900)}&lt;Ops&gt;`; // > 4096 escaped chars
    const huge = `<a href="https://x.test/huge?a=1&amp;b=2">${label}</a>`;
    const chunks = splitForTelegram(huge);
    assert.ok(chunks.length > 1, 'oversized anchor must be split');
    for (const chunk of chunks) {
      assert.ok(chunk.length <= TELEGRAM_MAX_LENGTH, `chunk too long: ${chunk.length}`);
      assert.ok(!hasDanglingTag(chunk), 'chunk must not end inside an HTML tag');
    }
  });
});
