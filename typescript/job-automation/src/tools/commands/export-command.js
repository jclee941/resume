import { BaseCommand } from './base-command.js';

export class ExportCommand extends BaseCommand {
  async execute(params) {
    const { resume_id, file_path } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for export' };
    }

    const data = await this.api.getResumeDetail(resume_id);

    const validation = this.validateLocalData(data.resume);
    if (!validation.valid) {
      return {
        success: false,
        error: 'Cannot export: Remote resume violates schema',
        errors: validation.errors,
        hint: 'Fix errors on Wanted.co.kr and try again',
      };
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      resume_id,
      resume: data.resume,
      careers: data.careers,
      educations: data.educations,
      skills: data.skills,
      activities: data.activities,
      language_certs: data.language_certs,
      links: data.links,
    };

    const filePath = this.resolveResumeFilePathForWrite(resume_id, file_path);
    this.writeJsonFile(filePath, exportData);

    return {
      success: true,
      message: 'Resume exported successfully',
      file_path: filePath,
      summary: {
        careers: data.careers?.length || 0,
        educations: data.educations?.length || 0,
        skills: data.skills?.length || 0,
        activities: data.activities?.length || 0,
        language_certs: data.language_certs?.length || 0,
      },
    };
  }
}
