import SessionManager from '../../src/shared/services/session/session-manager.js';

import { generateCoverLetterForJob } from './cover-letter.js';
import { APPLY_DELAY_MS, config } from './constants.js';
import { log, recordJobToElk, summarizeError } from './logging.js';
import { mapAppliedJob, mapFailedJob } from './result-state.js';

export async function applyToJobKoreaJobs(result, jobs, dedupCache, updateDedupEntry, sleep) {
  const session = SessionManager.load('jobkorea');
  if (!session?.cookies && !session?.cookieString) {
    log('jobkorea session unavailable, jobkorea apply phase skipped');
    return;
  }

  const applyDelayMs = config.limits?.delayBetweenApps ?? APPLY_DELAY_MS;
  const maxPerPlatform = config.limits?.maxPerPlatform?.jobkorea ?? 10;
  let appliedThisRun = 0;

  const { chromium } = await import('playwright');
  let browser = null;

  try {
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

    const cookies = Array.isArray(session.cookies) ? session.cookies : [];
    if (cookies.length > 0) {
      await ctx.addCookies(cookies);
      log('jobkorea cookies loaded:', cookies.length);
    }

    const page = await ctx.newPage();
    log('jobkorea browser ready for submissions');

    for (let index = 0; index < jobs.length; index += 1) {
      if (appliedThisRun >= maxPerPlatform) {
        log('jobkorea apply limit reached', { applied: appliedThisRun, limit: maxPerPlatform });
        break;
      }

      const job = jobs[index];
      const jobUrl = job.url || job.sourceUrl;
      if (!jobUrl) {
        log('jobkorea: skipping job without URL', { id: job.id, title: job.title });
        continue;
      }

      try {
        await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);

        const loginLink = await page
          .getByText('로그인', { exact: true })
          .first()
          .isVisible()
          .catch(() => false);
        if (loginLink) {
          log('jobkorea: not logged in, skipping apply phase');
          result.sessionWarnings.push('jobkorea: not logged in during apply');
          break;
        }

        const applyBtn = page.getByRole('button', { name: '즉시 지원' }).first();
        if (!(await applyBtn.isVisible().catch(() => false))) {
          result.skippedJobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            source: 'jobkorea',
            reason: 'no_apply_button',
          });
          result.skipped += 1;
          log('jobkorea: no apply button', { id: job.id, title: job.title });
          continue;
        }

        await applyBtn.click();
        await sleep(3000);

        const alreadyApplied = await page
          .getByText('이미 지원한')
          .first()
          .isVisible()
          .catch(() => false);
        if (alreadyApplied) {
          result.skippedJobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            source: 'jobkorea',
            reason: 'already_applied',
          });
          result.skipped += 1;
          updateDedupEntry(dedupCache, job, 'applied', job.score);
          log('jobkorea: already applied', { id: job.id });
          continue;
        }

        const coverLetterArea = page
          .locator(
            'textarea[name="coverLetter"], textarea[name="cover_letter"], textarea[name="self_introduction"], textarea[placeholder*="자기소개"], textarea[placeholder*="지원동기"]'
          )
          .first();
        if (await coverLetterArea.isVisible().catch(() => false)) {
          const jkCoverLetter = await generateCoverLetterForJob(job);
          if (jkCoverLetter) {
            await coverLetterArea.fill(jkCoverLetter);
            await sleep(500);
            log('jobkorea: cover letter filled', { id: job.id });
          }
        }

        const resumeRadio = page
          .locator('.resume_item input[type="radio"], .apply_resume_list input[type="radio"]')
          .first();
        if (await resumeRadio.isVisible().catch(() => false)) {
          await resumeRadio.click();
          await sleep(500);
        }

        const finalBtn = page.getByRole('button', { name: '지원하기' }).first();
        if (await finalBtn.isVisible().catch(() => false)) {
          await finalBtn.click();
          await sleep(3000);
        }

        const success = await page
          .getByText(/지원.{0,3}(완료|하였)/)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        if (success) {
          result.appliedJobs.push(mapAppliedJob(job));
          result.applied += 1;
          appliedThisRun += 1;
          updateDedupEntry(dedupCache, job, 'applied', job.score);
          log('jobkorea applied', { id: job.id, title: job.title, company: job.company });
          await recordJobToElk(job, 'applied');
        } else {
          result.appliedJobs.push(mapAppliedJob(job));
          result.applied += 1;
          appliedThisRun += 1;
          updateDedupEntry(dedupCache, job, 'applied', job.score);
          log('jobkorea applied (no explicit confirm)', { id: job.id });
          await recordJobToElk(job, 'applied');
        }
      } catch (error) {
        result.failedJobs.push(mapFailedJob(job, error));
        result.failed += 1;
        log('jobkorea apply failed', { id: job.id, error: summarizeError(error) });
        await recordJobToElk(job, 'apply_failed');
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
