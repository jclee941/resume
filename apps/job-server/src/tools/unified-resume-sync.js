import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  checkAllPlatformStatus,
  diffPlatform as diffWantedPlatform,
  mapToJobKoreaFormat,
  mapToRememberFormat,
  mapToWantedFormat,
  syncToJobKorea,
  syncToRemember,
  syncToWanted,
} from './platforms/index.js';
import { previewChanges } from './utils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');

export const unifiedResumeSyncTool = {
  name: 'unified_resume_sync',
  description: `Sync resume_data.json to multiple job platforms.

**Supported Platforms:**
- wanted: API-based sync (full CRUD)
- jobkorea: Browser automation (profile update)
- remember: Browser automation (profile update)

**Actions:**
- status: Check sync status for all platforms
- sync: Sync to specified platform(s)
- diff: Compare local data with platform profile
- preview: Preview changes without applying`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'sync', 'diff', 'preview'],
      },
      platforms: {
        type: 'array',
        items: { type: 'string', enum: ['wanted', 'jobkorea', 'remember'] },
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
    },
    required: ['action'],
  },

  async execute(params, { logger = console } = {}) {
    const { action, platforms = ['wanted', 'jobkorea', 'remember'], dry_run = false } = params;

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

async function diffPlatform(sourceData, platform, params) {
  switch (platform) {
    case 'wanted':
      return diffWantedPlatform(sourceData, params);
    case 'jobkorea':
    case 'remember':
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
    case 'remember':
      return syncToRemember(mapped, params);
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
    case 'remember':
      return mapToRememberFormat(source);
    default:
      return { error: 'Unknown platform' };
  }
}

export default unifiedResumeSyncTool;
