import SessionManager from '../../src/shared/services/session/index.js';

import { APPLY_DELAY_MS, config } from './constants.js';
import { extractAppliedJobIds, resolveResumeKey } from './job-helpers.js';
import { log, summarizeError } from './logging.js';
import { createWantedApplyBrowser } from './apply-wanted-browser.js';
import { executeSingleWantedApply } from './apply-wanted-submission.js';

export async function applyToJobs(result, jobs, dedupCache, updateDedupEntry, sleep) {
  if (result.wantedApplyEnabled === false) {
    log('wanted apply disabled after session health check, apply phase skipped');
    return;
  }

  const session = SessionManager.load('wanted');
  const api = await SessionManager.getAPI('wanted');

  if (!result.wantedApplyEnabled) {
    log('wanted apply disabled, apply phase skipped');
    return;
  }

  if (!api || !session) {
    result.wantedApplyEnabled = false;
    log('wanted session unavailable, apply phase skipped');
    return;
  }

  const maxDailyWanted = config.limits?.maxDaily ?? Number.POSITIVE_INFINITY;
  const maxPerPlatformWanted = config.limits?.maxPerPlatform?.wanted ?? maxDailyWanted;
  const wantedApplyLimit = Math.min(maxDailyWanted, maxPerPlatformWanted);
  const applyDelayMs = config.limits?.delayBetweenApps ?? APPLY_DELAY_MS;
  let appliedThisRun = result.applied;

  let profileName = session.username || '';
  let profileMobile = session.mobile || '';
  try {
    const profile = await api.getProfile();
    const user = profile?.user || profile;
    profileName = profileName || user?.name || '';
    profileMobile = profileMobile || user?.mobile || '';
  } catch (profileError) {
    log('profile fetch failed (continuing with session data):', summarizeError(profileError));
  }

  const resumeResponse = await api.chaosRequest('/resumes/v1?offset=0&limit=10');
  const resumeKey = resolveResumeKey(resumeResponse);
  if (!resumeKey) {
    throw new Error('Unable to resolve Wanted resume key');
  }

  let appliedJobIds = new Set();
  try {
    const applicationsResponse = await api.chaosRequest('/applications/v1?offset=0&limit=200');
    appliedJobIds = extractAppliedJobIds(applicationsResponse);
  } catch (appCheckError) {
    log(
      'existing applications check failed (continuing without dedup):',
      summarizeError(appCheckError)
    );
  }

  const browserSetup = await createWantedApplyBrowser(session, sleep);
  if (!browserSetup) {
    result.wantedApplyEnabled = false;
    return;
  }

  const { browser, page } = browserSetup;

  try {
    for (let index = 0; index < jobs.length; index += 1) {
      if (appliedThisRun >= wantedApplyLimit) {
        log('wanted apply limit reached', { applied: appliedThisRun, limit: wantedApplyLimit });
        break;
      }

      const job = jobs[index];
      if (appliedJobIds.has(String(job.id))) {
        result.skippedJobs.push({
          id: job.id,
          title: job.title,
          company: job.company,
          source: job.source,
          reason: 'already_applied',
        });
        result.skipped += 1;
        continue;
      }

      const applyContext = {
        session,
        profileName,
        profileMobile,
        resumeKey,
        result,
        appliedJobIds,
        dedupCache,
        updateDedupEntry,
        sleep,
      };

      const outcome = await executeSingleWantedApply(page, job, applyContext);
      if (outcome.success) {
        appliedThisRun += 1;
      } else if (outcome.stop) {
        break;
      }

      if (index < jobs.length - 1) {
        await sleep(applyDelayMs);
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
