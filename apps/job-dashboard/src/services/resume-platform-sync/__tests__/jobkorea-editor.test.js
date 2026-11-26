import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runInNewContext } from 'node:vm';
import { withJobKoreaEditor } from '../jobkorea-editor.js';

const EDIT_URL = 'https://www.jobkorea.co.kr/resume/edit/42';
const TITLE_FIELD = 'UserResume.M_Resume_Title';

class TestForm {
  isConnected = true;

  constructor({ id, name = '', action = '', fields = [] }) {
    this.attributes = { id, name, action };
    this.fields = fields;
    this.elements = { namedItem: (key) => fields.find(([name]) => name === key) ?? null };
  }

  getAttribute(key) {
    return this.attributes[key] ?? null;
  }
}

function editorFixture(forms, { lateForm, visibleSelector } = {}) {
  const document = {
    forms: [...forms],
    baseURI: EDIT_URL,
    title: '이력서 수정',
    getElementById: () => null,
    getElementsByName: () => [],
    querySelector: (selector) =>
      document.forms.find((form) => `#${form.attributes.id}` === selector) ?? null,
    querySelectorAll: (selector) =>
      visibleSelector && selector.includes(visibleSelector) ? [{ getClientRects: () => [{}] }] : [],
  };
  const execute = (fn, ...args) =>
    runInNewContext(`(${fn})(...args)`, {
      args,
      document,
      location: new URL(EDIT_URL),
      URL,
      HTMLFormElement: TestForm,
      HTMLInputElement: class {},
      FormData: class {
        constructor(form) {
          this.entries = () => form.fields[Symbol.iterator]();
        }
      },
      getComputedStyle: () => ({ visibility: 'visible' }),
    });
  const page = {
    setCookie: async () => {},
    on: () => {},
    setRequestInterception: async () => {},
    goto: async () => {},
    close: async () => {},
    url: () => EDIT_URL,
    title: async () => document.title,
    waitForSelector: async () => {
      throw new Error('timeout');
    },
    waitForFunction: async (fn, { timeout }, ...args) => {
      assert.ok(timeout > 0 && timeout <= 20_000);
      const first = execute(fn, ...args);
      if (first) return first;
      if (lateForm) {
        document.forms.push(lateForm);
        const next = execute(fn, ...args);
        if (next) return next;
      }
      throw new Error('timeout');
    },
    evaluate: async (fn, ...args) => execute(fn, ...args),
  };
  return { withBrowserSession: async (_env, run) => run({ newPage: async () => page }) };
}

for (const { identity, action, key } of [
  { identity: 'save action', action: '/user/resume/save?cache=1', key: 'LastEditDateTicks' },
  { identity: 'mapped title field', action: '', key: TITLE_FIELD },
]) {
  it(`waits for a renamed resume form and serializes it by ${identity}`, async () => {
    const unrelated = new TestForm({ id: 'search', action: '/search', fields: [['q', 'fixture']] });
    const fields = [[key, 'fixture']];
    const lateForm = new TestForm({ id: 'new-editor', action, fields });
    const result = await withJobKoreaEditor(
      {},
      { rNo: '42' },
      async (editor) => editor.fields.map(({ name, value }) => `${name}=${value}`).join('&'),
      editorFixture([unrelated], { lateForm })
    );
    assert.equal(result, `${key}=fixture`);
  });
}

it('reports up to five forms and interstitial signals without recording field or query values', async () => {
  const forms = Array.from(
    { length: 6 },
    (_, i) =>
      new TestForm({
        id: `form-${i}`,
        name: `aux-${i}`,
        action: '/search?fixture-query#fixture-fragment',
        fields: [['q', 'fixture-field-value']],
      })
  );
  await assert.rejects(
    withJobKoreaEditor(
      {},
      { rNo: '42' },
      async () => assert.fail('unexpected editor'),
      editorFixture(forms, { visibleSelector: '#tfaCertNum' })
    ),
    (error) => {
      assert.match(error.message, /path=\/resume\/edit\/<id>/);
      const metadata = /forms=(\[.*?\]),/.exec(error.message)?.[1];
      assert.ok(metadata);
      assert.deepEqual(
        JSON.parse(metadata),
        forms.slice(0, 5).map((form) => ({
          id: form.attributes.id,
          name: form.attributes.name,
          action: '/search',
        }))
      );
      assert.match(error.message, /login=false, 2fa=true, notice=false/);
      assert.doesNotMatch(error.message, /fixture-query|fixture-fragment|fixture-field-value/);
      return true;
    }
  );
});
