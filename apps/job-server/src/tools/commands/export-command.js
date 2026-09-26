import { BaseCommand } from './base-command.js';

/**
 * @typedef {{
 *   resume?: unknown;
 *   careers?: import('./base-command.js').ResumeItem[];
 *   educations?: import('./base-command.js').ResumeItem[];
 *   skills?: import('./base-command.js').ResumeSkillItem[];
 *   activities?: import('./base-command.js').ResumeItem[];
 *   language_certs?: import('./base-command.js').ResumeItem[];
 *   links?: unknown[];
 *   [key: string]: unknown;
 * }} ExportResumeDetail
 */

export class ExportCommand extends BaseCommand {
  /**
   * @param {{ resume_id?: string; file_path?: string }} params
   * @returns {Promise<{
   *   success: boolean;
   *   error?: string;
   *   errors?: unknown;
   *   hint?: string;
   *   message?: string;
   *   file_path?: string;
   *   summary?: {
   *     careers: number;
   *     educations: number;
   *     skills: number;
   *     activities: number;
   *     language_certs: number;
   *   };
   * }>}
   */
  async execute(params) {
    const { resume_id, file_path } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for export' };
    }

    const data = await /** @type {(id: string) => Promise<ExportResumeDetail>} */ (
      this.api.getResumeDetail
    )(resume_id);

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
