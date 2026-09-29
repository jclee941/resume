import {
  buildJobKoreaFormData,
  deriveJobKoreaSectionIndices,
} from '@resume/shared/platform-sync/jobkorea';
import { JobKoreaAPIClient } from '@resume/shared/platform-sync/jobkorea/api-client';
import {
  mergeBaseFields,
  smartMergeFields,
} from '@resume/shared/platform-sync/jobkorea/api-payload';
import { assertJobKoreaCareerPayloadCoverage } from '@resume/shared/platform-sync/jobkorea/career-guards';
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../platform-session.js';
import { readJobKoreaFormViaBrowser } from './jobkorea-form-reader.js';

const REVIEWED_FIELD =
  /^(UnivSchool\[[^\]]+\]\.(Schl_Name|Entc_YM|Grad_YM|Grad_Type_Code)|Award\[[^\]]+\]\.(Award_Name|Award_Inst_Name|Award_Year)|Award\.[Ii]ndex)$/;

/**
 * @typedef {{ name: string; value?: string | number | boolean | null }} FormField
 * @typedef {Parameters<typeof readPlatformSession>[0] &
 *   Parameters<typeof readJobKoreaFormViaBrowser>[0] & { JOBKOREA_RNO?: string }} JobKoreaSyncEnv
 * @typedef {Parameters<typeof buildJobKoreaFormData>[0] &
 *   Parameters<typeof assertJobKoreaCareerPayloadCoverage>[0]} JobKoreaSsot
 * @typedef {Pick<JobKoreaAPIClient, 'fetchEditPageTokens' | 'fetchEditPageBaseFields' | 'saveResume'>} JobKoreaClient
 * @typedef {{
 *   dryRun: boolean;
 *   readBrowserForm?: typeof readJobKoreaFormViaBrowser;
 *   createClient?: (options: { cookieString: string; rNo: string; userAgent: string }) => JobKoreaClient;
 * }} JobKoreaSyncOptions
 */

/**
 * @param {{ cookieString: string; rNo: string; userAgent: string }} options
 * @returns {JobKoreaClient}
 */
function createJobKoreaClient(options) {
  return new JobKoreaAPIClient(options);
}

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
 * Sync the SSoT resume to the JobKorea resume (JOBKOREA_RNO) with the KV
 * `auth:jobkorea` session: preserve the live form, overlay SSoT sections, save.
 * @param {JobKoreaSyncEnv} env
 * @param {JobKoreaSsot} ssot
 * @param {JobKoreaSyncOptions} options
 * @returns {Promise<{ platform: 'jobkorea'; success: boolean; dryRun: boolean; error?: string; [key: string]: unknown }>}
 */
export async function syncJobKoreaFromSsot(env, ssot, options) {
  const {
    dryRun,
    readBrowserForm = readJobKoreaFormViaBrowser,
    createClient = createJobKoreaClient,
  } = options;
  const cookieString = await readPlatformSession(env, 'jobkorea');
  if (!cookieString) {
    return {
      platform: 'jobkorea',
      success: false,
      dryRun,
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

  const client = createClient({ cookieString, rNo, userAgent: DEFAULT_USER_AGENT });
  const tokens = await client.fetchEditPageTokens();
  const rawFields = await client.fetchEditPageBaseFields();
  const browserFields = await readBrowserForm(env, { cookieString, rNo });
  const baseFields = mergeBaseFields(rawFields, browserFields);
  const targetFields = buildJobKoreaFormData(ssot, deriveJobKoreaSectionIndices(baseFields)).map(
    ({ name, value }) => ({ name: String(name), value })
  );
  const mergedFields = smartMergeFields(baseFields, targetFields, tokens);
  assertJobKoreaCareerPayloadCoverage(ssot, mergedFields, { dryRun });

  const summary = {
    rawFieldCount: rawFields.length,
    browserFieldCount: browserFields.length,
    mergedFieldCount: mergedFields.length,
    changes: describeReviewedChanges(baseFields, mergedFields),
  };
  if (dryRun) return { platform: 'jobkorea', success: true, dryRun: true, ...summary };

  const saved = await client.saveResume(targetFields, { tokens, baseFields });
  if (!saved.success) {
    return {
      platform: 'jobkorea',
      success: false,
      dryRun: false,
      error: saved.result?.saveResult?.ErrorMessage || 'JobKorea rejected the resume save',
      ...summary,
    };
  }
  return { platform: 'jobkorea', success: true, dryRun: false, ...summary };
}
