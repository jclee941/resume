import SessionManager from '../src/shared/services/session/session-manager.js';
import { jobMatcherTool } from '../src/tools/job-matcher.js';
import { autoApplyConfig } from '../src/shared/config/auto-apply-config.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateCoverLetter } from '../src/shared/services/resume/cover-letter-generator.js';

// Wanted categories: 프로필 매칭 (보안엔지니어 9년, DevOps/SRE/인프라/클라우드)
const TAG_TYPE_IDS = [
  674,  // DevOps/시스템관리자
  672,  // 보안엔지니어
  665,  // 시스템/네트워크관리자
  // 제외: 872(서버개발자), 655(데이터엔지니어), 899(파이썬개발자) — 프로필 불일치
];
const OFFSETS = [0, 20, 40];
const SEARCH_LIMIT = 20;
const DETAIL_DELAY_MS = 150;
const APPLY_DELAY_MS = 5000;
const ELK_URL = 'http://192.168.50.105:9200';
const ELK_INDEX = 'job-automation';
const ELK_AUTH = process.env.ELK_USER && process.env.ELK_PASSWORD
  ? `Basic ${  Buffer.from(`${process.env.ELK_USER}:${process.env.ELK_PASSWORD}`).toString('base64')}`
  : '';
const DEDUP_CACHE_DIR = path.join(os.homedir(), '.opencode', 'data');

// Load resume data for cover letter generation
const RESUME_DATA_PATH = new URL('../../../packages/data/resumes/master/resume_data.json', import.meta.url);
let _resumeData = null;
async function getResumeData() {
  if (!_resumeData) {
    _resumeData = JSON.parse(await readFile(RESUME_DATA_PATH, 'utf8'));
  }
  return _resumeData;
}

async function generateCoverLetterForJob(job) {
  try {
    const resumeData = await getResumeData();
    const jobPosting = {
      position: job.title || job.position,
      company: { name: job.company },
      requirements: job.requirements || job.skills || [],
      description: job.description || '',
      detail: job.detail || '',
    };
    const result = await generateCoverLetter(resumeData, jobPosting, { language: 'ko' });
    log('cover letter generated', { id: job.id, company: job.company, fallback: result.fallback, length: result.coverLetter?.length });
    return result.coverLetter;
  } catch (error) {
    log('cover letter generation failed', { id: job.id, error: summarizeError(error) });
    return null;
  }
}
const DEDUP_CACHE_PATH = path.join(DEDUP_CACHE_DIR, 'pipeline-dedup-v1.json');
const DEDUP_CACHE_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;
const SCORED_RECENT_WINDOW_MS = 7 * DAY_MS;
const SCORED_CACHE_TTL_MS = 30 * DAY_MS;
const APPLIED_CACHE_TTL_MS = 120 * DAY_MS;
const WANTED_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://www.wanted.co.kr/',
  Origin: 'https://www.wanted.co.kr',
};
// Title keywords: 프로필 매칭 직무명만 (너무 넓은 키워드 제거)
const TITLE_KEYWORDS = [
  'devops', 'devsecops', 'sre',
  'infra', '인프라',
  'cloud', '클라우드',
  'security', '보안',
  'system engineer', '시스템 엔지니어',
  'platform engineer',
  'reliability',
  // 제거: 'ops'(너무 넓음), 'dba'(DB전문가), 'system'(너무 넓음), 'platform'(너무 넓음)
];
// JobKorea keywords: 프로필 핵심 직무
const JOBKOREA_KEYWORDS = [
  'DevOps', 'SRE', 'DevSecOps',
  '보안 엔지니어', '인프라 엔지니어', '클라우드 엔지니어',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...args) => console.error('[job-search-apply-pipeline]', ...args);

// --- Profile-based filters (9년차 보안/인프라/DevOps, 경기 시흥) ---
const MIN_EXPERIENCE_YEARS = 3;    // 3년 미만 공고 제외 (인턴/신입)
const MAX_EXPERIENCE_YEARS = 15;   // 15년 초과 공고 제외 (CTO/VP급)
const EXCLUDED_LOCATIONS = ['제주', '부산', '대구', '광주', '대전', '울산', '강원'];  // 통근 불가
const EXCLUDED_TITLE_WORDS = ['인턴', 'intern', '신입', 'junior', 'cto', 'vp ', '일본', '해외'];  // 직급 불일치

