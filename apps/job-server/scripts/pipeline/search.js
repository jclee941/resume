import { jobMatcherTool } from '../../src/tools/job-matcher.js';

import {
  JOBKOREA_KEYWORDS,
  OFFSETS,
  SEARCH_LIMIT,
  TAG_TYPE_IDS,
  WANTED_HEADERS,
} from './constants.js';
import { extractJobArray, joinSections, titleMatchesRelevantKeywords } from './job-helpers.js';
import { log, summarizeError } from './logging.js';

export async function fetchWantedJson(url) {
  const response = await fetch(url, { headers: WANTED_HEADERS });
  if (!response.ok) {
    throw new Error(`Wanted request failed: ${response.status} ${url}`);
  }
  return response.json();
}

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

export async function scoreJob(rawJob) {
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

export async function scoreJobKorea(rawJob) {
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
