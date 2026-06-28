import { jobMatcherTool } from '../../src/tools/job-matcher.js';

import { WANTED_HEADERS } from './constants.js';
import { joinSections, titleMatchesRelevantKeywords } from './job-helpers.js';

function matchedSkills(matchResult) {
  return Array.isArray(matchResult.match.matched_skills) ? matchResult.match.matched_skills : [];
}

function requireMatch(matchResult) {
  if (!matchResult?.success || !matchResult.match) {
    throw new Error(matchResult?.error || 'Job matcher returned no match result');
  }
}

export async function fetchWantedJson(url) {
  const response = await fetch(url, { headers: WANTED_HEADERS });
  if (!response.ok) {
    throw new Error(`Wanted request failed: ${response.status} ${url}`);
  }
  return response.json();
}

export function getPipelinePlatform(source) {
  const platform = String(source || '').toLowerCase();
  if (platform === 'wanted' || platform === 'jobkorea' || platform === 'saramin') {
    return platform;
  }

  throw new Error(`Unsupported pipeline platform: ${source || 'unknown'}`);
}

export async function scorePipelineJob(rawJob, scorers = {}) {
  const platform = getPipelinePlatform(rawJob?.source || 'wanted');
  const scoreByPlatform = {
    wanted: scoreJob,
    jobkorea: scoreJobKorea,
    saramin: scoreSaramin,
    ...scorers,
  };

  return scoreByPlatform[platform](rawJob);
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
  const matchResult = await jobMatcherTool.execute({
    title,
    company,
    requirements: joinSections(job.detail?.requirements, job.detail?.preferred_points),
    description: joinSections(job.detail?.main_tasks, job.detail?.intro, job.detail?.benefits),
    experience:
      job.experience_level ||
      job.experience_range ||
      rawJob.experience_level ||
      rawJob.experience_range ||
      rawJob.experience ||
      '',
    location:
      job.address?.full_location ||
      job.address?.location ||
      rawJob.address?.full_location ||
      rawJob.address?.location ||
      '',
  });
  requireMatch(matchResult);

  return {
    id: rawJob.id,
    source: 'wanted',
    title,
    company,
    url: `https://www.wanted.co.kr/wd/${rawJob.id}`,
    score: matchResult.match.score || 0,
    matchedSkills: matchedSkills(matchResult),
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
  requireMatch(matchResult);

  return {
    id: rawJob.id,
    sourceId: rawJob.sourceId,
    source: 'jobkorea',
    title,
    company,
    url: rawJob.sourceUrl,
    score: matchResult.match.score || 0,
    matchedSkills: matchedSkills(matchResult),
    titleMatched: titleMatchesRelevantKeywords(title),
  };
}

export async function scoreSaramin(rawJob) {
  const title = rawJob.position || rawJob.title || 'Untitled';
  const company = rawJob.company || rawJob.company_name || 'Unknown Company';
  const matchResult = await jobMatcherTool.execute({
    title,
    company,
    requirements: rawJob.requirements || '',
    description: rawJob.description || rawJob.benefits || '',
    experience: [rawJob.experienceMin, rawJob.experienceMax]
      .filter((value) => value != null)
      .join('-'),
    location: rawJob.location || '',
  });
  requireMatch(matchResult);

  return {
    id: rawJob.id,
    source: 'saramin',
    title,
    company,
    url: rawJob.sourceUrl || rawJob.url,
    score: matchResult.match.score || 0,
    matchedSkills: matchedSkills(matchResult),
    titleMatched: titleMatchesRelevantKeywords(title),
  };
}
