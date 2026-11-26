import { planJobKoreaSections } from '@resume/shared/platform-sync/jobkorea';
import { readPlatformSession } from '../platform-session.js';
import {
  isResumeVersion,
  JOBKOREA_SESSION_EXPIRED,
  withJobKoreaEditor,
} from './jobkorea-editor.js';

/** @param {Parameters<typeof withJobKoreaEditor>[0] & Parameters<typeof readPlatformSession>[0] & { JOBKOREA_RNO?:string }} env
 * @param {Parameters<typeof planJobKoreaSections>[0]} ssot
 * @param {{dryRun:boolean, withEditor?:typeof withJobKoreaEditor, jobkoreaLogin?:import('./jobkorea-editor.js').JobKoreaLogin}} options */
export async function syncJobKoreaFromSsot(
  env,
  ssot,
  { dryRun, withEditor = withJobKoreaEditor, jobkoreaLogin }
) {
  /** @type {{ login: import('./jobkorea-editor.js').JobKoreaLogin } | { cookieString: string }} */
  let credentials;
  if (jobkoreaLogin) {
    credentials = { login: jobkoreaLogin };
  } else {
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
    credentials = { cookieString };
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

  return withEditor(env, { ...credentials, rNo }, async (editor) => {
    const plan = planJobKoreaSections(ssot, editor.content);
    /** @type {string[]} */
    const saved = [];
    const result = {
      platform: 'jobkorea',
      dryRun,
      photo: 'unsupported; left untouched',
      wouldSync: plan.map(({ section, fields }) => ({ section, fields })),
      saved,
    };
    let version = editor.etag;
    if (dryRun === false)
      for (const { section, payload } of plan) {
        const response = await editor.save(section, payload, version).catch(() => null);
        if (!response || response.status < 200 || response.status >= 300)
          return {
            ...result,
            success: false,
            failedSection: section,
            error:
              `JobKorea ${section} save failed (status=${response?.status ?? 'unconfirmed'})` +
              (response?.problem ? `: ${response.problem}` : ''),
          };
        saved.push(section);
        if (!isResumeVersion(response.etag))
          return {
            ...result,
            success: false,
            error: `JobKorea ${section} returned no valid next ETag; stopped after HTTP success`,
          };
        version = response.etag;
      }
    return { ...result, success: true };
  });
}
