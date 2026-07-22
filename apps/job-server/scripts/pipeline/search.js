import {
  JOBKOREA_KEYWORDS,
  OFFSETS,
  SARAMIN_KEYWORDS,
  SEARCH_LIMIT,
  TAG_TYPE_IDS,
} from './constants.js';
import { extractJobArray } from './job-helpers.js';
import { log, summarizeError } from './logging.js';
import {
  fetchWantedJson,
  getPipelinePlatform,
  scoreJob,
  scoreJobKorea,
  scorePipelineJob,
  scoreSaramin,
} from './scoring.js';

export {
  fetchWantedJson,
  getPipelinePlatform,
  scoreJob,
  scoreJobKorea,
  scorePipelineJob,
  scoreSaramin,
};

export async function searchJobs() {
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

export async function searchJobKorea() {
  const { JobKoreaCrawler } = await import('../../platforms/jobkorea/jobkorea-crawler.js');
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

export async function searchSaramin() {
  const { SaraminCrawler } = await import('../../platforms/saramin/saramin-crawler.js');
  const crawler = new SaraminCrawler();
  const jobs = [];

  for (const keyword of SARAMIN_KEYWORDS) {
    try {
      const result = await crawler.searchJobs({ keyword, limit: 20 });
      if (result.success) {
        jobs.push(...result.jobs);
        log('saramin searched', { keyword, found: result.jobs.length });
      } else {
        log('saramin search failed', { keyword, error: result.error || 'unknown error' });
      }
    } catch (error) {
      log('saramin search failed', { keyword, error: summarizeError(error) });
    }
  }

  return jobs;
}
