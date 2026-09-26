import { SessionManager } from '../../shared/services/session/index.js';
import * as profile from './commands/profile.js';
import * as resumeCrud from './commands/resume-crud.js';
import * as career from './commands/career.js';
import * as project from './commands/project.js';
import * as education from './commands/education.js';
import * as skill from './commands/skill.js';
import * as activity from './commands/activity.js';
import * as languageCert from './commands/language-cert.js';
import { RESUME_TOOL_DESCRIPTION, buildResumeInputSchema } from './tool-schema.js';

const registry = new Map([
  ...Object.entries(profile),
  ...Object.entries(resumeCrud),
  ...Object.entries(career),
  ...Object.entries(project),
  ...Object.entries(education),
  ...Object.entries(skill),
  ...Object.entries(activity),
  ...Object.entries(languageCert),
]);

export const resumeTool = {
  name: 'wanted_resume',
  description: RESUME_TOOL_DESCRIPTION,
  inputSchema: buildResumeInputSchema([...registry.keys()]),

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
    const handler = registry.get(action);

    if (!handler) {
      return {
        success: false,
        error: `Unknown action: ${action}`,
        available_actions: [...registry.keys()],
      };
    }

    try {
      return await handler(api, params);
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
