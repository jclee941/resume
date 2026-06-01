import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { UnifiedJobCrawler } from '../../../crawlers/unified/unified-job-crawler.js';
import { JobMatcher } from '../../../shared/services/matching/index.js';
import { getResumeBasePath, getResumeMasterMarkdownPath } from '../../../shared/utils/paths.js';

const DEFAULT_KEYWORDS = [
  'DevSecOps',
  'SRE',
  '보안 엔지니어',
  '클라우드 보안',
  'Site Reliability',
  'Cloud Engineer',
  'DevOps',
  'Infrastructure Engineer',
];

const DEFAULT_SOURCES = ['wanted', 'jobkorea', 'saramin'];
const REVIEW_THRESHOLD = 60;
const AUTO_THRESHOLD = 75;
const BORDERLINE_THRESHOLD = 50;

function tierFor(percentage) {
  if (percentage >= AUTO_THRESHOLD) return 'auto';
  if (percentage >= REVIEW_THRESHOLD) return 'review';
  if (percentage >= BORDERLINE_THRESHOLD) return 'borderline';
  return 'skip';
}

/**
 * Parse a flag/arg into a positive integer, falling back when NaN/<=0.
 * @param {string|number|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
export function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n <= 0 ? fallback : n;
}

/**
 * Merge per-keyword crawler results into a single deduped, score-sorted list.
 * @param {Array<{success?: boolean, jobs?: object[]}>} results
 * @returns {object[]}
 */
export function mergeAndRankResults(results) {
  const byId = new Map();
  for (const result of results) {
    if (!result || result.success === false || !Array.isArray(result.jobs)) continue;
    for (const job of result.jobs) {
      const key = job.id || `${job.company}_${job.position}`;
      const existing = byId.get(key);
      if (!existing || (job.matchPercentage || 0) > (existing.matchPercentage || 0)) {
        byId.set(key, job);
      }
    }
  }
  return [...byId.values()].sort(
    (a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0)
  );
}

/**
 * Merge a getJobDetail() payload into a job, filling only empty fields.
 * @param {object} job
 * @param {{success?: boolean, job?: object}} detail
 * @returns {object}
 */
export function mergeDetailIntoJob(job, detail) {
  if (!detail || detail.success === false) return job;
  const d = detail.job || detail;
  const longest = (a, b) => ((b || '').length > (a || '').length ? b : a);
  return {
    ...job,
    description: job.description && job.description.length ? job.description : (d.description || ''),
    requirements: job.requirements && job.requirements.length ? job.requirements : (d.requirements || ''),
    techStack:
      Array.isArray(job.techStack) && job.techStack.length
        ? job.techStack
        : Array.isArray(d.techStack)
          ? d.techStack
          : [],
    benefits: longest(job.benefits, d.benefits),
    preferredPoints: longest(job.preferredPoints, d.preferredPoints),
  };
}

/**
 * Re-run rule-based scoring against the resume after enrichment.
 * @param {object[]} jobs
 * @param {{matcher?: object, resumePath?: string, minScore?: number, maxResults?: number}} options
 * @returns {object[]} scored + prioritized jobs sorted desc
 */
export function rescoreJobs(jobs, options = {}) {
  const matcher = options.matcher || new JobMatcher({});
  const { jobs: scored } = matcher.filterAndRankJobs(jobs, {
    resumePath: options.resumePath,
    minScore: 0,
    maxResults: options.maxResults || jobs.length,
  });
  const prioritized = matcher.prioritizeApplications(scored);
  return [...prioritized].sort(
    (a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0)
  );
}

/**
 * Build a "worth applying" ranked report from scored jobs.
 * @param {object[]} scoredJobs jobs already carrying matchPercentage
 * @param {{minScore?: number, maxResults?: number, keywords?: string[], enrichmentStats?: object}} options
 */
export function buildRankedReport(scoredJobs, options = {}) {
  const { minScore = REVIEW_THRESHOLD, maxResults = 50, keywords = [], enrichmentStats } = options;

  const sorted = [...scoredJobs].sort(
    (a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0)
  );

  const worthApplying = sorted
    .filter((job) => (job.matchPercentage || 0) >= minScore)
    .slice(0, maxResults)
    .map((job) => ({
      id: job.id,
      source: job.source,
      position: job.position,
      company: job.company,
      location: job.location || '',
      sourceUrl: job.sourceUrl || job.url || '',
      matchPercentage: job.matchPercentage || 0,
      matchScore: job.matchScore || 0,
      tier: tierFor(job.matchPercentage || 0),
      applicationPriority: job.applicationPriority || 'low',
      skillMatches: (job.matchDetails?.skillMatches || []).map((m) => m.keyword),
      bonusPoints: job.matchDetails?.bonusPoints || [],
      enrichmentStatus: job.enrichmentStatus || 'not_attempted',
      ...(job.enrichmentError ? { enrichmentError: job.enrichmentError } : {}),
    }));

  return {
    generatedAt: new Date().toISOString(),
    keywords,
    minScore,
    totalScored: scoredJobs.length,
    worthApplying,
    ...(enrichmentStats ? { enrichmentStats } : {}),
  };
}

