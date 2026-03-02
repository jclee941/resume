import { existsSync } from 'fs';
import { BaseCommand } from './base-command.js';

export class DiffCommand extends BaseCommand {
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

    const localData = this.readJsonFile(filePath);

    const validation = this.validateLocalData(localData);
    if (!validation.valid) {
      return {
        success: false,
        dry_run: true,
        error: 'Cannot sync: Local data violates schema',
        errors: validation.errors,
        hint: 'Review errors and fix your local data',
      };
    }

    const remoteData = await this.api.getResumeDetail(resume_id);
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
