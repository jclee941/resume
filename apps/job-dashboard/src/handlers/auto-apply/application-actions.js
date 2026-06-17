import { normalizeError } from '@resume/shared/errors';
import { appendDecisionTrace, getDecisionTrace } from './decision-trace.js';

function addJobResult(searchResults, job, action) {
  searchResults.jobs.push({
    id: job.sourceId || job.id,
    source: job.source,
    position: job.position || job.title,
    company: job.company,
    matchScore: job.matchScore,
    sourceUrl: job.sourceUrl,
    url: job.sourceUrl || job.url,
    action,
    adapterBacked: job.adapterBacked === true,
    decisionTrace: getDecisionTrace(job),
  });
}

function incrementPlatformApplied(searchResults, source) {
  if (searchResults.byPlatform[source]) {
    searchResults.byPlatform[source].applied++;
  }
}

function hasHumanApprovalForDestination(job, destination) {
  const approval =
    job?.humanApproval ||
    job?.workflowApprovalMetadata?.humanApproval ||
    job?.approvalMetadata?.humanApproval;
  return approval?.status === 'approved' && approval?.destination === destination;
}

export async function applyMatchedJobs({
  env,
  clients,
  matchedJobs,
  dryRun,
  remaining,
  searchResults,
  isAlreadyApplied,
  recordApplication,
  getWantedSession,
}) {
  let appliedCount = 0;

  for (const job of matchedJobs) {
    if (appliedCount >= remaining) break;

    const alreadyApplied = await isAlreadyApplied(env, job.sourceId || job.id, job.source);
    let tracedJob = appendDecisionTrace(job, {
      stage: 'duplicate_checked',
      outcome: alreadyApplied ? 'skipped' : 'passed',
      reason: alreadyApplied ? 'already_applied' : 'not_previously_applied',
    });

    if (alreadyApplied) {
      addJobResult(searchResults, tracedJob, 'skipped_already_applied');
      searchResults.skipped++;
      continue;
    }

    if (dryRun) {
      tracedJob = appendDecisionTrace(tracedJob, {
        stage: 'dry_run_recorded',
        outcome: 'would_apply',
        reason: 'dry_run',
      });
      addJobResult(searchResults, tracedJob, 'would_apply');
      await recordApplication(env, { job: tracedJob, source: tracedJob.source, status: 'pending' });
      appliedCount++;
      incrementPlatformApplied(searchResults, tracedJob.source);
      continue;
    }

    if (tracedJob.source === 'wanted') {
      const applied = await applyWantedJob({
        env,
        clients,
        job: tracedJob,
        searchResults,
        recordApplication,
        getWantedSession,
      });
      if (applied) {
        appliedCount++;
      }
      continue;
    }

    await recordApplication(env, { job: tracedJob, source: tracedJob.source, status: 'pending' });
    addJobResult(searchResults, tracedJob, 'saved_for_manual_apply');
    appliedCount++;
    incrementPlatformApplied(searchResults, tracedJob.source);
  }

  searchResults.applied = appliedCount;
}

async function applyWantedJob({
  env,
  clients,
  job,
  searchResults,
  recordApplication,
  getWantedSession,
}) {
  try {
    const cookies = await getWantedSession(env);
    if (!cookies) {
      const tracedJob = appendDecisionTrace(job, {
        stage: 'session_checked',
        outcome: 'skipped',
        reason: 'missing_wanted_session',
      });
      addJobResult(searchResults, tracedJob, 'skipped_no_session');
      searchResults.skipped++;
      return false;
    }

    let tracedJob = appendDecisionTrace(job, {
      stage: 'session_checked',
      outcome: 'passed',
      reason: 'wanted_session_available',
    });
    if (!hasHumanApprovalForDestination(tracedJob, 'wanted')) {
      tracedJob = appendDecisionTrace(tracedJob, {
        stage: 'human_approval_checked',
        outcome: 'skipped',
        reason: 'missing_explicit_human_approval',
      });
      addJobResult(searchResults, tracedJob, 'skipped_human_approval_required');
      searchResults.skipped++;
      return false;
    }

    tracedJob = appendDecisionTrace(tracedJob, {
      stage: 'human_approval_checked',
      outcome: 'passed',
      reason: 'explicit_human_approval',
    });
    clients.wanted.setCookies(cookies);
    const result = await clients.wanted.apply(tracedJob.sourceId || tracedJob.id);
    await recordApplication(env, {
      job: tracedJob,
      source: tracedJob.source,
      status: 'applied',
      result,
    });
    addJobResult(searchResults, tracedJob, 'applied');
    incrementPlatformApplied(searchResults, tracedJob.source);
    return true;
  } catch (err) {
    const normalized = normalizeError(err, {
      handler: 'AutoApply',
      action: 'apply',
      platform: job.source,
      jobId: job.sourceId,
    });
    console.error(
      `[AutoApply] Apply failed for ${job.source}/${job.sourceId}:`,
      normalized.message
    );
    searchResults.errors++;
    await recordApplication(env, {
      job,
      source: job.source,
      status: 'error',
      result: { error: normalized.message },
    });
    return false;
  }
}