/**
 * Build a curated submit-queue (apply_queue format) from ranked candidates.
 * Defaults to auto-tier only so submission targets high-confidence matches.
 * @param {object[]} candidates buildRankedReport().worthApplying items
 * @param {{tiers?: string[]}} options
 * @returns {object[]} entries shaped for runQueueApply/normalizeQueueEntry
 */
export function buildSubmitQueue(candidates, options = {}) {
  const tiers = options.tiers || ['auto'];
  return candidates
    .filter((job) => tiers.includes(job.tier))
    .map((job) => ({
      company: job.company,
      position: job.position,
      source: job.source,
      location: job.location || '',
      url: job.sourceUrl || '',
      loginPlatform: job.source,
      needsHumanLogin: true,
      status: 'ready-pending-review',
      matchPercentage: job.matchPercentage,
      tier: job.tier,
    }));
}

async function searchKeywordScored(crawler, keyword, { limit, sources }) {
  try {
    return await crawler.searchWithMatching({
      keyword,
      limit,
      sources,
      minScore: 0,
      maxResults: limit,
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function recordStat(stats, source, status) {
  const key = source || 'unknown';
  if (!stats[key]) stats[key] = { success: 0, empty: 0, failed: 0, skipped: 0 };
  stats[key][status] += 1;
}

/**
 * Enrich top candidates with full job text via getJobDetail.
 * Tags each job with enrichmentStatus and aggregates per-source stats.
 * @param {object} crawler
 * @param {object[]} jobs
 * @returns {Promise<{jobs: object[], stats: Record<string, object>}>}
 */
export async function enrichTopJobs(crawler, jobs) {
  const enriched = [];
  const stats = {};
  for (const job of jobs) {
    const hasText = (job.description || '').length > 0 || (job.requirements || '').length > 0;
    if (hasText || !job.id) {
      recordStat(stats, job.source, 'skipped');
      enriched.push({ ...job, enrichmentStatus: 'skipped' });
      continue;
    }
    try {
      const detail = await crawler.getJobDetail(job.id);
      const merged = mergeDetailIntoJob(job, detail);
      const ok = (merged.description || '').length || (merged.requirements || '').length;
      const status = ok ? 'success' : 'empty';
      recordStat(stats, job.source, status);
      enriched.push({ ...merged, enrichmentStatus: status });
    } catch (error) {
      recordStat(stats, job.source, 'failed');
      enriched.push({ ...job, enrichmentStatus: 'failed', enrichmentError: error.message });
    }
  }
  return { jobs: enriched, stats };
}

function printEnrichmentStats(stats) {
  if (!stats) return;
  console.log('🔎 본문 보강 커버리지 (플랫폼별):');
  for (const [source, s] of Object.entries(stats)) {
    console.log(
      `   ${source}: 성공 ${s.success}, 빈본문 ${s.empty}, 실패 ${s.failed}, 생략(이미보유) ${s.skipped}`
    );
  }
  const anyGap = Object.values(stats).some((s) => s.empty + s.failed > 0);
  if (anyGap) {
    console.log(
      '   ⚠️  본문 보강 실패/빈 공고는 점수가 낮게 측정될 수 있음 (특히 jobkorea/saramin은 상세 미수집).'
    );
  }
}

function printReport(report) {
  console.log(`\n📋 스코어링 완료: ${report.totalScored}개 공고 (키워드: ${report.keywords.join(', ')})`);
  printEnrichmentStats(report.enrichmentStats);
  const isStrict = report.minScore >= REVIEW_THRESHOLD;
  const label = isStrict ? '지원 할만한 공고' : '후보 공고(경계선 포함, 추가검토 필요)';
  console.log(`\n🎯 ${label} (>=${report.minScore}%): ${report.worthApplying.length}개\n`);
  const emoji = { auto: '🟢', review: '🟡', borderline: '⚪' };
  for (const [index, job] of report.worthApplying.entries()) {
    const tierLabel =
      job.tier === 'auto' ? '자동지원 후보' : job.tier === 'review' ? '검토 후 지원' : '경계선(추가검토)';
    console.log(
      `${index + 1}. [${job.matchPercentage}%] ${emoji[job.tier] || '⚪'} ${tierLabel} — ${job.position}`
    );
    console.log(`   🏢 ${job.company} | 📍 ${job.location || 'N/A'} | (${job.source})`);
    console.log(`   🔗 ${job.sourceUrl}`);
    if (job.skillMatches.length) {
      console.log(`   🧩 매칭 스킬: ${[...new Set(job.skillMatches)].slice(0, 8).join(', ')}`);
    }
    if (job.bonusPoints.length) {
      console.log(`   ⭐ ${job.bonusPoints.join(', ')}`);
    }
    console.log('');
  }
}

function printNextAction(report, queuePath, queueCount) {
  const autoCount = report.worthApplying.filter((j) => j.tier === 'auto').length;
  const reviewCount = report.worthApplying.filter((j) => j.tier === 'review').length;
  console.log('\nℹ️  이 명령은 공고를 랭킹만 합니다 — 자동 제출(지원)은 실행하지 않음.');
  console.log(`   자동지원 후보 ${autoCount}개 / 검토 후 지원 ${reviewCount}개.`);
  if (queueCount > 0) {
    console.log(`   이 랭킹의 auto 후보 ${queueCount}개로 제출 큐를 생성했습니다. 검토 후 그 큐만 지원하려면:`);
    console.log(`   node apps/job-server/src/auto-apply/cli/index.js apply_queue --queue=${queuePath} --apply --max=5`);
    console.log('   (주의: 유효한 세션/로그인 필요. apply_queue는 랭킹된 공고만 제출합니다.)');
  } else {
    console.log('   auto 등급 후보가 없어 제출 큐는 생성하지 않았습니다. URL을 수동 검토하세요.');
  }
}

function writeReport(report) {
  const date = report.generatedAt.slice(0, 10);
  const dir = resolve(getResumeBasePath(), 'applications/_auto-apply-runs');
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, `${date}-ranked.json`);
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  return outPath;
}

function writeSubmitQueue(queue, generatedAt) {
  const date = generatedAt.slice(0, 10);
  const dir = resolve(getResumeBasePath(), 'applications/_auto-apply-runs');
  mkdirSync(dir, { recursive: true });
  const outPath = resolve(dir, `${date}-rank-queue.json`);
  writeFileSync(outPath, `${JSON.stringify(queue, null, 2)}\n`, 'utf-8');
  return outPath;
}

/**
 * CLI handler: rank job postings worth applying to for the resume.
 * Usage: rank [keyword|--all] [minScore] [--limit=N] [--max=N]
 */
export async function rankJobs(args = []) {
  const flags = args.filter((a) => a.startsWith('--'));
  const positional = args.filter((a) => !a.startsWith('--'));

  const getFlag = (name, fallback) => {
    const found = flags.find((f) => f.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : fallback;
  };

  const keyword = positional[0] && positional[0] !== 'all' ? positional[0] : null;
  const keywords = keyword ? [keyword] : DEFAULT_KEYWORDS;
  const minScore = parsePositiveInt(positional[1], REVIEW_THRESHOLD);
  const limit = parsePositiveInt(getFlag('limit', '20'), 20);
  const maxResults = parsePositiveInt(getFlag('max', '50'), 50);
  const sources = DEFAULT_SOURCES;

  console.log(`\n🔍 DevSecOps/SRE 공고 랭킹 — 키워드 ${keywords.length}개, 플랫폼: ${sources.join(', ')}`);
  console.log(`   이력서: ${getResumeMasterMarkdownPath()}`);

  const crawler = new UnifiedJobCrawler({
    sources,
    resumePath: getResumeMasterMarkdownPath(),
  });

  const results = [];
  for (const kw of keywords) {
    process.stdout.write(`   • "${kw}" 검색 중...`);
    const result = await searchKeywordScored(crawler, kw, { limit, sources });
    const count = result.success ? result.jobs?.length || 0 : 0;
    process.stdout.write(` ${count}개\n`);
    results.push(result);
  }

  let merged = mergeAndRankResults(results);

  // Enrich top candidates with full job text so scoring is meaningful
  // (search results carry empty description/requirements).
  const enrichCount = Math.min(merged.length, parsePositiveInt(getFlag('enrich', '30'), 30));
  const { jobs: enriched, stats: enrichmentStats } = await enrichTopJobs(
    crawler,
    merged.slice(0, enrichCount)
  );
  merged = [...enriched, ...merged.slice(enrichCount)];
  merged = rescoreJobs(merged, {
    resumePath: getResumeMasterMarkdownPath(),
    maxResults: merged.length,
  });

  const report = buildRankedReport(merged, { minScore, maxResults, keywords, enrichmentStats });

  printReport(report);

  const outPath = writeReport(report);
  console.log(`💾 저장: ${outPath}`);

  const submitQueue = buildSubmitQueue(report.worthApplying);
  let queuePath = '';
  if (submitQueue.length > 0) {
    queuePath = writeSubmitQueue(submitQueue, report.generatedAt);
    console.log(`📦 제출 큐: ${queuePath} (auto 후보 ${submitQueue.length}개)`);
  }
  printNextAction(report, queuePath, submitQueue.length);

  return report;
}
