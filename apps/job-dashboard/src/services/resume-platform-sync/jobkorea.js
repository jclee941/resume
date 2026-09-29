import {
  buildJobKoreaFormData,
  deriveJobKoreaSectionIndices,
} from '@resume/shared/platform-sync/jobkorea';
import {
  buildSavePayload,
  smartMergeFields,
} from '@resume/shared/platform-sync/jobkorea/api-payload';
import { assertJobKoreaCareerPayloadCoverage } from '@resume/shared/platform-sync/jobkorea/career-guards';
import { readPlatformSession } from '../platform-session.js';
import { JOBKOREA_SESSION_EXPIRED, withJobKoreaEditor } from './jobkorea-editor.js';

const REVIEWED_FIELD =
  /^(UnivSchool\[[^\]]+\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)|Award\[[^\]]+\]\.(Award_Name|Award_Inst_Name|Award_Year)|Award\.[Ii]ndex)$/;

/** Sections a save replaces wholesale (smartMergeFields), keyed by real JobKorea row keys. */
const REPLACED_SECTIONS = ['Career', 'License', 'Award'];
const REPLACED_ROW_NAME = /^(Career|License|Award)\[[^\]]+\]\.Index_Name$/;

/** Edit-page tokens the save echoes back when the live form does not carry them. */
const DEFAULT_EDIT_TOKENS = { IsEditPage: 'True', IsCompleteSave: 'True', LastEditDateTicks: '' };

/**
 * @typedef {{ name: string; value?: string | number | boolean | null }} FormField
 * @typedef {Parameters<typeof readPlatformSession>[0] &
 *   Parameters<typeof withJobKoreaEditor>[0] & { JOBKOREA_RNO?: string }} JobKoreaSyncEnv
 * @typedef {Parameters<typeof buildJobKoreaFormData>[0] &
 *   Parameters<typeof assertJobKoreaCareerPayloadCoverage>[0]} JobKoreaSsot
 * @typedef {{ dryRun: boolean; withEditor?: typeof withJobKoreaEditor; now?: number }} JobKoreaSyncOptions
 * @typedef {{ platform: 'jobkorea'; success: boolean; dryRun: boolean; error?: string; code?: string; [key: string]: unknown }} JobKoreaSyncResult
 */

/**
 * Education and award fields whose value the save would change, for review.
 * @param {FormField[]} baseFields
 * @param {FormField[]} mergedFields
 * @returns {Array<{ name: string; before: string | null; after: string }>}
 */
export function describeReviewedChanges(baseFields, mergedFields) {
  const before = new Map(baseFields.map((field) => [field.name, String(field.value ?? '')]));
  return mergedFields
    .filter((field) => REVIEWED_FIELD.test(field.name))
    .map((field) => ({
      name: field.name,
      before: before.get(field.name) ?? null,
      after: String(field.value ?? ''),
    }))
    .filter((change) => change.before !== change.after);
}

/**
 * @param {FormField[]} fields
 * @param {string} section
 * @returns {string[]}
 */
function rowKeys(fields, section) {
  const indexName = `${section}.index`.toLowerCase();
  return fields
    .filter((field) => field.name.toLowerCase() === indexName)
    .flatMap((field) => String(field.value ?? '').split(','))
    .map((key) => key.trim())
    .filter(Boolean);
}

/**
 * Live vs saved row keys of the sections a save replaces wholesale, for review.
 * @param {FormField[]} baseFields
 * @param {FormField[]} mergedFields
 * @returns {Record<string, { live: string[]; saved: string[] }>}
 */
function describeReplacedRows(baseFields, mergedFields) {
  return Object.fromEntries(
    REPLACED_SECTIONS.map((section) => [
      section,
      { live: rowKeys(baseFields, section), saved: rowKeys(mergedFields, section) },
    ])
  );
}

