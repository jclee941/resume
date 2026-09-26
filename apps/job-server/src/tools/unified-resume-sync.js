import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkAllPlatformStatus } from './platforms/index.js';
import { previewChanges } from './change-preview.js';
import {
  diffAllPlatforms,
  generateCrawlerProposals,
  mapToPlatformFormat,
  syncAllPlatforms,
} from './unified-resume-sync-operations.js';

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
        return generateCrawlerProposals(platforms, params, logger, RESUME_DATA_PATH);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  },
};

export default unifiedResumeSyncTool;
