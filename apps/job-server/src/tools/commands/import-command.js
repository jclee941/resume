import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

export class ImportCommand extends BaseCommand {
  async execute(params) {
    const { resume_id, file_path, dry_run = false, sections } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for import' };
    }

    const filePath = this.resolveResumeFilePathForRead(resume_id, file_path);
    if (!existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const localData = this.readJsonFile(filePath);

    const validation = this.validateLocalData(localData);
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
    await this.api.saveResume(resume_id);

    return {
      success: true,
      message: 'Resume imported successfully',
      results,
      pdf_regenerated: true,
    };
  }
}
