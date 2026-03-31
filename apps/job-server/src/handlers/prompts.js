/**
 * Prompt handlers for MCP server.
 */
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Prompt definitions
 */
export const prompts = [
  {
    name: 'search-devops-jobs',
    description: 'Search for DevOps/Infrastructure jobs on Wanted Korea',
    arguments: [
      {
        name: 'experience',
        description: 'Years of experience (e.g., 5)',
        required: false,
      },
      {
        name: 'location',
        description: 'Location preference (e.g., seoul)',
        required: false,
      },
    ],
  },
  {
    name: 'update-resume-career',
    description: 'Update career information in your Wanted resume',
    arguments: [
      {
        name: 'resume_id',
        description: 'Resume ID from list_resumes',
        required: true,
      },
      { name: 'career_id', description: 'Career ID to update', required: true },
    ],
  },
  {
    name: 'full-job-search',
    description: 'Complete job search workflow: categories → search → details',
    arguments: [
      {
        name: 'keyword',
        description: 'Search keyword (company, tech, position)',
        required: true,
      },
    ],
  },
];

/**
 * Handle list prompts request.
 * @returns {Promise<{prompts: Array}>}
 */
export async function handleListPrompts() {
  return { prompts };
}

/**
 * Handle get prompt request.
 * @param {import('@modelcontextprotocol/sdk/types.js').GetPromptRequestSchema} request
 * @returns {Promise<{messages: Array<{role: string, content: {type: string, text: string}}>}>}
 */
export async function handleGetPrompt(request) {
  const { name, arguments: args } = request.params;

  if (name === 'search-devops-jobs') {
    const exp = args?.experience || '5';
    const loc = args?.location || 'all';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Search for DevOps and Infrastructure Engineer jobs on Wanted Korea.

Experience level: ${exp} years
Location: ${loc}

Steps:
1. Use wanted_search_jobs with tag_type_ids [674] (DevOps) and [672] (Security)
2. Filter results by experience level
3. For interesting positions, use wanted_get_job_detail to get full details
4. Summarize the top 5 matching positions with company info and requirements`,
          },
        },
      ],
    };
  }

  if (name === 'update-resume-career') {
    const resumeId = args?.resume_id || '[REQUIRED]';
    const careerId = args?.career_id || '[REQUIRED]';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Update career information in my Wanted resume.

Resume ID: ${resumeId}
Career ID: ${careerId}

Steps:
1. First, use wanted_resume with action="get_resume" to see current career details
2. Ask me what changes I want to make
3. Use wanted_resume with action="update_career" to apply changes
4. Use wanted_resume with action="save_resume" to save and regenerate PDF
5. Confirm the update was successful`,
          },
        },
      ],
    };
  }

  if (name === 'full-job-search') {
    const keyword = args?.keyword || '[REQUIRED]';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Complete job search on Wanted Korea for: ${keyword}

Steps:
1. Use wanted_search_keyword to search for "${keyword}"
2. Show me the top 10 results with company name, position, and tech stack
3. For the most relevant 3 positions, use wanted_get_job_detail to get:
   - Full job description
   - Requirements and qualifications
   - Company benefits and culture
4. Use wanted_get_company to get company information
5. Summarize which positions best match my profile (8+ years DevOps/Security experience)`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}

/**
 * Register prompt handlers with MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/index.js').Server} server
 */
export function registerPromptHandlers(server) {
  server.setRequestHandler(ListPromptsRequestSchema, handleListPrompts);
  server.setRequestHandler(GetPromptRequestSchema, handleGetPrompt);
}
