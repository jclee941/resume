import { generateCoverLetterForJob } from './cover-letter.js';
import { classifyApplyError } from './apply-errors.js';
import { log, recordJobToElk, summarizeError } from './logging.js';
import { mapAppliedJob } from './result-state.js';

export async function executeSingleWantedApply(page, job, context) {
  const {
    session,
    profileName,
    profileMobile,
    resumeKey,
    result,
    appliedJobIds,
    dedupCache,
    updateDedupEntry,
    sleep,
  } = context;

  try {
    const jobUrl = `https://www.wanted.co.kr/wd/${job.id}`;
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(1500);

    const coverLetter = await generateCoverLetterForJob(job);

    const submitPayload = {
      email: session.email || '',
      username: profileName,
      mobile: profileMobile,
      job_id: job.id,
      resume_keys: [resumeKey],
      nationality_code: 'KR',
      visa: null,
      status: 'apply',
      ...(coverLetter ? { cover_letter: coverLetter } : {}),
    };

    const response = await page.evaluate(async (payload) => {
      const resp = await fetch('/api/chaos/applications/v1', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await resp.json().catch(() => ({}));
      return { status: resp.status, ok: resp.ok, body };
    }, submitPayload);

    if (!response.ok) {
      const message = response.body?.message || `API request failed: ${response.status}`;
      const error = new Error(message);
      error.statusCode = response.status;
      throw error;
    }

    result.appliedJobs.push(mapAppliedJob(job));
    result.applied += 1;
    appliedJobIds.add(String(job.id));
    updateDedupEntry(dedupCache, job, 'applied', job.score);
    log('applied', { id: job.id, title: job.title, company: job.company });
    await recordJobToElk(job, 'applied');
    return { success: true };
  } catch (error) {
    const classification = classifyApplyError(error);

    if (classification === 'already_applied') {
      result.skippedJobs.push({
        id: job.id,
        title: job.title,
        company: job.company,
        source: job.source,
        reason: classification,
      });
      result.skipped += 1;
      appliedJobIds.add(String(job.id));
      updateDedupEntry(dedupCache, job, 'applied', job.score);
      log('apply skipped', {
        id: job.id,
        reason: classification,
        error: summarizeError(error),
      });
      await recordJobToElk(job, classification);
      return { success: false, stop: false };
    }

    result.failedJobs.push({
      id: job.id,
      title: job.title,
      company: job.company,
      source: job.source,
      error: summarizeError(error),
    });
    result.failed += 1;
    log('apply failed', { id: job.id, reason: classification, error: summarizeError(error) });
    await recordJobToElk(job, classification);

    if (classification === 'auth_failed') {
      result.wantedApplyEnabled = false;
      return { success: false, stop: true };
    }
    if (classification === 'rate_limited') {
      return { success: false, stop: true };
    }

    return { success: false, stop: false };
  }
}
