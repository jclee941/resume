import { normalizeError } from '@resume/shared/errors';

function addJobResult(searchResults, job, action) {
  searchResults.jobs.push({
    id: job.sourceId || job.id,
    source: job.source,
    position: job.position || job.title,
    company: job.company,
    matchScore: job.matchScore,
    url: job.sourceUrl || job.url,
    action,
  });
}

function incrementPlatformApplied(searchResults, source) {
  if (searchResults.byPlatform[source]) {
    searchResults.byPlatform[source].applied++;
  }
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
    if (alreadyApplied) {
      searchResults.skipped++;
      continue;
    }

    if (dryRun) {
      addJobResult(searchResults, job, 'would_apply');
      await recordApplication(env, { job, source: job.source, status: 'pending' });
      appliedCount++;
      incrementPlatformApplied(searchResults, job.source);
      continue;
    }

    if (job.source === 'wanted') {
      const applied = await applyWantedJob({
        env,
        clients,
        job,
        searchResults,
        recordApplication,
        getWantedSession,
      });
      if (applied) {
        appliedCount++;
      }
      continue;
    }

    await recordApplication(env, { job, source: job.source, status: 'pending' });
    addJobResult(searchResults, job, 'saved_for_manual_apply');
    appliedCount++;
    incrementPlatformApplied(searchResults, job.source);
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
      searchResults.skipped++;
      return false;
    }

    clients.wanted.setCookies(cookies);
    const result = await clients.wanted.apply(job.sourceId || job.id);
    await recordApplication(env, { job, source: job.source, status: 'applied', result });
    addJobResult(searchResults, job, 'applied');
    incrementPlatformApplied(searchResults, job.source);
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
