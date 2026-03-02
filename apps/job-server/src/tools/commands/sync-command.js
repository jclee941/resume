import { existsSync } from 'fs';
import { BaseCommand, DATA_DIR } from './base-command.js';

export class SyncCommand extends BaseCommand {
  async execute(params) {
    const { resume_id, file_path, dry_run = false, sections } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for sync' };
    }

    const remoteData = await this.api.getResumeDetail(resume_id);
    const filePath = this.resolveResumeFilePathForRead(resume_id, file_path);

    if (!existsSync(filePath)) {
      this.ensureDir(DATA_DIR);
      const exportData = {
        exported_at: new Date().toISOString(),
        resume_id,
        ...remoteData,
      };
      const writePath = this.resolveResumeFilePathForWrite(resume_id, file_path);
      this.writeJsonFile(writePath, exportData);

      return {
        success: true,
        message: 'No local file found. Exported remote data.',
        file_path: writePath,
      };
    }

    const localData = this.readJsonFile(filePath);
    const diff = this.compareResume(localData, remoteData);

    if (dry_run) {
      return {
        success: true,
        dry_run: true,
        message: 'Sync preview',
        diff,
        changes_needed: Object.keys(diff).filter((k) => diff[k].length > 0),
      };
    }

    const results = await this.syncResumeSections(resume_id, localData, remoteData, sections);

    if (results.changes_applied > 0) {
      await this.api.saveResume(resume_id);
    }

    return {
      success: true,
      message: 'Sync completed',
      results,
      pdf_regenerated: results.changes_applied > 0,
    };
  }
}
