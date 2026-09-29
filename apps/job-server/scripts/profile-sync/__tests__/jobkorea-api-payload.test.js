import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildPortfolioPayload,
  buildSavePayload,
  encodeFormFields,
  mergeBaseFields,
  smartMergeFields,
} from '@resume/shared/platform-sync/jobkorea/api-payload';
import { deriveJobKoreaSectionIndices } from '@resume/shared/platform-sync/jobkorea';
import { overlayTemplate } from '../jobkorea-handler/sync-api-only.js';

describe('JobKorea API payload helpers', () => {
  it('encodes form fields as application/x-www-form-urlencoded', () => {
    const payload = encodeFormFields([
      { name: 'UserResume.Resume_Title', value: 'Security Operations Engineer' },
      { name: 'Career[c1].C_Name', value: 'Example Cloud Operations' },
      { name: 'Nullable', value: null },
    ]);

    assert.match(payload, /UserResume\.Resume_Title=Security\+Operations\+Engineer/);
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
      { name: 'Career[c1].C_Part', value: 'Security Operations' },
      { name: 'Language[c1].Lang1_Name', value: 'Japanese' },
      { name: 'Language[c1].Lang1_Stat', value: 'business' },
    ];

    const merged = smartMergeFields(base, target, { IsEditPage: 'True' });
    const map = new Map(merged.map((f) => [f.name, f.value]));

    // Complete section overridden
    assert.strictEqual(map.get('Career[c1].C_Name'), 'New Corp');
    assert.strictEqual(map.get('Career[c1].C_Part'), 'Security Operations');
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

  it('smartMergeFields replaces stale base Career rows when target carries Career.index', () => {
    const base = [
      { name: 'Career.index', value: 'old1' },
      { name: 'Career[old1].Index_Name', value: 'old1' },
      { name: 'Career[old1].C_Name', value: 'Old Corp' },
    ];
    const target = [
      { name: 'Career[c1].Index_Name', value: 'c1' },
      { name: 'Career[c1].C_Name', value: 'New Corp A' },
      { name: 'Career[c2].Index_Name', value: 'c2' },
      { name: 'Career[c2].C_Name', value: 'New Corp B' },
      { name: 'Career.index', value: 'c1' },
      { name: 'Career.index', value: 'c2' },
    ];

    const merged = smartMergeFields(base, target);
    const careerNames = merged
      .filter((field) => /^Career\[[^\]]+\]\.C_Name$/.test(field.name))
      .map((field) => field.value);
    const careerIndexValues = merged
      .filter((field) => field.name === 'Career.index')
      .map((field) => field.value);

    assert.deepStrictEqual(careerNames, ['New Corp A', 'New Corp B']);
    assert.deepStrictEqual(careerIndexValues, ['c1', 'c2']);
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

  it('overlays target values for fields present in base even when the section is incomplete', () => {
    // UnivSchool regression: base carries many extra fields (majors, grades), our
    // target maps only the core fields. The section counts as incomplete, but the
    // core fields we DO map (Entc_YM) must still overlay so JobKorea validation
    // does not reject a stale/dotted base value.
    const base = [
      { name: 'UnivSchool[c3].Schl_Name', value: '한양사이버대학교' },
      { name: 'UnivSchool[c3].Entc_YM', value: '2024.03' },
      { name: 'UnivSchool[c3].UnivMajor[1].Major_Name', value: '' },
      { name: 'UnivSchool[c3].UnivMajor[1].Major_Code', value: '' },
      { name: 'UnivSchool[c3].Grade', value: '' },
    ];
    const target = [
      { name: 'UnivSchool[c3].Schl_Name', value: '한양사이버대학교' },
      { name: 'UnivSchool[c3].Entc_YM', value: '202403' },
    ];

    const merged = smartMergeFields(base, target);
    const map = new Map(merged.map((f) => [f.name, f.value]));

    // Core mapped field overlaid with our normalized value
    assert.strictEqual(map.get('UnivSchool[c3].Entc_YM'), '202403');
    // Base-only extra fields preserved (not dropped)
    assert.strictEqual(map.get('UnivSchool[c3].UnivMajor[1].Major_Name'), '');
    assert.strictEqual(map.get('UnivSchool[c3].Grade'), '');
  });

  it('preserves incomplete Language base fields even when target carries Language.index', () => {
    const base = [
      { name: 'Language.index', value: 'c1' },
      { name: 'Language[c1].Lang1_Name', value: 'English' },
      { name: 'Language[c1].Lang1_Stat', value: 'fluent' },
      { name: 'Language[c1].Eval_Category', value: '2' },
    ];
    const target = [
      { name: 'Language.index', value: 'c1' },
      { name: 'Language[c1].Lang1_Name', value: 'Japanese' },
      { name: 'Language[c1].Lang1_Stat', value: 'business' },
    ];

    const merged = smartMergeFields(base, target);
    const map = new Map(merged.map((field) => [field.name, field.value]));
    const languageIndexes = merged
      .filter((field) => field.name === 'Language.index')
      .map((field) => field.value);

    assert.deepStrictEqual(languageIndexes, ['c1']);
    assert.strictEqual(map.get('Language[c1].Lang1_Name'), 'English');
    assert.strictEqual(map.get('Language[c1].Lang1_Stat'), 'fluent');
    assert.strictEqual(map.get('Language[c1].Eval_Category'), '2');
  });

  it('preserves live Language rows when target uses a different incomplete index', () => {
    const base = [
      { name: 'Language.index', value: 'c9' },
      { name: 'Language[c9].Lang1_Name', value: 'English' },
      { name: 'Language[c9].Lang1_Stat', value: 'fluent' },
      { name: 'Language[c9].Eval_Category', value: '2' },
    ];
    const target = [
      { name: 'Language.index', value: 'c1' },
      { name: 'Language[c1].Lang1_Name', value: 'Japanese' },
      { name: 'Language[c1].Lang1_Stat', value: 'business' },
    ];

    const merged = smartMergeFields(base, target);
    const map = new Map(merged.map((field) => [field.name, field.value]));
    const languageIndexes = merged
      .filter((field) => field.name === 'Language.index')
      .map((field) => field.value);

    assert.deepStrictEqual(languageIndexes, ['c9']);
    assert.strictEqual(map.get('Language[c9].Lang1_Name'), 'English');
    assert.strictEqual(map.get('Language[c9].Lang1_Stat'), 'fluent');
    assert.strictEqual(map.get('Language[c9].Eval_Category'), '2');
    assert.strictEqual(map.has('Language[c1].Lang1_Name'), false);
    assert.strictEqual(map.has('Language[c1].Lang1_Stat'), false);
  });

  it('treats live Language.Index and target Language.index as the same repeatable index', () => {
    const base = [
      { name: 'Language.Index', value: 'c9' },
      { name: 'Language[c9].Lang1_Name', value: 'English' },
      { name: 'Language[c9].Lang1_Stat', value: 'fluent' },
      { name: 'Language[c9].Eval_Category', value: '2' },
    ];
    const target = [
      { name: 'Language.index', value: 'c1' },
      { name: 'Language[c1].Lang1_Name', value: 'Japanese' },
      { name: 'Language[c1].Lang1_Stat', value: 'business' },
    ];

    const merged = smartMergeFields(base, target);
    const map = new Map(merged.map((field) => [field.name, field.value]));
    const languageIndexFields = merged.filter((field) => /^Language\.[Ii]ndex$/.test(field.name));

    assert.deepStrictEqual(languageIndexFields, [{ name: 'Language.Index', value: 'c9' }]);
    assert.strictEqual(map.get('Language[c9].Lang1_Name'), 'English');
    assert.strictEqual(map.get('Language[c9].Lang1_Stat'), 'fluent');
    assert.strictEqual(map.get('Language[c9].Eval_Category'), '2');
    assert.strictEqual(map.has('Language[c1].Lang1_Name'), false);
    assert.strictEqual(map.has('Language[c1].Lang1_Stat'), false);
  });

  it('replaces live Award rows with the SSoT awards and their index', () => {
    const base = [
      { name: 'Award.Index', value: 'c4' },
      { name: 'Award[c4].Index_Name', value: 'c4' },
      { name: 'Award[c4].Award_Name', value: 'Old award' },
      { name: 'Award[c4].Award_Inst_Name', value: 'Org' },
      { name: 'Award[c4].Award_Year', value: '2025' },
      { name: 'Award[c4].Award_Cntnt', value: '' },
    ];
    const target = [
      { name: 'Award[c1].Index_Name', value: 'c1' },
      { name: 'Award[c1].Award_Name', value: 'First award' },
      { name: 'Award[c2].Index_Name', value: 'c2' },
      { name: 'Award[c2].Award_Name', value: 'Second award' },
      { name: 'Award.index', value: 'c1,c2' },
    ];

    const map = new Map(smartMergeFields(base, target).map((field) => [field.name, field.value]));

    assert.strictEqual(map.has('Award[c4].Award_Name'), false);
    assert.strictEqual(map.has('Award.Index'), false);
    assert.strictEqual(map.get('Award.index'), 'c1,c2');
    assert.strictEqual(map.get('Award[c1].Award_Name'), 'First award');
    assert.strictEqual(map.get('Award[c2].Award_Name'), 'Second award');
  });

  it('overlays the graduation status together with the graduation month', () => {
    const base = [
      { name: 'UnivSchool[c3].Schl_Name', value: 'Univ' },
      { name: 'UnivSchool[c3].Grad_YM', value: '202802' },
      { name: 'UnivSchool[c3].Grad_Type_Code', value: '4' },
      { name: 'UnivSchool[c3].Grade', value: '4.0' },
    ];
    const target = [
      { name: 'UnivSchool[c3].Grad_YM', value: '202702' },
      { name: 'UnivSchool[c3].Grad_Type_Code', value: '5' },
    ];

    const map = new Map(smartMergeFields(base, target).map((field) => [field.name, field.value]));

    assert.strictEqual(map.get('UnivSchool[c3].Grad_YM'), '202702');
    assert.strictEqual(map.get('UnivSchool[c3].Grad_Type_Code'), '5');
    assert.strictEqual(map.get('UnivSchool[c3].Grade'), '4.0');
  });

  it('lets browser-serialized values win over raw edit-page values', () => {
    const merged = mergeBaseFields(
      [
        { name: 'Military_Stat', value: '1' },
        { name: 'Military_Stat', value: '2' },
        { name: 'Only_Raw', value: 'raw' },
      ],
      [{ name: 'Military_Stat', value: '1' }]
    );

    assert.deepStrictEqual(merged, [
      { name: 'Military_Stat', value: '1' },
      { name: 'Only_Raw', value: 'raw' },
    ]);
  });

  it('derives school keys and stored-then-new row keys for replaced sections', () => {
    const indices = deriveJobKoreaSectionIndices(
      [
        { name: 'UnivSchool.Index', value: 'c3' },
        { name: 'HighSchool.index', value: 'c7,c8' },
        { name: 'Career.index', value: 'c14,c844' },
        { name: 'Award.index', value: '1_1790657372229' },
      ],
      1000
    );

    assert.strictEqual(indices.school, 'c3');
    assert.strictEqual(indices.highSchool, 'c7');
    assert.deepStrictEqual(indices.career.slice(0, 3), ['c14', 'c844', '1_1000']);
    assert.deepStrictEqual(indices.license.slice(0, 1), ['1_1000']);
    assert.deepStrictEqual(indices.award.slice(0, 2), ['1_1000', '2_1001']);
    assert.deepStrictEqual(Object.keys(deriveJobKoreaSectionIndices([], 5)).sort(), [
      'award',
      'career',
      'license',
    ]);
  });
});
