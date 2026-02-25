/**
 * MCP Tool: Resume Management
 * Update and manage resume on Wanted Korea
 *
 * Two types of APIs:
 * 1. Profile API (SNS API) - for profile headline/description
 * 2. Resume API (Chaos API) - for resume careers/education/skills
 */

import { SessionManager } from './auth.js';

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
            description:
              'Employment type: FULL_TIME, PART_TIME, FREELANCE, etc.',
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
        description:
          'Skill tag type ID for add_skill (from Wanted skill database)',
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
        error:
          'Not logged in. Use wanted_auth with action="set_cookies" first.',
        hint: 'wanted_auth({ action: "set_cookies", cookies: "your_cookie_string" })',
      };
    }

    const { action } = params;

    try {
      switch (action) {
        // ============================================
        // Profile API (SNS API)
        // ============================================
        case 'view': {
          const profile = await api.getProfile();
          return {
            success: true,
            profile: {
              id: profile.id,
              name: profile.name,
              headline: profile.headline,
              annual: profile.annual,
              experiences: profile.experiences?.map((exp) => ({
                id: exp.id,
                company: exp.company_name,
                position: exp.position,
                period: `${exp.start_date} ~ ${exp.is_current ? '현재' : exp.end_date}`,
              })),
              educations: profile.educations?.map((edu) => ({
                id: edu.id,
                school: edu.school_name,
                major: edu.major,
                period: `${edu.start_date} ~ ${edu.end_date}`,
              })),
              skills: profile.skills?.map((s) => ({
                id: s.id,
                name: s.name,
              })),
            },
          };
        }

        case 'update_headline': {
          if (!params.text) {
            return {
              success: false,
              error: 'text is required for update_headline',
            };
          }
          await api.updateProfile({ headline: params.text });
          return {
            success: true,
            message: 'Headline updated',
            headline: params.text,
          };
        }

        case 'update_intro': {
          if (!params.text) {
            return {
              success: false,
              error: 'text is required for update_intro',
            };
          }
          await api.updateProfile({ description: params.text });
          return {
            success: true,
            message: 'Introduction updated',
            introduction: params.text,
          };
        }

        // ============================================
        // Resume API (Chaos API)
        // ============================================
        case 'list_resumes': {
          const resumes = await api.getResumeList();
          return {
            success: true,
            resumes,
          };
        }

        case 'get_resume': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for get_resume',
            };
          }
          const data = await api.getResumeDetail(params.resume_id);

          // Format careers for easier reading
          const formattedCareers = data.careers?.map((c) => ({
            id: c.id,
            job_role: c.job_role, // Job role/position (use job_role, not title)
            title: c.title, // Legacy field (usually null)
            company: c.company?.name,
            employment_type: c.employment_type,
            period: `${c.start_time} ~ ${c.end_time || '현재'}`,
            served: c.served, // Currently working
            projects: c.projects?.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
            })),
          }));

          return {
            success: true,
            resume: {
              // Resume metadata is in data.resume
              title: data.resume?.title,
              lang: data.resume?.lang,
              is_complete: data.resume?.is_complete,
              key: data.resume?.key,
              careers: formattedCareers,
              educations: data.educations,
              skills: data.skills,
              _raw: data, // Include raw data for debugging
            },
          };
        }

        case 'update_career': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for update_career',
            };
          }
          if (!params.career_id) {
            return {
              success: false,
              error: 'career_id is required for update_career',
            };
          }
          if (!params.career) {
            return {
              success: false,
              error: 'career object is required for update_career',
            };
          }

          const result = await api.updateResumeCareer(
            params.resume_id,
            params.career_id,
            params.career,
          );
          return {
            success: true,
            message: 'Career updated successfully',
            career: result,
          };
        }

        case 'add_career': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_career',
            };
          }
          if (!params.career) {
            return {
              success: false,
              error: 'career object is required for add_career',
            };
          }

          const result = await api.addResumeCareer(
            params.resume_id,
            params.career,
          );
          return {
            success: true,
            message: 'Career added successfully',
            career: result,
          };
        }

        case 'delete_career': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_career',
            };
          }
          if (!params.career_id) {
            return {
              success: false,
              error: 'career_id is required for delete_career',
            };
          }

          await api.deleteResumeCareer(params.resume_id, params.career_id);
          return {
            success: true,
            message: `Career ${params.career_id} deleted successfully`,
          };
        }

        // ============================================
        // Project API (Chaos API v2)
        // ============================================
        case 'add_project': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_project',
            };
          }
          if (!params.career_id) {
            return {
              success: false,
              error: 'career_id is required for add_project',
            };
          }
          if (!params.project) {
            return {
              success: false,
              error: 'project object is required for add_project',
            };
          }

          const result = await api.addCareerProject(
            params.resume_id,
            params.career_id,
            params.project,
          );
          return {
            success: true,
            message: 'Project added successfully',
            project: result,
          };
        }

        case 'delete_project': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_project',
            };
          }
          if (!params.career_id) {
            return {
              success: false,
              error: 'career_id is required for delete_project',
            };
          }
          if (!params.project_id) {
            return {
              success: false,
              error: 'project_id is required for delete_project',
            };
          }

          await api.deleteCareerProject(
            params.resume_id,
            params.career_id,
            params.project_id,
          );
          return {
            success: true,
            message: `Project ${params.project_id} deleted successfully`,
          };
        }

        case 'save_resume': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for save_resume',
            };
          }

          await api.saveResume(params.resume_id);
          return {
            success: true,
            message: 'Resume saved and PDF regenerated',
          };
        }

        // ============================================
        // Education API (Chaos API v2)
        // ============================================
        case 'update_education': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for update_education',
            };
          }
          if (!params.education_id) {
            return {
              success: false,
              error: 'education_id is required for update_education',
            };
          }
          if (!params.education) {
            return {
              success: false,
              error: 'education object is required for update_education',
            };
          }

          const result = await api.updateResumeEducation(
            params.resume_id,
            params.education_id,
            params.education,
          );
          return {
            success: true,
            message: 'Education updated successfully',
            education: result,
          };
        }

        case 'add_education': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_education',
            };
          }
          if (!params.education) {
            return {
              success: false,
              error: 'education object is required for add_education',
            };
          }

          const result = await api.addResumeEducation(
            params.resume_id,
            params.education,
          );
          return {
            success: true,
            message: 'Education added successfully',
            education: result,
          };
        }

        case 'delete_education': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_education',
            };
          }
          if (!params.education_id) {
            return {
              success: false,
              error: 'education_id is required for delete_education',
            };
          }

          await api.deleteResumeEducation(
            params.resume_id,
            params.education_id,
          );
          return {
            success: true,
            message: `Education ${params.education_id} deleted successfully`,
          };
        }

        // ============================================
        // Skills API (Chaos API v1)
        // ============================================
        case 'add_skill': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_skill',
            };
          }
          if (!params.tag_type_id) {
            return {
              success: false,
              error:
                'tag_type_id is required for add_skill (Wanted skill tag ID)',
            };
          }

          const result = await api.addResumeSkill(
            params.resume_id,
            params.tag_type_id,
          );
          return {
            success: true,
            message: 'Skill added successfully',
            skill: result,
          };
        }

        case 'delete_skill': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_skill',
            };
          }
          if (!params.skill_id) {
            return {
              success: false,
              error: 'skill_id is required for delete_skill',
            };
          }

          await api.deleteResumeSkill(params.resume_id, params.skill_id);
          return {
            success: true,
            message: `Skill ${params.skill_id} deleted successfully`,
          };
        }

        // ============================================
        // Activities API (Chaos API v2)
        // ============================================
        case 'update_activity': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for update_activity',
            };
          }
          if (!params.activity_id) {
            return {
              success: false,
              error: 'activity_id is required for update_activity',
            };
          }
          if (!params.activity) {
            return {
              success: false,
              error: 'activity object is required for update_activity',
            };
          }

          const result = await api.updateResumeActivity(
            params.resume_id,
            params.activity_id,
            params.activity,
          );
          return {
            success: true,
            message: 'Activity updated successfully',
            activity: result,
          };
        }

        case 'add_activity': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_activity',
            };
          }
          if (!params.activity) {
            return {
              success: false,
              error: 'activity object is required for add_activity',
            };
          }

          const result = await api.addResumeActivity(
            params.resume_id,
            params.activity,
          );
          return {
            success: true,
            message: 'Activity added successfully',
            activity: result,
          };
        }

        case 'delete_activity': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_activity',
            };
          }
          if (!params.activity_id) {
            return {
              success: false,
              error: 'activity_id is required for delete_activity',
            };
          }

          await api.deleteResumeActivity(params.resume_id, params.activity_id);
          return {
            success: true,
            message: `Activity ${params.activity_id} deleted successfully`,
          };
        }

        // ============================================
        // Language Certificates API (Chaos API v2)
        // ============================================
        case 'update_language_cert': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for update_language_cert',
            };
          }
          if (!params.cert_id) {
            return {
              success: false,
              error: 'cert_id is required for update_language_cert',
            };
          }
          if (!params.language_cert) {
            return {
              success: false,
              error:
                'language_cert object is required for update_language_cert',
            };
          }

          const result = await api.updateResumeLanguageCert(
            params.resume_id,
            params.cert_id,
            params.language_cert,
          );
          return {
            success: true,
            message: 'Language certificate updated successfully',
            language_cert: result,
          };
        }

        case 'add_language_cert': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for add_language_cert',
            };
          }
          if (!params.language_cert) {
            return {
              success: false,
              error: 'language_cert object is required for add_language_cert',
            };
          }

          const result = await api.addResumeLanguageCert(
            params.resume_id,
            params.language_cert,
          );
          return {
            success: true,
            message: 'Language certificate added successfully',
            language_cert: result,
          };
        }

        case 'delete_language_cert': {
          if (!params.resume_id) {
            return {
              success: false,
              error: 'resume_id is required for delete_language_cert',
            };
          }
          if (!params.cert_id) {
            return {
              success: false,
              error: 'cert_id is required for delete_language_cert',
            };
          }

          await api.deleteResumeLanguageCert(params.resume_id, params.cert_id);
          return {
            success: true,
            message: `Language certificate ${params.cert_id} deleted successfully`,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            available_actions: [
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
          };
      }
    } catch (error) {
      if (
        error.message.includes('401') ||
        error.message.includes('Unauthorized')
      ) {
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
