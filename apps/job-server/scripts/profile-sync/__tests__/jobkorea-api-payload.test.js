import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildPortfolioPayload,
  buildSavePayload,
  encodeFormFields,
  smartMergeFields,
} from '../jobkorea-handler/api-payload.js';
import { overlayTemplate } from '../jobkorea-handler/sync-api-only.js';

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

  it('smartMergeFields overlays target fields onto base, skipping incomplete sections', () => {
    const base = [
      { name: 'UserResume.R_No', value: '123' },
      { name: 'Career[c1].C_Name', value: 'Old Corp' },
      { name: 'Career[c1].C_Part', value: 'Engineering' },
      { name: 'Language[c1].Lang1_Name', value: 'English' },
      { name: 'Language[c1].Lang1_Stat', value: ' fluent' },
      { name: 'Language[c1].Eval_Category', value: '2' },
    ];
    const target = [
      { name: 'Career[c1].C_Name', value: 'New Corp' },
      { name: 'Career[c1].C_Part', value: 'DevSecOps' },
      { name: 'Language[c1].Lang1_Name', value: 'Japanese' },
      { name: 'Language[c1].Lang1_Stat', value: 'business' },
    ];

    const merged = smartMergeFields(base, target, { IsEditPage: 'True' });
    const map = new Map(merged.map((f) => [f.name, f.value]));

    // Complete section overridden
    assert.strictEqual(map.get('Career[c1].C_Name'), 'New Corp');
    assert.strictEqual(map.get('Career[c1].C_Part'), 'DevSecOps');
    // Incomplete section (Language) skipped — base fields preserved
    assert.strictEqual(map.get('Language[c1].Lang1_Name'), 'English');
    assert.strictEqual(map.get('Language[c1].Eval_Category'), '2');
    // Tokens injected
    assert.strictEqual(map.get('IsEditPage'), 'True');
    assert.strictEqual(map.get('UserResume.R_No'), '123');
  });

  it('smartMergeFields applies complete section overrides', () => {
    const base = [
      { name: 'Career[c1].C_Name', value: 'Old' },
      { name: 'Career[c1].C_Part', value: 'Dept' },
    ];
    const target = [
      { name: 'Career[c1].C_Name', value: 'New' },
      { name: 'Career[c1].C_Part', value: 'NewDept' },
      { name: 'Career[c1].CSYM', value: '202301' },
    ];

    const merged = smartMergeFields(base, target);
    const map = new Map(merged.map((f) => [f.name, f.value]));

    assert.strictEqual(map.get('Career[c1].C_Name'), 'New');
    assert.strictEqual(map.get('Career[c1].C_Part'), 'NewDept');
    assert.strictEqual(map.get('Career[c1].CSYM'), '202301');
  });

  it('preserves every target license when the API template has one blank slot', () => {
    const base = [
      { name: 'License.index', value: 'c14' },
      { name: 'License[c14].Index_Name', value: 'c14' },
      { name: 'License[c14].Naver_Lcns_Linked_Stat', value: '' },
      { name: 'License[c14].Lc_Name', value: '' },
      { name: 'License[c14].Lc_Code', value: '' },
      { name: 'License[c14].Lc_Pub', value: '' },
      { name: 'License[c14].Lc_YYMM', value: '' },
      { name: 'InputStat.LicenseInputStat', value: 'False' },
    ];
    const target = [
      { name: 'License[c1].Index_Name', value: 'c1' },
      { name: 'License[c1].Naver_Lcns_Linked_Stat', value: '' },
      { name: 'License[c1].Lc_Name', value: 'CCNP' },
      { name: 'License[c1].Lc_Code', value: '' },
      { name: 'License[c1].Lc_Pub', value: 'Cisco Systems' },
      { name: 'License[c1].Lc_YYMM', value: '202008' },
      { name: 'License[c2].Index_Name', value: 'c2' },
      { name: 'License[c2].Naver_Lcns_Linked_Stat', value: '' },
      { name: 'License[c2].Lc_Name', value: 'RHCSA' },
      { name: 'License[c2].Lc_Code', value: '' },
      { name: 'License[c2].Lc_Pub', value: 'Red Hat' },
      { name: 'License[c2].Lc_YYMM', value: '201901' },
      { name: 'License.index', value: 'c1' },
      { name: 'License.index', value: 'c2' },
      { name: 'InputStat.LicenseInputStat', value: 'True' },
    ];

    const merged = overlayTemplate(base, target);
    const licenseNames = merged
      .filter((field) => /^License\[[^\]]+\]\.Lc_Name$/.test(field.name))
      .map((field) => field.value)
      .filter((value) => String(value).trim().length > 0);
    const byName = new Map(merged.map((field) => [field.name, field.value]));
    const licenseIndexValues = merged
      .filter((field) => field.name === 'License.index')
      .map((field) => field.value);

    assert.deepStrictEqual(licenseNames, ['CCNP', 'RHCSA']);
    assert.deepStrictEqual(licenseIndexValues, ['c1', 'c2']);
    assert.strictEqual(byName.get('InputStat.LicenseInputStat'), 'True');
  });
});