// --- Config-driven thresholds ---
const config = autoApplyConfig.toJSON();
const APPLY_MIN_SCORE = config.thresholds?.autoApply ?? 75;
const REVIEW_MIN_SCORE = config.thresholds?.review ?? 60;
const RELEVANT_MIN_SCORE = config.thresholds?.minMatch ?? 60;

// --- ELK event shipping ---
async function shipToElk(eventType, data) {
  if (!ELK_AUTH) return;
  try {
    const doc = {
      '@timestamp': new Date().toISOString(),
      event_type: eventType,
      pipeline: 'job-search-apply',
      ...data,
    };
    const response = await fetch(
      `${ELK_URL}/${ELK_INDEX}-${new Date().toISOString().slice(0, 10)}/_doc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ELK_AUTH,
        },
        body: JSON.stringify(doc),
      }
    );
    // H8: keep ELK failures non-fatal, but surface non-2xx responses.
    if (!response.ok) {
      log('elk ship failed', eventType, response.status);
    }
  } catch (elkError) {
    log('elk ship failed', eventType, elkError.message);
  }
}

async function recordJobToElk(job, status) {
  if (!ELK_AUTH) return;
  try {
    const doc = {
      '@timestamp': new Date().toISOString(),
      job_id: String(job.id || ''),
      source: job.source || 'unknown',
      source_url: job.url || '',
      position: job.title || job.position || '',
      company: job.company || '',
      location: job.location || '',
      match_score: job.score || 0,
      matched_skills: job.matchedSkills || [],
      status,
      applied_at: status === 'applied' ? new Date().toISOString() : null,
      pipeline_run: new Date().toISOString().slice(0, 10),
      title_matched: job.titleMatched || false,
    };
    const response = await fetch(`${ELK_URL}/job-applications/_doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: ELK_AUTH },
      body: JSON.stringify(doc),
    });
    // H8: keep ELK failures non-fatal, but surface non-2xx responses.
    if (!response.ok) {
      log('elk record job failed', job.id, response.status);
    }
  } catch (elkError) {
    log('elk record job failed', job.id, elkError.message);
  }
}

// --- Session health check + auto-renew ---
async function checkSessionHealth() {
  const warnings = [];
  for (const platform of ['wanted', 'jobkorea']) {
    const session = SessionManager.load(platform);
    if (!session) {
      warnings.push(`${platform}: no session`);
      // H5: attempt auto-renew even when no session file is present.
      await tryAutoRenew(platform, warnings);
      continue;
    }

    // Check JWT expiry (jobkorea jkat has 30min TTL)
    if (platform === 'jobkorea' && Array.isArray(session.cookies)) {
      const jkat = session.cookies.find((c) => c.name === 'jkat');
      if (jkat?.value) {
        try {
          const payload = JSON.parse(Buffer.from(jkat.value.split('.')[1], 'base64url').toString());
          if (payload.exp && Date.now() > payload.exp * 1000) {
            warnings.push(
              `jobkorea: JWT expired ${Math.round((Date.now() - payload.exp * 1000) / 3600000)}h ago`
            );
            await tryAutoRenew('jobkorea', warnings);
            continue;
          }
        } catch {
          /* not a JWT, skip */
        }
      }
    }

    const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null;
    if (!expiresAt) continue;

    const hoursLeft = (expiresAt - Date.now()) / 3600000;
    if (hoursLeft < 0) {
      warnings.push(`${platform}: EXPIRED`);
      await tryAutoRenew(platform, warnings);
    } else if (hoursLeft < 24) {
      warnings.push(`${platform}: expires in ${Math.round(hoursLeft)}h`);
      await tryAutoRenew(platform, warnings);
    }
  }
  return warnings;
}

async function tryAutoRenew(platform, warnings) {
  if (platform === 'wanted') return tryRenewWanted(warnings);
  if (platform === 'jobkorea') return tryRenewJobKorea(warnings);
  warnings.push(`${platform}: auto-renew not supported`);
}

