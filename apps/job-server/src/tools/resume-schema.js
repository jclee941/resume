/**
 * Input schema definition for wanted_resume MCP tool
 */

export const resumeInputSchema = {
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
};

export default resumeInputSchema;
