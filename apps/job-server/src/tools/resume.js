/**
 * MCP Tool: Resume Management
 * Update and manage resume on Wanted Korea
 *
 * Two types of APIs:
 * 1. Profile API (SNS API) - for profile headline/description
 * 2. Resume API (Chaos API) - for resume careers/education/skills
 */

import { SessionManager } from '../shared/services/session/index.js';
import * as profileActions from './resume/profile-actions.js';
import * as resumeActions from './resume/resume-actions.js';
import * as careerActions from './resume/career-actions.js';
import * as projectActions from './resume/project-actions.js';
import * as educationActions from './resume/education-actions.js';
import * as skillActions from './resume/skill-actions.js';
import * as activityActions from './resume/activity-actions.js';
import * as languageCertActions from './resume/language-cert-actions.js';
import { resumeInputSchema } from './resume-schema.js';

export const resumeTool = {
  name: 'wanted_resume',
  description:
    'Manage your resume on Wanted Korea (requires login). Use wanted_auth with action="set_cookies" first if not logged in.',

  inputSchema: resumeInputSchema,

  async execute(params) {
    const api = await SessionManager.getAPI();

    if (!api) {
      return {
        success: false,
        error: 'Not logged in. Use wanted_auth with action="set_cookies" first.',
        hint: 'wanted_auth({ action: "set_cookies", cookies: "your_cookie_string" })',
      };
    }

    const { action } = params;

    try {
      switch (action) {
        case 'view':
        case 'update_headline':
        case 'update_intro':
          return await profileActions[action](params, api);
        case 'list_resumes':
        case 'get_resume':
        case 'save_resume':
          return await resumeActions[action](params, api);
        case 'update_career':
        case 'add_career':
        case 'delete_career':
          return await careerActions[action](params, api);
        case 'add_project':
        case 'delete_project':
          return await projectActions[action](params, api);
        case 'update_education':
        case 'add_education':
        case 'delete_education':
          return await educationActions[action](params, api);
        case 'add_skill':
        case 'delete_skill':
          return await skillActions[action](params, api);
        case 'update_activity':
        case 'add_activity':
        case 'delete_activity':
          return await activityActions[action](params, api);
        case 'update_language_cert':
        case 'add_language_cert':
        case 'delete_language_cert':
          return await languageCertActions[action](params, api);

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            available_actions: resumeTool.inputSchema.properties.action.enum,
          };
      }
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return {
          success: false,
          error: 'Session expired. Please set cookies again.',
          hint: 'wanted_auth({ action: "set_cookies", cookies: "your_cookie_string" })',
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default resumeTool;
