/**
 * MCP Tool: Resume Management
 * Update and manage resume on Wanted Korea
 *
 * Two types of APIs:
 * 1. Profile API (SNS API) - for profile headline/description
 * 2. Resume API (Chaos API) - for resume careers/education/skills
 */

import { SessionManager } from './auth.js';
import * as profileActions from './resume/profile-actions.js';
import * as resumeActions from './resume/resume-actions.js';
import * as careerActions from './resume/career-actions.js';
import * as projectActions from './resume/project-actions.js';
import * as educationActions from './resume/education-actions.js';
import * as skillActions from './resume/skill-actions.js';
import * as activityActions from './resume/activity-actions.js';
import * as languageCertActions from './resume/language-cert-actions.js';

export const resumeTool = {
  name: 'wanted_resume',
  description:
    'Manage your resume on Wanted Korea (requires login). Use wanted_auth with action="set_cookies" first if not logged in.',

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: [
          'view',
          'list_resumes',
          'get_resume',
          'update_headline',
          'update_intro',
          'update_career',
          'add_career',
          'delete_career',
          'add_project',
          'delete_project',
          'update_education',
          'add_education',
          'delete_education',
          'add_skill',
          'delete_skill',
          'update_activity',
          'add_activity',
          'delete_activity',
          'update_language_cert',
          'add_language_cert',
          'delete_language_cert',
          'save_resume',
        ],
        description: 'Action to perform',
      },
      // For headline/intro
      text: {
        type: 'string',
        description: 'Text content for headline or introduction',
      },
      // For resume operations
      resume_id: {
        type: 'string',
        description: 'Resume ID (e.g., "AwcIAQMKDgtIAgcDCwUAB01F")',
      },
      // For career operations
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
      // For project operations
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
      // For education operations
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
      // For skill operations
      skill_id: {
        type: 'number',
        description: 'Skill ID for delete operation',
      },
      tag_type_id: {
        type: 'number',
        description: 'Skill tag type ID for add_skill (from Wanted skill database)',
      },
      // For activity operations
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
      // For language cert operations
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
