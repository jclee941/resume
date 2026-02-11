import { SessionManager } from '../auth.js';
import * as profile from './commands/profile.js';
import * as resumeCrud from './commands/resume-crud.js';
import * as career from './commands/career.js';
import * as project from './commands/project.js';
import * as education from './commands/education.js';
import * as skill from './commands/skill.js';
import * as activity from './commands/activity.js';
import * as languageCert from './commands/language-cert.js';

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
  description: `Manage your resume on Wanted Korea (requires login).

**Profile Actions (SNS API):**
- view: View current profile data
- update_headline: Update profile headline
- update_intro: Update introduction/about me

**Resume Actions (Chaos API):**
- list_resumes: List all your resumes
- get_resume: Get specific resume detail
- save_resume: Save resume and regenerate PDF

**Career Actions (Chaos API v2):**
- update_career: Update career
- add_career: Add career
- delete_career: Delete career

**Project Actions (Chaos API v2):**
- add_project: Add project to career
- delete_project: Delete project from career

**Education Actions (Chaos API v2):**
- update_education: Update education
- add_education: Add education
- delete_education: Delete education

**Skill Actions (Chaos API v1):**
- add_skill: Add skill (by tag_type_id)
- delete_skill: Delete skill

**Activity Actions (Chaos API v2):**
- update_activity: Update activity
- add_activity: Add activity
- delete_activity: Delete activity

**Language Cert Actions (Chaos API v2):**
- update_language_cert: Update language certificate
- add_language_cert: Add language certificate
- delete_language_cert: Delete language certificate

Use wanted_auth with action="set_cookies" first if not logged in.`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [...registry.keys()],
        description: 'Action to perform',
      },
      text: {
        type: 'string',
        description: 'Text content for headline or introduction',
      },
      resume_id: {
        type: 'string',
        description: 'Resume ID (e.g., "AwcIAQMKDgtIAgcDCwUAB01F")',
      },
      career_id: {
        type: 'number',
        description: 'Career ID for update/delete operations',
      },
      career: {
        type: 'object',
        description: 'Career data for add/update operations',
        properties: {
          job_role: {
            type: 'string',
            description: 'Job title/position (e.g., "DevSecOps Engineer")',
          },
          company_name: {
            type: 'string',
            description: 'Company name (for add only)',
          },
          employment_type: {
            type: 'string',
            description: 'Employment type: FULL_TIME, PART_TIME, FREELANCE, etc.',
          },
          start_time: {
            type: 'string',
            description: 'Start date YYYY-MM-DD format',
          },
          end_time: {
            type: 'string',
            description: 'End date YYYY-MM-DD format (null if current)',
          },
          served: { type: 'boolean', description: 'Currently working here' },
          projects: {
            type: 'array',
            description: 'Project list under this career',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Project title' },
                description: {
                  type: 'string',
                  description: 'Project description and achievements',
                },
              },
            },
          },
        },
      },
      project_id: {
        type: 'number',
        description: 'Project ID for delete operation',
      },
      project: {
        type: 'object',
        description: 'Project data for add operation',
        properties: {
          title: { type: 'string', description: 'Project title' },
          description: {
            type: 'string',
            description: 'Project description and achievements',
          },
        },
      },
      education_id: {
        type: 'number',
        description: 'Education ID for update/delete operations',
      },
      education: {
        type: 'object',
        description: 'Education data for add/update operations',
        properties: {
          school_name: { type: 'string', description: 'School name' },
          major: { type: 'string', description: 'Major/field of study' },
          degree: { type: 'string', description: 'Degree type' },
          start_time: { type: 'string', description: 'Start date YYYY-MM-DD' },
          end_time: { type: 'string', description: 'End date YYYY-MM-DD' },
          description: {
            type: 'string',
            description: 'Additional description',
          },
        },
      },
      skill_id: {
        type: 'number',
        description: 'Skill ID for delete operation',
      },
      tag_type_id: {
        type: 'number',
        description: 'Skill tag type ID for add_skill (from Wanted skill database)',
      },
      activity_id: {
        type: 'number',
        description: 'Activity ID for update/delete operations',
      },
      activity: {
        type: 'object',
        description: 'Activity data for add/update operations',
        properties: {
          title: { type: 'string', description: 'Activity title' },
          description: { type: 'string', description: 'Activity description' },
          start_time: { type: 'string', description: 'Start date YYYY-MM-DD' },
          activity_type: { type: 'string', description: 'Activity type' },
        },
      },
      cert_id: {
        type: 'number',
        description: 'Language certificate ID for update/delete operations',
      },
      language_cert: {
        type: 'object',
        description: 'Language certificate data for add/update operations',
        properties: {
          language_type: {
            type: 'string',
            description: 'Language type (e.g., ENGLISH, JAPANESE)',
          },
          test_type: {
            type: 'string',
            description: 'Test type (e.g., TOEIC, TOEFL)',
          },
          score: { type: 'string', description: 'Score' },
          acquired_time: {
            type: 'string',
            description: 'Acquired date YYYY-MM-DD',
          },
        },
      },
    },
    required: ['action'],
  },

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
