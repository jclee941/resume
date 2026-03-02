import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

export class SyncSectionCommand extends BaseCommand {
  constructor(api, section) {
    super(api);
    this.section = section;
  }

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

    const localData = this.readJsonFile(filePath);
    const remoteData = await this.api.getResumeDetail(resume_id);

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
      await this.api.saveResume(resume_id);
    }

    return {
      success: true,
      section: this.section,
      results,
      pdf_regenerated: results.changes_applied > 0,
    };
  }
}
