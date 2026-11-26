import { it } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { withJobKoreaEditor } from '../jobkorea-editor.js';
const origin = 'https://www.jobkorea.co.kr';
const api = '/resume/api/resume-display/v2/resumes';
const version = `"rv1-${'a'.repeat(64)}"`;
function fixture({
  status = 200,
  id = '42',
  etag = version,
  timeout = false,
  login = false,
  saveResponse = () => new Response(null, { status: 200, headers: { ETag: version } }),
} = {}) {
  let listener,
    closed = false;
  const writes = [];
  const target = `${origin}/resume/edit/42`;
  const page = {
    url: () => (login ? `${origin}/Login/Login_Tot.asp` : target),
    on() {},
    async setCookie() {},
    async setRequestInterception() {},
    async close() {
      closed = true;
    },
    waitForResponse(pred, opts) {
      assert.ok(opts.timeout > 0 && opts.timeout <= 20000);
      return new Promise((resolve) => {
        listener = () => {
          const res = (url, method) => ({
            url: () => url,
            request: () => ({ method: () => method }),
            headers: () => ({ etag }),
            json: async () => ({ resumeNo: id, content: { general: { title: 'test' } } }),
            status: () => status,
            ok: () => status === 200,
          });
          assert.equal(pred(res(`${origin + api}/drafts`, 'GET')), false);
          assert.equal(pred(res(`https://foreign.invalid${api}/drafts`, 'POST')), false);
          const own = res(`${origin + api}/drafts`, 'POST');
          assert.equal(pred(own), true);
          resolve(timeout ? null : own);
        };
      });
    },
    async goto(url) {
      assert.equal(url, target);
      assert.ok(listener, 'listener registered before navigation');
      listener();
    },
    async evaluate(fn, ...args) {
      if (!args.length)
        return { title: login ? '로그인' : '이력서 수정', login, twoFactor: false, notice: false };
      return runInNewContext(`(${fn})(...args)`, {
        args,
        location: new URL(target),
        AbortSignal,
        fetch: async (path, init) => {
          writes.push({ path, init });
          return saveResponse();
        },
      });
    },
  };
  return {
    run: (fn) =>
      withJobKoreaEditor({}, { rNo: '42' }, fn, {
        withBrowserSession: async (_env, work) => work({ newPage: async () => page }),
      }),
    writes,
    closed: () => closed,
  };
}
it('uses only the observed draft and writes from the same editor with conditional method override', async () => {
  const f = fixture();
  await f.run(async (editor) => {
    assert.equal(editor.etag, version);
    assert.equal(editor.content.general.title, 'test');
    assert.equal(f.writes.length, 0);
    await editor.save('title', { title: 'changed' }, editor.etag);
  });
  assert.ok(f.closed());
  assert.equal(f.writes.length, 1);
  const [{ path, init }] = f.writes;
  assert.equal(path, `${api}/42/sections/title`);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['X-HTTP-Method-Override'], 'PUT');
  assert.equal(init.headers['If-Match'], version);
  assert.equal(init.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(init.body), { title: 'changed' });
});
it('reports a rejected save by codes and field paths without submitted values', async () => {
  const f = fixture({
    saveResponse: () =>
      Response.json(
        {
          code: 'INVALID_REQUEST',
          errors: [
            { field: 'careers[0].positionGrade', message: 'invalid', rejectedValue: 'secret' },
          ],
        },
        { status: 400 }
      ),
  });
  await f.run(async (editor) => {
    const result = await editor.save('career', { careers: [] }, editor.etag);
    assert.equal(result.status, 400);
    assert.match(result.problem ?? '', /INVALID_REQUEST.*careers\[0\]\.positionGrade/);
    assert.doesNotMatch(result.problem ?? '', /secret/);
  });
});
it('accepts a draft whose resumeNo is numeric', async () => {
  const f = fixture({ id: 42 });
  await f.run(async (editor) => assert.equal(editor.content.general.title, 'test'));
});
for (const [label, options, pattern] of [
  ['login timeout', { timeout: true, login: true }, /login=true.*status=unavailable/],
  ['wrong resume', { id: '43' }, /path=\/resume\/edit\/<id>.*status=200/],
  ['missing version', { etag: '' }, /status=200/],
  ['forbidden', { status: 403 }, /status=403/],
])
  it(`refuses ${label} and reports a sanitized diagnostic`, async () => {
    const f = fixture(options);
    await assert.rejects(
      f.run(() => assert.fail('unexpected editor')),
      pattern
    );
    assert.ok(f.closed());
    assert.equal(f.writes.length, 0);
  });
