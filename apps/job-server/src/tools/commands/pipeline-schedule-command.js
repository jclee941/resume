import { join } from 'path';
import { BaseCommand, DATA_DIR } from './base-command.js';

export class PipelineScheduleCommand extends BaseCommand {
  async execute(params) {
    const { resume_id, webhook_url } = params;

    if (!webhook_url) {
      return {
        success: false,
        error: 'webhook_url is required for scheduling',
        hint: 'Create workflow with webhook trigger, then provide URL',
      };
    }

    const configFile = join(DATA_DIR, 'pipeline-config.json');
    this.writeJsonFile(configFile, {
      webhook_url,
      resume_id,
      configured_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Pipeline scheduled',
      webhook_url,
      config_file: configFile,
      hint: 'Configure workflow to call this MCP tool periodically',
    };
  }
}
