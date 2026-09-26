import {
  diffPlatform as diffWantedPlatform,
  mapToJobKoreaFormat,
  mapToRememberFormat,
  mapToSaraminFormat,
  mapToWantedFormat,
  mapToJumpitFormat,
  mapToProgrammersFormat,
  mapToRallitFormat,
  mapToRocketPunchFormat,
  mapToIndeedFormat,
  mapToLinkedInFormat,
  syncToJobKorea,
  syncToRemember,
  syncToSaramin,
  syncToWanted,
  syncToJumpit,
  syncToProgrammers,
  syncToRallit,
  syncToRocketPunch,
  syncToIndeed,
  syncToLinkedIn,
} from './platforms/index.js';
import { UnifiedJobCrawler } from '../crawlers/unified/unified-job-crawler.js';

export async function diffAllPlatforms(sourceData, platforms, params) {
  const results = {};
  for (const platform of platforms) {
    results[platform] = await diffPlatform(sourceData, platform, params);
  }
  return { success: true, diff: results };
}

export async function generateCrawlerProposals(platforms, params, logger, resumeDataPath) {
  const crawler = new UnifiedJobCrawler({ sources: platforms, resumePath: resumeDataPath });
  const result = await crawler.searchWithProposals({
    keyword: params.keyword,
    categories: params.categories || [],
    experience: params.experience,
    location: params.location,
    limit: params.limit || 20,
    minScore: params.minScore,
    maxResults: params.maxResults,
  });
  logger.info?.(`Generated ${result.proposals?.count || 0} proposal(s) from crawler output`);
  return result;
}

export async function diffPlatform(sourceData, platform, params) {
  switch (platform) {
    case 'wanted':
      return diffWantedPlatform(sourceData, params);
    case 'jobkorea':
    case 'saramin':
    case 'remember':
    case 'jumpit':
    case 'programmers':
    case 'rallit':
    case 'rocketpunch':
    case 'indeed':
    case 'linkedin':
      return { note: 'Diff requires browser session - use preview instead' };
    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

export async function syncAllPlatforms(sourceData, platforms, params) {
  const results = {};
  for (const platform of platforms) {
    results[platform] = await syncPlatform(sourceData, platform, params);
  }
  return { success: true, dry_run: params.dry_run, results };
}

export async function syncPlatform(sourceData, platform, params) {
  const mapped = mapToPlatformFormat(sourceData, platform);
  switch (platform) {
    case 'wanted':
      return syncToWanted(mapped, params, sourceData, params.logger);
    case 'jobkorea':
      return syncToJobKorea(mapped, params);
    case 'saramin':
      return syncToSaramin(mapped, params);
    case 'remember':
      return syncToRemember(mapped, params);
    case 'jumpit':
      return syncToJumpit(mapped, params);
    case 'programmers':
      return syncToProgrammers(mapped, params);
    case 'rallit':
      return syncToRallit(mapped, params);
    case 'rocketpunch':
      return syncToRocketPunch(mapped, params);
    case 'indeed':
      return syncToIndeed(mapped, params);
    case 'linkedin':
      return syncToLinkedIn(mapped, params);
    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

export function mapToPlatformFormat(source, platform) {
  switch (platform) {
    case 'wanted':
      return mapToWantedFormat(source);
    case 'jobkorea':
      return mapToJobKoreaFormat(source);
    case 'saramin':
      return mapToSaraminFormat(source);
    case 'remember':
      return mapToRememberFormat(source);
    case 'jumpit':
      return mapToJumpitFormat(source);
    case 'programmers':
      return mapToProgrammersFormat(source);
    case 'rallit':
      return mapToRallitFormat(source);
    case 'rocketpunch':
      return mapToRocketPunchFormat(source);
    case 'indeed':
      return mapToIndeedFormat(source);
    case 'linkedin':
      return mapToLinkedInFormat(source);
    default:
      return { error: 'Unknown platform' };
  }
}
