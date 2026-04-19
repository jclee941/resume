import SessionManager from '../../src/shared/services/session/session-manager.js';

import { generateCoverLetterForJob } from './cover-letter.js';
import { APPLY_DELAY_MS, config } from './constants.js';
import { classifyApplyError } from './apply-errors.js';
import { extractAppliedJobIds, resolveResumeKey } from './job-helpers.js';
import { log, recordJobToElk, summarizeError } from './logging.js';
import { mapAppliedJob } from './result-state.js';

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

  const { chromium } = await import('playwright');
  let browser = null;

  try {
    const email = process.env.WANTED_EMAIL;
    const password = process.env.WANTED_PASSWORD;
    const clientId = process.env.WANTED_ONEID_CLIENT_ID;
    let oneidToken = null;

    if (email && password && clientId) {
      try {
        const tokenResp = await fetch('https://id-api.wanted.co.kr/v1/auth/token', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Origin: 'https://id.wanted.co.kr',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'oneid-agent': 'web',
          },
          body: JSON.stringify({
            grant_type: 'password',
            email,
            password,
            client_id: clientId,
            beforeUrl: 'https://www.wanted.co.kr/',
            stay_signed_in: true,
          }),
        });
        if (tokenResp.ok) {
          const payload = await tokenResp.json();
          oneidToken = payload?.token;
          log('OneID token minted for browser submission');
        }
      } catch (tokenError) {
        log('OneID token mint failed:', summarizeError(tokenError));
      }
    }

    if (!oneidToken) {
      const cookieStr =
        session.cookieString || (typeof session.cookies === 'string' ? session.cookies : '');
      const match = cookieStr.match(/WWW_ONEID_ACCESS_TOKEN=([^;\s]+)/);
      oneidToken = match?.[1] || null;
    }

    if (!oneidToken) {
      log('no OneID token available for browser submission, apply phase skipped');
      result.wantedApplyEnabled = false;
      return;
    }

    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await ctx.newPage();

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.setCookie', {
      name: 'WWW_ONEID_ACCESS_TOKEN',
      value: oneidToken,
      domain: '.wanted.co.kr',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
    await cdp.detach();

    await page.goto('https://www.wanted.co.kr/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(2000);
    log('browser ready for wanted submissions');

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
        appliedThisRun += 1;
        appliedJobIds.add(String(job.id));
        updateDedupEntry(dedupCache, job, 'applied', job.score);
        log('applied', { id: job.id, title: job.title, company: job.company });
        await recordJobToElk(job, 'applied');
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
          continue;
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
          break;
        }
        if (classification === 'rate_limited') {
          break;
        }
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
