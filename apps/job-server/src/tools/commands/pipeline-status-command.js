import { existsSync } from 'fs';
import { join } from 'path';
import { BaseCommand, DATA_DIR } from './base-command.js';

/**
 * @typedef {{
 *   last_run: string | null;
 *   last_result: unknown;
 *   scheduled?: boolean;
 *   resume_id?: string;
 * }} PipelineStatus
 */

export class PipelineStatusCommand extends BaseCommand {
  /**
   * @returns {Promise<{
   *   success: boolean;
   *   pipeline: PipelineStatus;
   *   data_dir: string;
   *   resume_files: string[];
   * }>}
   */
  async execute() {
    const statusFile = join(DATA_DIR, 'pipeline-status.json');
    /** @type {PipelineStatus} */
    let status = { last_run: null, last_result: null, scheduled: false };

    if (existsSync(statusFile)) {
      status = /** @type {PipelineStatus} */ (this.readJsonFile(statusFile));
    }

    return {
      success: true,
      pipeline: status,
      data_dir: DATA_DIR,
      resume_files: this.listResumeFiles(),
    };
  }
}