/**
 * Rows of the replaced sections that the merge dropped because the live row carries
 * more fields than the SSoT overlay; saving would leave only their forced date fields.
 * @param {FormField[]} targetFields
 * @param {FormField[]} mergedFields
 * @returns {string[]}
 */
function truncatedRows(targetFields, mergedFields) {
  const merged = new Set(mergedFields.map((field) => field.name));
  return targetFields
    .filter((field) => REPLACED_ROW_NAME.test(field.name) && !merged.has(field.name))
    .map((field) => field.name.replace(/\.Index_Name$/, ''));
}

/**
 * @param {string} text
 * @returns {{ IsSuccess?: boolean; ErrorMessage?: string } | null}
 */
function parseSaveResult(text) {
  try {
    return JSON.parse(text)?.saveResult ?? null;
  } catch {
    return null;
  }
}

/**
 * Sync the SSoT resume to the JobKorea resume (JOBKOREA_RNO) inside the Browser
 * Rendering editor with the KV `auth:jobkorea` session: keep the live form, overlay
 * the SSoT sections, and save from the editor page.
 * @param {JobKoreaSyncEnv} env
 * @param {JobKoreaSsot} ssot
 * @param {JobKoreaSyncOptions} options
 * @returns {Promise<JobKoreaSyncResult>}
 */
export async function syncJobKoreaFromSsot(env, ssot, options) {
  const { dryRun, withEditor = withJobKoreaEditor, now = Date.now() } = options;
  const cookieString = await readPlatformSession(env, 'jobkorea');
  if (!cookieString) {
    return {
      platform: 'jobkorea',
      success: false,
      dryRun,
      code: JOBKOREA_SESSION_EXPIRED,
      error:
        'No JobKorea session in KV (auth:jobkorea); mint one with POST /job/api/jobkorea/refresh-session',
    };
  }
  const rNo = String(env.JOBKOREA_RNO || '').trim();
  if (!rNo) {
    return {
      platform: 'jobkorea',
      success: false,
      dryRun,
      error: 'JOBKOREA_RNO is not configured',
    };
  }

  return withEditor(env, { cookieString, rNo }, async (editor) => {
    if (editor.fields.length === 0) {
      return {
        platform: 'jobkorea',
        success: false,
        dryRun,
        error: 'JobKorea resume form was empty; refusing to save without the live form',
      };
    }
    const targetFields = buildJobKoreaFormData(
      ssot,
      deriveJobKoreaSectionIndices(editor.fields, now)
    ).map(({ name, value }) => ({ name: String(name), value }));
    const mergedFields = smartMergeFields(editor.fields, targetFields, {
      ...DEFAULT_EDIT_TOKENS,
      ...editor.tokens,
    });
    const summary = {
      activatedSections: editor.activatedSections,
      formFieldCount: editor.fields.length,
      mergedFieldCount: mergedFields.length,
      rows: describeReplacedRows(editor.fields, mergedFields),
      changes: describeReviewedChanges(editor.fields, mergedFields),
    };
    const truncated = truncatedRows(targetFields, mergedFields);
    if (truncated.length > 0) {
      return {
        platform: 'jobkorea',
        success: false,
        dryRun,
        error: `JobKorea rows would lose live fields in the save: ${truncated.join(', ')}`,
        ...summary,
      };
    }
    assertJobKoreaCareerPayloadCoverage(ssot, mergedFields, { dryRun });
    if (dryRun) return { platform: 'jobkorea', success: true, dryRun: true, ...summary };

    const response = await editor.save(buildSavePayload(mergedFields));
    const saveResult = parseSaveResult(response.text);
    if (saveResult?.IsSuccess !== true) {
      return {
        platform: 'jobkorea',
        success: false,
        dryRun: false,
        error:
          saveResult?.ErrorMessage ||
          `JobKorea did not confirm the save (status=${response.status}): ${response.text.slice(0, 160)}`,
        ...summary,
      };
    }
    return { platform: 'jobkorea', success: true, dryRun: false, ...summary };
  });
}
