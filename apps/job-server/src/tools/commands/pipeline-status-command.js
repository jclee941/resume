import { existsSync } from 'fs';
import { join } from 'path';
import { BaseCommand, DATA_DIR } from './base-command.js';

export class PipelineStatusCommand extends BaseCommand {
  async execute() {
    const statusFile = join(DATA_DIR, 'pipeline-status.json');
    let status = { last_run: null, last_result: null, scheduled: false };

    if (existsSync(statusFile)) {
      status = this.readJsonFile(statusFile);
    }

    return {
      success: true,
      pipeline: status,
      data_dir: DATA_DIR,
      resume_files: this.listResumeFiles(),
    };
  }
}