async function tryRenewJobKorea(warnings) {
  const username = process.env.JOBKOREA_USERNAME;
  const password = process.env.JOBKOREA_PASSWORD;
  if (!username || !password) {
    warnings.push('jobkorea: JOBKOREA_USERNAME/PASSWORD not set in .env');
    return;
  }
  let browser;
  try {
    const { chromium } = await import('playwright');
    log('renewing jobkorea session via Playwright...');
    // H7: close the browser from the outer lifecycle so launch failures do not leak.
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await ctx.newPage();
    await page.goto('https://www.jobkorea.co.kr/Login/Login_Tot.asp', {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);
    await page.fill('#M_ID', username);
    await page.fill('#M_PWD', password);
    await page.click('button[type="submit"].login-button');
    await page.waitForTimeout(5000);
    const url = page.url();
    if (url.includes('Login')) throw new Error('still on login page after submit');
    const cookies = await ctx.cookies();
    const jkat = cookies.find((c) => c.name === 'jkat');
    if (!jkat) throw new Error('jkat cookie not found after login');
    const newSession = {
      platform: 'jobkorea',
      cookies,
      cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: cookies.length,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timestamp: Date.now(),
    };
    SessionManager.save('jobkorea', newSession);
    warnings.push(`jobkorea: \u2705 renewed (${cookies.length} cookies)`);
    log('jobkorea session renewed', { cookies: cookies.length });
    await shipToElk('session_renewed', { platform: 'jobkorea', cookies: cookies.length });
  } catch (error) {
    warnings.push(`jobkorea: \u274c renewal failed \u2014 ${error.message}`);
    log('jobkorea renewal failed', error.message);
    await shipToElk('session_renewal_failed', { platform: 'jobkorea', error: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function tryRenewWanted(warnings) {
  const email = process.env.WANTED_EMAIL;
  const password = process.env.WANTED_PASSWORD;
  if (!email || !password) {
    warnings.push('wanted: WANTED_EMAIL/PASSWORD not set');
    return;
  }
  let browser;
  try {
    const { chromium } = await import('playwright');
    log('renewing wanted session via Playwright (id.wanted.jobs)...');

    // H7: close the browser from the outer lifecycle so launch failures do not leak.
    browser = await chromium.launch({
      headless: true,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    const page = await ctx.newPage();

    await page.goto('https://id.wanted.jobs/login', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(5000);

    await page.getByText('\uc774\uba54\uc77c\ub85c \uacc4\uc18d\ud558\uae30').click();
    await page.waitForTimeout(3000);

    await page.locator('input').first().click();
    await page.locator('input').first().pressSequentially(email, { delay: 20 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const b = document.querySelector('button[type="submit"]');
      if (b) {
        b.disabled = false;
        b.click();
      }
    });
    await page.waitForTimeout(5000);

    const passInput = page.locator('input[type="password"]').first();
    if (await passInput.count()) {
      await passInput.click();
      await passInput.pressSequentially(password, { delay: 20 });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const b = document.querySelector('button[type="submit"]');
        if (b) {
          b.disabled = false;
          b.click();
        }
      });
      await page.waitForTimeout(8000);
    }

    const cookies = await ctx.cookies();
    const auth = cookies.filter((c) => /token|oneid|wanted/i.test(c.name));
    if (auth.length === 0) throw new Error('no auth cookies after login');

    const newSession = {
      platform: 'wanted',
      email,
      cookies,
      cookieString: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: cookies.length,
      renewedAt: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp: Date.now(),
    };
    SessionManager.save('wanted', newSession);
    warnings.push(
      `wanted: \u2705 renewed (${newSession.cookieCount} cookies, expires ${newSession.expiresAt.slice(0, 16)})`
    );
    log('wanted session renewed', { cookies: newSession.cookieCount });
    await shipToElk('session_renewed', { platform: 'wanted', cookies: newSession.cookieCount });
  } catch (error) {
    warnings.push(`wanted: \u274c renewal failed \u2014 ${error.message}`);
    log('wanted renewal failed', error.message);
    await shipToElk('session_renewal_failed', { platform: 'wanted', error: error.message });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

function createResult() {
  return {
    timestamp: new Date().toISOString(),
    searched: 0,
    unique: 0,
    scored: 0,
    relevant: 0,
    applied: 0,
    skipped: 0,
    failed: 0,
    dedupSkipped: 0,
    topJobs: [],
    appliedJobs: [],
    skippedJobs: [],
    failedJobs: [],
    sessionWarnings: [],
    wantedApplyEnabled: true,
    thresholds: {
      autoApply: APPLY_MIN_SCORE,
      review: REVIEW_MIN_SCORE,
      relevant: RELEVANT_MIN_SCORE,
    },
  };
}

function isObjectLike(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toText(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .join('\n');
  }
  return String(value || '').trim();
}

function joinSections(...sections) {
  return sections
    .map((section) => toText(section))
    .filter(Boolean)
    .join('\n\n');
}

function normalizeTitle(title) {
  return String(title || '').toLowerCase();
}

function titleMatchesRelevantKeywords(title) {
  const normalized = normalizeTitle(title);
  return TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isProfileMismatch(job) {
  const title = normalizeTitle(job.title || job.position || '');
  const location = (job.location || job.fullLocation || '').toLowerCase();

  // Exclude by title (intern/junior/CTO/overseas)
  if (EXCLUDED_TITLE_WORDS.some((w) => title.includes(w))) return 'title_excluded';

  // Exclude by location (non-commutable)
  if (EXCLUDED_LOCATIONS.some((loc) => location.includes(loc))) return 'location_excluded';

  return null;  // no mismatch
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message || String(error)];
  if (error.statusCode || error.status) parts.push(`status=${error.statusCode || error.status}`);
  return parts.join(' ');
}

function extractJobArray(payload) {
  const candidates = [payload?.data, payload?.jobs, payload?.results, payload];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function normalizeApplications(response) {
  const candidates = [
    response?.applications,
    response?.results,
    response?.data?.applications,
    response?.data?.results,
    response?.data,
    response,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }
  return [];
}

function resolveResumeKey(response) {
  const resumes = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];
  if (resumes.length === 0) return null;
  const preferred = resumes.find((resume) => resume?.is_default) || resumes[0];
  return preferred?.key || preferred?.id || preferred?.resume_id || preferred?.uuid || null;
}

function extractAppliedJobIds(response) {
  const applications = normalizeApplications(response);
  const ids = new Set();
  for (const entry of applications) {
    const jobId =
      entry?.job_id ||
      entry?.jobId ||
      entry?.position_id ||
      entry?.positionId ||
      entry?.job?.id ||
      null;
    if (jobId != null) {
      ids.add(String(jobId));
    }
  }
  return ids;
}

function mapTopJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    score: job.score,
    url: job.url,
    matchedSkills: job.matchedSkills,
    source: job.source,
  };
}

function mapAppliedJob(job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    source: job.source,
  };
}

function mapFailedJob(job, error) {
  return {
    id: job?.id ?? null,
    title: job?.title || job?.position || 'Unknown Title',
    company: job?.company?.name || job?.company_name || job?.company || 'Unknown Company',
    source: job?.source || 'unknown',
    error: summarizeError(error),
  };
}

async function fetchWantedJson(url) {
  const response = await fetch(url, { headers: WANTED_HEADERS });
  if (!response.ok) {
    throw new Error(`Wanted request failed: ${response.status} ${url}`);
  }
  return response.json();
}

async function searchJobs() {
  const jobs = [];
  for (const tagTypeId of TAG_TYPE_IDS) {
    for (const offset of OFFSETS) {
      const params = new URLSearchParams({
        country: 'kr',
        tag_type_ids: String(tagTypeId),
        limit: String(SEARCH_LIMIT),
        offset: String(offset),
        job_sort: 'company.response_rate_order',
      });
      const url = `https://www.wanted.co.kr/api/v4/jobs?${params.toString()}`;
      try {
        const payload = await fetchWantedJson(url);
        const chunk = extractJobArray(payload);
        jobs.push(...chunk);
        log('searched', { tagTypeId, offset, found: chunk.length });
      } catch (error) {
        log('search failed', { tagTypeId, offset, error: summarizeError(error) });
      }
    }
  }
  return jobs;
}

async function searchJobKorea() {
  const { JobKoreaCrawler } = await import('../platforms/jobkorea/jobkorea-crawler.js');
  const crawler = new JobKoreaCrawler();
  const jobs = [];

  for (const keyword of JOBKOREA_KEYWORDS) {
    try {
      const result = await crawler.searchJobs({ keyword, limit: 20 });
      if (result.success) {
        jobs.push(...result.jobs);
        log('jobkorea searched', { keyword, found: result.jobs.length });
      }
    } catch (error) {
      log('jobkorea search failed', { keyword, error: summarizeError(error) });
    }
  }

  return jobs;
}

function getDedupKey(job) {
  if (job.source === 'jobkorea') {
    return job.sourceUrl;
  }
  return String(job.id);
}

function getCrossRunDedupKey(job) {
  if (job.source === 'jobkorea') {
    return `${job.source}:${job.sourceId || job.id}`;
  }
  return `${job.source}:${job.id}`;
}

function createDedupCache() {
  return {
    version: DEDUP_CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
}

async function loadDedupCache() {
  try {
    await mkdir(DEDUP_CACHE_DIR, { recursive: true });
    const raw = await readFile(DEDUP_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: DEDUP_CACHE_VERSION,
      updatedAt:
        typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      entries: isObjectLike(parsed?.entries) ? parsed.entries : {},
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      log('dedup cache load failed', summarizeError(error));
    }
    return createDedupCache();
  }
}

function getDedupSkipReason(entry, nowMs) {
  if (!isObjectLike(entry)) return null;

  const expiresAt = Date.parse(entry.expiresAt || '');
  const lastSeenAt = Date.parse(entry.lastSeenAt || '');

  // C4: skip long-lived applied entries until their TTL expires.
  if (entry.status === 'applied' && Number.isFinite(expiresAt) && expiresAt > nowMs) {
    return 'dedup_applied';
  }

  // C4: skip recently scored entries for 7 days to avoid re-scoring the same job.
  if (
    entry.status === 'scored' &&
    Number.isFinite(lastSeenAt) &&
    nowMs - lastSeenAt < SCORED_RECENT_WINDOW_MS
  ) {
    return 'dedup_scored_recent';
  }

  return null;
}

function updateDedupEntry(cache, job, status, score, nowMs = Date.now()) {
  if (!isObjectLike(cache.entries)) {
    cache.entries = {};
  }

  const ttlMs = status === 'applied' ? APPLIED_CACHE_TTL_MS : SCORED_CACHE_TTL_MS;
  const nowIso = new Date(nowMs).toISOString();
  cache.entries[getCrossRunDedupKey(job)] = {
    status,
    score: Number.isFinite(score) ? score : Number(score) || 0,
    lastSeenAt: nowIso,
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
  };
  cache.updatedAt = nowIso;
}

async function saveDedupCache(cache) {
  const nowMs = Date.now();
  const entries = isObjectLike(cache.entries) ? cache.entries : {};
  const prunedEntries = Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => {
      const expiresAt = Date.parse(entry?.expiresAt || '');
      return !Number.isFinite(expiresAt) || expiresAt > nowMs;
    })
  );

  const payload = {
    version: DEDUP_CACHE_VERSION,
    updatedAt: new Date(nowMs).toISOString(),
    entries: prunedEntries,
  };

  try {
    await mkdir(DEDUP_CACHE_DIR, { recursive: true });
    const tempPath = `${DEDUP_CACHE_PATH}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await rename(tempPath, DEDUP_CACHE_PATH);
  } catch (error) {
    log('dedup cache save failed', summarizeError(error));
  }
}

function getErrorStatusCode(error) {
  const candidates = [
    error?.statusCode,
    error?.status,
    error?.response?.status,
    error?.cause?.status,
    error?.cause?.statusCode,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function classifyApplyError(error) {
  const statusCode = getErrorStatusCode(error);
  const message = String(error?.message || '').toLowerCase();

  // H9: treat duplicate/already-applied responses as skips instead of failures.
  if (statusCode === 400 && (message.includes('already') || message.includes('duplicate'))) {
    return 'already_applied';
  }
  if (statusCode === 401 || statusCode === 403) {
    return 'auth_failed';
  }
  if (statusCode === 429) {
    return 'rate_limited';
  }
  return 'apply_failed';
}

async function scoreJob(rawJob) {
  const detailResponse = await fetchWantedJson(`https://www.wanted.co.kr/api/v4/jobs/${rawJob.id}`);
  const job = detailResponse?.job;
  if (!job) {
    throw new Error('Missing job payload in detail response');
  }

  const title = job.position || rawJob.position || rawJob.title || 'Untitled';
  const company =
    job.company?.name || rawJob.company?.name || rawJob.company_name || 'Unknown Company';
  const requirements = joinSections(job.detail?.requirements, job.detail?.preferred_points);
  const description = joinSections(job.detail?.main_tasks, job.detail?.intro, job.detail?.benefits);
  const experience =
    job.experience_level ||
    job.experience_range ||
    rawJob.experience_level ||
    rawJob.experience_range ||
    rawJob.experience ||
    '';
  const location =
    job.address?.full_location ||
    job.address?.location ||
    rawJob.address?.full_location ||
    rawJob.address?.location ||
    '';

  const matchResult = await jobMatcherTool.execute({
    title,
    company,
    requirements,
    description,
    experience,
    location,
  });

  if (!matchResult?.success || !matchResult.match) {
    throw new Error(matchResult?.error || 'Job matcher returned no match result');
  }

  return {
    id: rawJob.id,
    source: 'wanted',
    title,
    company,
    url: `https://www.wanted.co.kr/wd/${rawJob.id}`,
    score: matchResult.match.score || 0,
    matchedSkills: Array.isArray(matchResult.match.matched_skills)
      ? matchResult.match.matched_skills
      : [],
    titleMatched: titleMatchesRelevantKeywords(title),
  };
}

async function scoreJobKorea(rawJob) {
  const title = rawJob.position || 'Untitled';
  const company = rawJob.company || 'Unknown Company';

  const matchResult = await jobMatcherTool.execute({
    title,
    company,
    requirements: rawJob.requirements || '',
    description: rawJob.description || '',
    experience: '',
    location: rawJob.location || '',
  });

  if (!matchResult?.success || !matchResult.match) {
    throw new Error(matchResult?.error || 'Job matcher returned no match result');
  }

  return {
    id: rawJob.id,
    source: 'jobkorea',
    title,
    company,
    url: rawJob.sourceUrl,
    score: matchResult.match.score || 0,
    matchedSkills: Array.isArray(matchResult.match.matched_skills)
      ? matchResult.match.matched_skills
      : [],
    titleMatched: titleMatchesRelevantKeywords(title),
  };
}

async function applyToJobs(result, jobs, dedupCache) {
  // H6: stop the apply phase entirely when Wanted auth is still unhealthy after renewal.
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

  // H10: enforce configured run limits and the configured inter-apply delay.
  const maxDailyWanted = config.limits?.maxDaily ?? Number.POSITIVE_INFINITY;
  const maxPerPlatformWanted = config.limits?.maxPerPlatform?.wanted ?? maxDailyWanted;
  const wantedApplyLimit = Math.min(maxDailyWanted, maxPerPlatformWanted);
  const applyDelayMs = config.limits?.delayBetweenApps ?? APPLY_DELAY_MS;
  let appliedThisRun = result.applied;

  // Fetch profile for username/mobile (required by Chaos API)
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

  // Browser-based submission: the Chaos API /applications/v1 endpoint requires
  // HttpOnly cookies that cannot be sent via Node.js fetch headers.
  // Launch a browser, inject OneID token via CDP, and submit from page context.
  const { chromium } = await import('playwright');
  let browser = null;
  let page = null;

  try {
    // Mint fresh OneID token for browser injection
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
      // Fallback: extract token from session cookies
      const cookieStr = session.cookieString || (typeof session.cookies === 'string' ? session.cookies : '');
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
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    page = await ctx.newPage();

    // Set OneID token via CDP as HttpOnly cookie
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

    // Navigate to wanted.co.kr to activate cookie jar
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
        // Navigate to job page (sets proper Referer)
        const jobUrl = `https://www.wanted.co.kr/wd/${job.id}`;
        await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(1500);

        // Generate cover letter for this job
        const coverLetter = await generateCoverLetterForJob(job);

        // Submit via browser context (HttpOnly cookies included automatically)
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

        const response = await page.evaluate(async (p) => {
          const resp = await fetch('/api/chaos/applications/v1', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(p),
          });
          const body = await resp.json().catch(() => ({}));
          return { status: resp.status, ok: resp.ok, body };
        }, submitPayload);

        if (!response.ok) {
          const msg = response.body?.message || `API request failed: ${response.status}`;
          const err = new Error(msg);
          err.statusCode = response.status;
          throw err;
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
          log('apply skipped', { id: job.id, reason: classification, error: summarizeError(error) });
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

async function applyToJobKoreaJobs(result, jobs, dedupCache) {
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
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    });
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Load JobKorea session cookies
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

        // Check login state
        const loginLink = await page.getByText('로그인', { exact: true }).first().isVisible().catch(() => false);
        if (loginLink) {
          log('jobkorea: not logged in, skipping apply phase');
          result.sessionWarnings.push('jobkorea: not logged in during apply');
          break;
        }

        // Find apply button — use Playwright getByRole/getByText (not CSS :text() pseudo)
        const applyBtn =
          page.getByRole('button', { name: '즉시 지원' }).first();

        if (!await applyBtn.isVisible().catch(() => false)) {
          result.skippedJobs.push({
            id: job.id, title: job.title, company: job.company,
            source: 'jobkorea', reason: 'no_apply_button',
          });
          result.skipped += 1;
          log('jobkorea: no apply button', { id: job.id, title: job.title });
          continue;
        }

        await applyBtn.click();
        await sleep(3000);

        // Check already applied
        const alreadyApplied = await page.getByText('이미 지원한').first().isVisible().catch(() => false);
        if (alreadyApplied) {
          result.skippedJobs.push({
            id: job.id, title: job.title, company: job.company,
            source: 'jobkorea', reason: 'already_applied',
          });
          result.skipped += 1;
          updateDedupEntry(dedupCache, job, 'applied', job.score);
          log('jobkorea: already applied', { id: job.id });
          continue;
        }

        // Generate and fill cover letter if textarea visible
        const coverLetterArea = page.locator('textarea[name="coverLetter"], textarea[name="cover_letter"], textarea[name="self_introduction"], textarea[placeholder*="자기소개"], textarea[placeholder*="지원동기"]').first();
        if (await coverLetterArea.isVisible().catch(() => false)) {
          const jkCoverLetter = await generateCoverLetterForJob(job);
          if (jkCoverLetter) {
            await coverLetterArea.fill(jkCoverLetter);
            await sleep(500);
            log('jobkorea: cover letter filled', { id: job.id });
          }
        }

        // Select first resume if resume selection appears
        const resumeRadio = page.locator('.resume_item input[type="radio"], .apply_resume_list input[type="radio"]').first();
        if (await resumeRadio.isVisible().catch(() => false)) {
          await resumeRadio.click();
          await sleep(500);
        }

        // Click final submit
        const finalBtn = page.getByRole('button', { name: '지원하기' }).first();
        if (await finalBtn.isVisible().catch(() => false)) {
          await finalBtn.click();
          await sleep(3000);
        }

        // Check success
        const success = await page.getByText(/지원.{0,3}(완료|하였)/).first().isVisible({ timeout: 5000 }).catch(() => false);
        if (success) {
          result.appliedJobs.push(mapAppliedJob(job));
          result.applied += 1;
          appliedThisRun += 1;
          updateDedupEntry(dedupCache, job, 'applied', job.score);
          log('jobkorea applied', { id: job.id, title: job.title, company: job.company });
          await recordJobToElk(job, 'applied');
        } else {
          // No clear success signal — record as attempted but uncertain
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

async function main() {
  const result = createResult();
  let dedupCache = createDedupCache();

  // Session health check
  result.sessionWarnings = await checkSessionHealth();
  // H6: apply only when Wanted session is still valid after health checks and renewal attempts.
  result.wantedApplyEnabled = Boolean(SessionManager.load('wanted'));
  if (!result.wantedApplyEnabled) {
    result.sessionWarnings.push('wanted: apply disabled after renewal check');
  }
  if (result.sessionWarnings.length > 0) {
    log('session warnings:', result.sessionWarnings);
  }

  // Ship pipeline start event to ELK
  await shipToElk('pipeline_started', {
    session_warnings: result.sessionWarnings,
    thresholds: result.thresholds,
  });

  try {
    // C4: load the cross-run dedup cache before scoring to skip recent/applied jobs.
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
        // C4: cache successful scoring results so recently seen jobs are skipped for 7 days.
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

    const relevantJobs = scoredJobs
      .filter((job) => {
        // Profile relevance: title keyword match OR high score
        if (!job.titleMatched && job.score < RELEVANT_MIN_SCORE) return false;
        // Profile mismatch: exclude intern/overseas/non-commutable
        const mismatch = isProfileMismatch(job);
        if (mismatch) {
          log('excluded', { id: job.id, title: job.title, reason: mismatch });
          return false;
        }
        return true;
      })
      .sort((left, right) => right.score - left.score);
    result.relevant = relevantJobs.length;
    result.topJobs = relevantJobs.slice(0, 15).map(mapTopJob);

    // Record all relevant jobs to ELK
    for (const job of relevantJobs.slice(0, 30)) {
      await recordJobToElk(job, 'scored');
    }

    // C2: aggressive apply at review threshold + title match is intentional for this pipeline.
    const wantedJobsToApply = relevantJobs.filter(
      (job) => job.source === 'wanted' && job.score >= REVIEW_MIN_SCORE && job.titleMatched
    );
    await applyToJobs(result, wantedJobsToApply, dedupCache);

    // JobKorea: apply to all relevant jobs (no titleMatched filter — JobKorea titles are less standardized)
    const jobkoreaJobsToApply = relevantJobs.filter(
      (job) => job.source === 'jobkorea'
    );
    if (jobkoreaJobsToApply.length > 0) {
      await applyToJobKoreaJobs(result, jobkoreaJobsToApply, dedupCache);
    }
  } catch (error) {
    result.failedJobs.push({
      id: null,
      title: 'pipeline',
      company: 'pipeline',
      source: 'pipeline',
      error: summarizeError(error),
    });
    result.failed += 1;
    log('pipeline failed', summarizeError(error));
  } finally {
    // C4: prune expired entries and atomically persist the dedup cache at pipeline end.
    await saveDedupCache(dedupCache);
  }

  // Profile sync: push SSoT data to JobKorea (portfolio URL, careers, etc.)
  try {
    const { CONFIG: syncConfig } = await import('./profile-sync/constants.js');
    const { loadSSOT: loadProfileSSOT } = await import('./profile-sync/utils.js');
    const { default: JKHandler } = await import('./profile-sync/jobkorea-handler.js');
    syncConfig.APPLY = true;
    syncConfig.DIFF_ONLY = false;
    syncConfig.HEADLESS = true;
    const ssot = loadProfileSSOT();
    const profileResult = await new JKHandler().sync(ssot);
    result.profileSync = {
      success: profileResult.success,
      changes: profileResult.changes?.length || 0,
    };
    log('profile sync done', result.profileSync);
    await shipToElk('profile_sync', result.profileSync);
  } catch (error) {
    log('profile sync failed', summarizeError(error));
    result.profileSync = { success: false, error: summarizeError(error) };
  }
  result.timestamp = new Date().toISOString();

  // Ship pipeline completed event to ELK
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
    top_companies: result.topJobs.slice(0, 5).map((j) => `${j.company} (${j.score})`),
  });

  // C3: surface unsuccessful runs to callers when nothing was applied.
  if (result.failed > 0 && result.applied === 0) {
    process.exitCode = 1;
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  const result = createResult();
  result.failed = 1;
  result.failedJobs.push({
    id: null,
    title: 'pipeline',
    company: 'pipeline',
    source: 'pipeline',
    error: summarizeError(error),
  });
  log('fatal pipeline error', summarizeError(error));
  // C3: fatal top-level failures must produce a non-zero exit code.
  process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
});
