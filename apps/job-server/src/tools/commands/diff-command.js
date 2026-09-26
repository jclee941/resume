import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

/**
 * @typedef {import('./base-command.js').ResumeSections & {
 *   exported_at?: string;
 *   [key: string]: unknown;
 * }} LocalResumeData
 */

export class DiffCommand extends BaseCommand {
  /**
   * @param {{ resume_id?: string; file_path?: string }} params
   * @returns {Promise<{
   *   success: boolean;
   *   error?: string;
   *   dry_run?: boolean;
   *   errors?: unknown;
   *   hint?: string;
   *   diff?: import('./base-command.js').ResumeDiff;
   *   local_exported_at?: string;
   *   summary?: {
   *     careers: { local: number | undefined; remote: number | undefined };
   *     educations: { local: number | undefined; remote: number | undefined };
   *     skills: { local: number | undefined; remote: number | undefined };
   *     activities: { local: number | undefined; remote: number | undefined };
   *   };
   * }>}
   */
  async execute(params) {
    const { resume_id, file_path } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for diff' };
    }

    const filePath = this.resolveResumeFilePathForRead(resume_id, file_path);
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Local file not found: ${filePath}. Run export first.`,
      };
    }

    const localData = /** @type {LocalResumeData} */ (this.readJsonFile(filePath));

    const validation = this.validateLocalData(localData, filePath);
    if (!validation.valid) {
      return {
        success: false,
        dry_run: true,
        error: 'Cannot sync: Local data violates schema',
        errors: validation.errors,
        hint: 'Review errors and fix your local data',
      };
    }

    const remoteData =
      await /** @type {(id: string) => Promise<import('./base-command.js').ResumeSections>} */ (
        this.api.getResumeDetail
      )(resume_id);
    const diff = this.compareResume(localData, remoteData);

    return {
      success: true,
      diff,
      local_exported_at: localData.exported_at,
      summary: {
        careers: { local: localData.careers?.length, remote: remoteData.careers?.length },
        educations: { local: localData.educations?.length, remote: remoteData.educations?.length },
        skills: { local: localData.skills?.length, remote: remoteData.skills?.length },
        activities: { local: localData.activities?.length, remote: remoteData.activities?.length },
      },
    };
  }
}
