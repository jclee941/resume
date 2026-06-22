import { UnifiedJobCrawler } from '../../../crawlers/unified/unified-job-crawler.js';
import { getResumeMasterMarkdownPath } from '../../../shared/utils/paths.js';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_SOURCES,
  REVIEW_THRESHOLD,
  buildRankedReport,
  mergeAndRankResults,
  parsePositiveInt,
  rescoreJobs,
} from './rank-core.js';
import { enrichTopJobs } from './rank-enrichment.js';
import { printNextAction, printReport, writeReport, writeSubmitQueue } from './rank-output.js';
import { buildSubmitQueue } from './rank-submit-queue.js';

export {
  buildRankedReport,
  mergeAndRankResults,
  parsePositiveInt,
  rescoreJobs,
} from './rank-core.js';
export { enrichTopJobs, mergeDetailIntoJob } from './rank-enrichment.js';
export { buildSubmitQueue } from './rank-submit-queue.js';

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

  console.log(
    `\n🔍 DevSecOps/SRE 공고 랭킹 — 키워드 ${keywords.length}개, 플랫폼: ${sources.join(', ')}`
  );
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
