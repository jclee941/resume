import SessionManager from '../src/shared/services/session/session-manager.js';

import { applyToJobKoreaJobs } from './pipeline/apply-jobkorea.js';
import { applyToJobs } from './pipeline/apply-wanted.js';
import { DETAIL_DELAY_MS, REVIEW_MIN_SCORE } from './pipeline/constants.js';
import {
  createDedupCache,
  getCrossRunDedupKey,
  getDedupKey,
  getDedupSkipReason,
  loadDedupCache,
  saveDedupCache,
  updateDedupEntry,
} from './pipeline/dedup-cache.js';
import {
  createPipelineFailure,
  extractJobArray,
  filterRelevantJobs,
} from './pipeline/job-helpers.js';
import { log, recordJobToElk, shipToElk, summarizeError } from './pipeline/logging.js';
import { runProfileSync } from './pipeline/profile-sync.js';
import { createResult, mapFailedJob, mapTopJob } from './pipeline/result-state.js';
import { scoreJob, scoreJobKorea, searchJobKorea, searchJobs } from './pipeline/search.js';
import { checkSessionHealth } from './pipeline/session-health.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const result = createResult();
  let dedupCache = createDedupCache();

  result.sessionWarnings = await checkSessionHealth();
  result.wantedApplyEnabled = Boolean(SessionManager.load('wanted'));
  if (!result.wantedApplyEnabled) {
    result.sessionWarnings.push('wanted: apply disabled after renewal check');
  }
  if (result.sessionWarnings.length > 0) {
    log('session warnings:', result.sessionWarnings);
  }

  await shipToElk('pipeline_started', {
    session_warnings: result.sessionWarnings,
    thresholds: result.thresholds,
  });

  try {
    dedupCache = await loadDedupCache();
    const wantedJobs = await searchJobs();
    const jobKoreaJobs = await searchJobKorea();
    const searchedJobs = [
      ...wantedJobs.map((job) => ({ ...job, source: 'wanted' })),
      ...jobKoreaJobs,
    ];
    result.searched = searchedJobs.length;

    const uniqueJobs = [...new Map(searchedJobs.map((job) => [getDedupKey(job), job])).values()];
    result.unique = uniqueJobs.length;

    const scoredJobs = [];
    for (let index = 0; index < uniqueJobs.length; index += 1) {
      const rawJob = uniqueJobs[index];
      const dedupReason = getDedupSkipReason(
        dedupCache.entries[getCrossRunDedupKey(rawJob)],
        Date.now()
      );
      if (dedupReason) {
        result.dedupSkipped += 1;
        result.skipped += 1;
        result.skippedJobs.push({
          id: rawJob.id,
          title: rawJob.position || rawJob.title || 'Unknown Title',
          company:
            rawJob.company?.name || rawJob.company_name || rawJob.company || 'Unknown Company',
          source: rawJob.source,
          reason: dedupReason,
        });
        continue;
      }

      try {
        const scoredJob =
          rawJob.source === 'jobkorea' ? await scoreJobKorea(rawJob) : await scoreJob(rawJob);
        scoredJobs.push(scoredJob);
        updateDedupEntry(dedupCache, scoredJob, 'scored', scoredJob.score);
        result.scored += 1;
      } catch (error) {
        result.failedJobs.push(mapFailedJob(rawJob, error));
        result.failed += 1;
        log('detail or scoring failed', { id: rawJob.id, error: summarizeError(error) });
      }

      if (index < uniqueJobs.length - 1) {
        await sleep(DETAIL_DELAY_MS);
      }
    }

    const relevantJobs = filterRelevantJobs(scoredJobs, log);
    result.relevant = relevantJobs.length;
    result.topJobs = relevantJobs.slice(0, 15).map(mapTopJob);

    for (const job of relevantJobs.slice(0, 30)) {
      await recordJobToElk(job, 'scored');
    }

    const wantedJobsToApply = relevantJobs.filter(
      (job) => job.source === 'wanted' && job.score >= REVIEW_MIN_SCORE && job.titleMatched
    );
    await applyToJobs(result, wantedJobsToApply, dedupCache, updateDedupEntry, sleep);

    const jobkoreaJobsToApply = relevantJobs.filter((job) => job.source === 'jobkorea');
    if (jobkoreaJobsToApply.length > 0) {
      await applyToJobKoreaJobs(result, jobkoreaJobsToApply, dedupCache, updateDedupEntry, sleep);
    }
  } catch (error) {
    result.failedJobs.push(createPipelineFailure(error));
    result.failed += 1;
    log('pipeline failed', summarizeError(error));
  } finally {
    await saveDedupCache(dedupCache);
  }

  await runProfileSync(result, log, summarizeError);
  result.timestamp = new Date().toISOString();

  await shipToElk('pipeline_completed', {
    searched: result.searched,
    unique: result.unique,
    scored: result.scored,
    relevant: result.relevant,
    applied: result.applied,
    skipped: result.skipped,
    failed: result.failed,
    dedup_skipped: result.dedupSkipped,
    wanted_apply_enabled: result.wantedApplyEnabled,
    session_warnings: result.sessionWarnings,
    top_companies: result.topJobs.slice(0, 5).map((job) => `${job.company} (${job.score})`),
  });

  if (result.failed > 0 && result.applied === 0) {
    process.exitCode = 1;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const result = createResult();
  result.failed = 1;
  result.failedJobs.push(createPipelineFailure(error));
  log('fatal pipeline error', summarizeError(error));
  process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
});
