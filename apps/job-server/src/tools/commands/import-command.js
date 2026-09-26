import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

export class ImportCommand extends BaseCommand {
  /**
   * @param {{
   *   resume_id?: string;
   *   file_path?: string;
   *   dry_run?: boolean;
   *   sections?: string[];
   * }} params
   * @returns {Promise<{
   *   success: boolean;
   *   error?: string;
   *   errors?: unknown;
   *   hint?: string;
   *   dry_run?: boolean;
   *   message?: string;
   *   data?: unknown;
   *   results?: {
   *     imported: Array<{ section: string; id: unknown }>;
   *     errors: Array<{ section: string; id: unknown; error: string }>;
   *   };
   *   pdf_regenerated?: boolean;
   * }>}
   */
  async execute(params) {
    const { resume_id, file_path, dry_run = false, sections } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for import' };
    }

    const filePath = this.resolveResumeFilePathForRead(resume_id, file_path);
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const localData = /** @type {Record<string, unknown>} */ (this.readJsonFile(filePath));

    const validation = this.validateLocalData(localData, filePath);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Cannot import: Local file violates schema',
        errors: validation.errors,
        hint: 'Fix your JSON file and try again',
      };
    }

    if (dry_run) {
      return {
        success: true,
        dry_run: true,
        message: 'Import preview (no changes applied)',
        data: localData,
      };
    }

    const results = await this.importResumeSections(resume_id, localData, sections);
    await /** @type {(id: string) => Promise<unknown>} */ (this.api.saveResume)(resume_id);

    return {
      success: true,
      message: 'Resume imported successfully',
      results,
      pdf_regenerated: true,
    };
  }
}
