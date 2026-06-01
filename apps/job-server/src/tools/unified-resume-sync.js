import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkAllPlatformStatus,
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
import { previewChanges } from './change-preview.js';
import { UnifiedJobCrawler } from '../crawlers/unified/unified-job-crawler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');

export const unifiedResumeSyncTool = {
  name: 'unified_resume_sync',
  description:
    'Sync resume_data.json to multiple job platforms.\n\n**Supported Platforms:**\n- wanted: API-based sync (full CRUD)\n- jobkorea: Browser automation (profile update)\n- saramin: Browser automation (profile update)\n- remember: Browser automation (profile update)\n- jumpit: Browser automation (profile update)\n- programmers: Browser automation (profile update)\n- rallit: Browser automation (profile update)\n- rocketpunch: Browser automation (profile update)\n- indeed: Browser automation (profile update)\n- linkedin: Browser automation (profile update)\n\n**Actions:**\n- status: Check sync status for all platforms\n- sync: Sync SSoT to specified platform(s)\n- diff: Compare local data with platform profile\n- preview: Preview changes without applying\n- propose: Crawl platform data and write human-reviewed proposal patches for SSoT',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'sync', 'diff', 'preview', 'propose'],
      },
      platforms: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'wanted',
            'jobkorea',
            'saramin',
            'remember',
            'jumpit',
            'programmers',
            'rallit',
            'rocketpunch',
            'indeed',
            'linkedin',
          ],
        },
        description: 'Target platforms (default: all)',
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview changes without applying',
      },
      resume_id: {
        type: 'string',
        description: 'Wanted resume ID (required for wanted sync)',
      },
      keyword: {
        type: 'string',
        description: 'Crawler keyword used when action=propose',
      },
      minScore: {
        type: 'number',
        description: 'Minimum matcher score used when action=propose',
      },
      limit: {
        type: 'number',
        description: 'Crawler result limit used when action=propose',
      },
    },
    required: ['action'],
  },

  async execute(params, { logger = console } = {}) {
    const {
      action,
      platforms = [
        'wanted',
        'jobkorea',
        'saramin',
        'remember',
        'jumpit',
        'programmers',
        'rallit',
        'rocketpunch',
        'indeed',
        'linkedin',
      ],
      dry_run = false,
    } = params;

    if (!existsSync(RESUME_DATA_PATH)) {
      return { success: false, error: `Source not found: ${RESUME_DATA_PATH}` };
    }

    const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));

    switch (action) {
      case 'status': {
        const status = await checkAllPlatformStatus(platforms);
        return { ...status, source: RESUME_DATA_PATH };
      }
      case 'diff':
        return diffAllPlatforms(sourceData, platforms, params);
      case 'preview':
        return previewChanges(sourceData, platforms, mapToPlatformFormat);
      case 'sync':
        return syncAllPlatforms(sourceData, platforms, { ...params, dry_run, logger });
      case 'propose':
        return generateCrawlerProposals(platforms, params, logger);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  },
};

async function diffAllPlatforms(sourceData, platforms, params) {
  const results = {};
  for (const platform of platforms) {
    results[platform] = await diffPlatform(sourceData, platform, params);
  }
  return { success: true, diff: results };
}

async function generateCrawlerProposals(platforms, params, logger) {
  const crawler = new UnifiedJobCrawler({ sources: platforms, resumePath: RESUME_DATA_PATH });
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

async function diffPlatform(sourceData, platform, params) {
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

async function syncAllPlatforms(sourceData, platforms, params) {
  const results = {};
  for (const platform of platforms) {
    results[platform] = await syncPlatform(sourceData, platform, params);
  }
  return { success: true, dry_run: params.dry_run, results };
}

async function syncPlatform(sourceData, platform, params) {
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

function mapToPlatformFormat(source, platform) {
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

export default unifiedResumeSyncTool;
