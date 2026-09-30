import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { guard } from '../guard.mjs';
import { makeRoot, put } from './helpers.mjs';

const REALISTIC = ['010', '2345', '6789'].join('-');
const FAKE = '010-1234-5678';
const PHONE = ['010', '9876', '5432'].join('-');
const KAKAO = `someone@${'kakao'}.com`;

function repo() {
  const root = makeRoot();
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}
const stage = (root, ...paths) => execFileSync('git', ['add', '-f', ...paths], { cwd: root });
async function scan(root, options = {}) {
  const lines = [];
  const hits = await guard({ root, out: (l) => lines.push(l), ...options });
  return { hits, text: lines.join('\n') };
}

test('a staged pack path fails the guard', async () => {
  const root = repo();
  put(root, 'applications/a/cover.md', 'harmless');
  stage(root, 'applications/a/cover.md');
  const { hits, text } = await scan(root);
  assert.deepEqual(hits.get('applications/a/cover.md'), { 'pack-path': 1 });
  assert.match(text, /1 flagged files/);
});

test('a fake number passes and a realistic mobile number fails', async () => {
  const root = repo();
  put(root, 'notes/fake.md', `call ${FAKE} or 010-0000-0000`);
  stage(root, 'notes/fake.md');
  assert.equal((await scan(root)).hits.size, 0);
  put(root, 'notes/real.md', `call ${REALISTIC}`);
  stage(root, 'notes/real.md');
  const { hits, text } = await scan(root, { report: true });
  assert.deepEqual([...hits.keys()], ['notes/real.md']);
  assert.match(text, /notes\/real\.md: mobile-number=1/);
  assert.ok(!text.includes('2345'));
});

test('the personal kakao mail domain fails', async () => {
  const root = repo();
  put(root, 'notes/mail.md', `mail ${KAKAO}`);
  stage(root, 'notes/mail.md');
  const { hits, text } = await scan(root);
  assert.deepEqual(hits.get('notes/mail.md'), { 'kakao-email': 1 });
  assert.ok(!text.includes('someone'));
});

test('anything under tests/fixtures/content-pack is exempt', async () => {
  const root = repo();
  put(root, 'tests/fixtures/content-pack/applications/a/cover.md', `${REALISTIC} ${KAKAO}`);
  stage(root, 'tests/fixtures');
  assert.equal((await scan(root)).hits.size, 0);
});

test('a staged deletion of a pack path is not a violation', async () => {
  const root = repo();
  put(root, 'applications/a/cover.md', 'x');
  stage(root, 'applications/a/cover.md');
  execFileSync('git', ['-c', 'user.email=t@t.test', '-c', 'user.name=t', 'commit', '-qm', 'seed'], {
    cwd: root,
  });
  execFileSync('git', ['rm', '-q', 'applications/a/cover.md'], { cwd: root });
  assert.equal((await scan(root)).hits.size, 0);
  assert.equal((await scan(root, { mode: 'tracked' })).hits.size, 0);
});

test('materialized master identifiers are flagged by kind without printing values', async () => {
  const root = repo();
  const master = 'packages/data/resumes/master';
  put(
    root,
    `${master}/resume_data.json`,
    JSON.stringify({
      personal: {
        name: 'Fixture Person',
        email: 'fixture.person@example.test',
        phone: PHONE,
      },
      careers: [{ company: 'Acme Robotics Ltd' }, { company: 'Ab' }],
      education: { school: 'Example Institute' },
    })
  );
  put(
    root,
    `${master}/resume_data_ja.json`,
    JSON.stringify({ personal: { name: 'Fixture Person JA' } })
  );
  put(
    root,
    'docs/a.md',
    'Fixture Person worked at Acme Robotics Ltd, then Ab, studied at Example Institute; fixture.person@example.test; Fixture Person JA'
  );
  put(root, 'tests/fixtures/content-pack/docs/b.md', 'Fixture Person');
  stage(root, 'docs/a.md', 'tests/fixtures');
  const { hits, text } = await scan(root, { report: true });
  assert.deepEqual(hits.get('docs/a.md'), { name: 3, email: 1, employer: 1, school: 1 });
  assert.equal(hits.size, 1);
  for (const value of ['Fixture', 'Acme', 'Institute', 'example.test'])
    assert.ok(!text.includes(value));
});

test('identifiers are skipped when the pack is not materialized', async () => {
  const root = repo();
  put(root, 'docs/a.md', 'Fixture Person');
  stage(root, 'docs/a.md');
  assert.equal((await scan(root)).hits.size, 0);
});

test('tracked mode scans every tracked file', async () => {
  const root = repo();
  put(root, 'notes/real.md', REALISTIC);
  put(root, 'notes/ok.md', 'nothing here');
  stage(root, 'notes');
  const { hits } = await scan(root, { mode: 'tracked' });
  assert.deepEqual([...hits.keys()], ['notes/real.md']);
});
