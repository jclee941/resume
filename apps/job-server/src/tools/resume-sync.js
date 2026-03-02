/**
 * MCP Tool: Resume Sync (자동화 파이프라인)
 *
 * Facade that delegates to specialized Command classes.
 * See: ./commands/ for individual command implementations.
 */

import { SessionManager } from './auth.js';
import { CommandRegistry } from './commands/index.js';

export const resumeSyncTool = {
  name: 'wanted_resume_sync',
  description: `Automated resume sync and bulk update pipeline.

**Sync Actions:**
- export: Export current resume to JSON file
- import: Import and update resume from JSON file
- diff: Compare local data with remote resume
- sync: Full sync (export → compare → selective update)

**Pipeline Actions:**
- pipeline_status: Check automation pipeline status
- pipeline_run: Run full update pipeline
- pipeline_schedule: Schedule periodic sync (via webhook)

**Section-specific Sync:**
- sync_careers: Sync only careers section
- sync_educations: Sync only educations section
- sync_skills: Sync only skills section
- sync_activities: Sync only activities section
- sync_language_certs: Sync only language certificates

Data files stored in: ~/.OpenCode/data/wanted-resume/ (legacy: ~/.claude/data/wanted-resume/)`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          'export',
          'import',
          'diff',
          'sync',
          'pipeline_status',
          'pipeline_run',
          'pipeline_schedule',
          'sync_careers',
          'sync_educations',
          'sync_skills',
          'sync_activities',
          'sync_language_certs',
        ],
        description: 'Sync action to perform',
      },
      resume_id: {
        type: 'string',
        description: 'Resume ID (required for most actions)',
      },
      file_path: {
        type: 'string',
        description: 'Custom file path for import/export (optional)',
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview changes without applying (default: false)',
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: 'Sections to sync: careers, educations, skills, activities, language_certs',
      },
      webhook_url: {
        type: 'string',
        description: 'Webhook URL for pipeline scheduling',
      },
    },
    required: ['action'],
  },

  async execute(params) {
    const api = await SessionManager.getAPI();

    if (!api) {
      return {
        success: false,
        error: 'Not logged in. Use wanted_auth first.',
        hint: 'wanted_auth({ action: "set_cookies", cookies: "..." })',
      };
    }

    const { action } = params;
    const registry = new CommandRegistry(api);
    const command = registry.getCommand(action);

    if (!command) {
      return {
        success: false,
        error: `Unknown action: ${action}`,
        available_actions: registry.getAvailableActions(),
      };
    }

    try {
      return await command.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default resumeSyncTool;
