import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { collectFormFields, encodeFormParam, readResumeForm, toFormObject } from '../index.js';

function decodeFormParam(param) {
  const text = decodeURIComponent(atob(param.replaceAll('~univ~', '+')));
  return text.split('&').map((pair) => pair.split('='));
}

describe('collectFormFields', () => {
  it('collects what a browser submits, in document order', () => {
    const markup = `
      <input name="name" value="Kim &amp; Lee">
      <input name="off" value="x" disabled>
      <input name="styled" class="disabled checked" value="kept">
      <input type="radio" name="yn" value="1" class ="radio"  disabled/>
      <input type="radio" name="yn" value="0" checked>
      <input type="checkbox" name="agree" checked>
      <input type="checkbox" name="skip" value="no">
      <input type="file" name="upload">
      <select name="status"><option value="a">A</option><option value="b" selected>B</option></select>
      <select name="first"><option value="">-</option><option value="z" class="selected">Z</option></select>
      <textarea name="memo">line &lt;1&gt;</textarea>`;

    assert.deepEqual(collectFormFields(markup), [
      { name: 'name', value: 'Kim & Lee' },
      { name: 'styled', value: 'kept' },
      { name: 'yn', value: '0' },
      { name: 'agree', value: 'on' },
      { name: 'status', value: 'b' },
      { name: 'first', value: '' },
      { name: 'memo', value: 'line <1>' },
    ]);
  });
});

describe('toFormObject', () => {
  it('turns a repeated name into an array in document order', () => {
    const fields = [
      { name: 'a', value: '1' },
      { name: 'b', value: 'x' },
      { name: 'a', value: '2' },
    ];

    assert.deepEqual(toFormObject(fields), { a: ['1', '2'], b: 'x' });
  });
});

describe('readResumeForm', () => {
  it('reads form1 only, leaving out the item templates outside it', () => {
    const page =
      '<input name="carCorpName" value="template">' +
      '<form id="form1" name="form1" method="post"><input name="carCorpName" value="A"></form>' +
      '<input name="cerCertName" value="template">';

    assert.deepEqual(readResumeForm(page), { carCorpName: 'A' });
  });

  it('returns null for a page without the resume form', () => {
    assert.equal(readResumeForm('<html><form id="frm"></form></html>'), null);
  });
});

describe('encodeFormParam', () => {
  it('writes & and = in values full-width and joins arrays with a full-width comma', () => {
    const param = encodeFormParam({ note: 'a&b=c', list: ['x，y', 'z'], name: '홍길동' });

    assert.deepEqual(decodeFormParam(param), [
      ['note', 'a＆b＝c'],
      ['list', 'x,y，z'],
      ['name', '홍길동'],
    ]);
  });

  it('replaces + in the base64 text with ~univ~', () => {
    assert.equal(encodeFormParam({ k: 'a~b' }), 'ayUzRGF~univ~Yg==');
  });
});
