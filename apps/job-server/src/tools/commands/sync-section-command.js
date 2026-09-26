import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

export class SyncSectionCommand extends BaseCommand {
  /**
   * @param {import('./base-command.js').BaseCommandApi} api
   * @param {string} section
   */
  constructor(api, section) {
    super(api);
    this.section = section;
  }

  /**
   * @param {{
   *   resume_id?: string;
   *   file_path?: string;
   *   dry_run?: boolean;
   * }} params
   * @returns {Promise<{
   *   success: boolean;
   *   error?: string;
   *   dry_run?: boolean;
   *   section?: string;
   *   changes?: import('./base-command.js').DiffChange[];
   *   results?: {
   *     changes_applied: number;
   *     errors: Array<{
   *       section: string;
   *       change: import('./base-command.js').DiffChange;
   *       error: string;
   *     }>;
   *   };
   *   pdf_regenerated?: boolean;
   * }>}
   */
  async execute(params) {
    const { resume_id, file_path, dry_run = false } = params;

    if (!resume_id) {
      return {
        success: false,
        error: `resume_id is required for sync_${this.section}`,
      };
    }

    const filePath = this.resolveResumeFilePathForRead(resume_id, file_path);
    if (!existsSync(filePath)) {
      return {
        success: false,
        error: `Local file not found: ${filePath}. Run export first.`,
      };
    }

    const localData = /** @type {import('./base-command.js').ResumeSections} */ (
      this.readJsonFile(filePath)
    );
    const remoteData =
      await /** @type {(id: string) => Promise<import('./base-command.js').ResumeSections>} */ (
        this.api.getResumeDetail
      )(resume_id);

    const diff = this.compareResume(localData, remoteData);
    const sectionDiff = diff[this.section] || [];

    if (dry_run) {
      return {
        success: true,
        dry_run: true,
        section: this.section,
        changes: sectionDiff,
      };
    }

    const results = await this.syncResumeSections(resume_id, localData, remoteData, [this.section]);

    if (results.changes_applied > 0) {
      await /** @type {(id: string) => Promise<unknown>} */ (this.api.saveResume)(resume_id);
    }

    return {
      success: true,
      section: this.section,
      results,
      pdf_regenerated: results.changes_applied > 0,
    };
  }
}
