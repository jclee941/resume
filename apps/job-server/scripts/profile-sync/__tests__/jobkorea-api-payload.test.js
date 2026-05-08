import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildPortfolioPayload, buildSavePayload, encodeFormFields } from '../jobkorea-handler/api-payload.js';

describe('JobKorea API payload helpers', () => {
  it('encodes form fields as application/x-www-form-urlencoded', () => {
    const payload = encodeFormFields([
      { name: 'UserResume.Resume_Title', value: 'DevSecOps SRE Engineer' },
      { name: 'Career[c1].C_Name', value: 'Example Cloud Operations' },
      { name: 'Nullable', value: null },
    ]);

    assert.match(payload, /UserResume\.Resume_Title=DevSecOps\+SRE\+Engineer/);
    assert.match(payload, /Career%5Bc1%5D\.C_Name=Example\+Cloud\+Operations/);
    assert.match(payload, /Nullable=/);
  });

  it('adds hdnIsCompleteSave=False when missing', () => {
    const payload = buildSavePayload([{ name: 'UserResume.Resume_Title', value: 'Title' }]);

    assert.match(payload, /UserResume\.Resume_Title=Title/);
    assert.match(payload, /hdnIsCompleteSave=False/);
  });

  it('does not duplicate an existing hdnIsCompleteSave field', () => {
    const payload = buildSavePayload([
      { name: 'UserResume.Resume_Title', value: 'Title' },
      { name: 'hdnIsCompleteSave', value: 'True' },
    ]);

    assert.strictEqual(payload.match(/hdnIsCompleteSave=/g).length, 1);
    assert.match(payload, /hdnIsCompleteSave=True/);
  });

  it('builds the confirmed portfolio registration payload shape', () => {
    const url = 'https://resume.example.test/portfolio';
    const payload = buildPortfolioPayload(url);
    const params = new URLSearchParams(payload);

    assert.strictEqual(params.get('File_Name'), url);
    assert.strictEqual(params.get('Display_File_Name'), url);
    assert.strictEqual(params.get('File_Type'), '2');
    assert.strictEqual(params.get('File_Up_Stat'), '2');
    assert.strictEqual(params.get('File_Size'), '0');
  });
});
