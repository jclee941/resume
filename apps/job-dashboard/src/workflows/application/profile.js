import { NotificationService } from '../../services/notifications.js';
import { loadMatchingConfig } from './matching-config.js';

/**
 * @typedef {{
 *   name?: string;
 * }} ResumeSkillItem
 *
 * @typedef {{
 *   items?: ResumeSkillItem[];
 * }} ResumeSkillCategory
 *
 * @typedef {{
 *   company?: string;
 *   role?: string;
 * }} ResumeCareerItem
 *
 * @typedef {{
 *   skills?: Record<string, ResumeSkillCategory>;
 *   careers?: ResumeCareerItem[];
 * }} ResumeData
 *
 * @typedef {{
 *   run(model: string, options: {
 *     messages: Array<{ role: string; content: string }>;
 *     max_tokens?: number;
 *   }): Promise<{ response?: string }>;
 * }} AiBinding
 *
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       first(): Promise<{ data?: string; [key: string]: unknown } | null>;
 *     };
 *     all?: () => Promise<{ results?: Array<Record<string, unknown>> }>;
 *   };
 * }} ResumeDbBinding
 *
 * @typedef {import('../../services/notifications.js').NotificationEnv & {
 *   AI?: AiBinding;
 *   JOB_DB: ResumeDbBinding;
 *   [key: string]: unknown;
 * }} ProfileEnv
 *
 * @typedef {{
 *   env: ProfileEnv;
 *   sendApprovalRequestNotification?: (workflowId: string, requestId: string, job: JobProfile) => Promise<void>;
 * }} ProfileContext
 *
 * @typedef {{
 *   position: string;
 *   company: string;
 *   source: string;
 *   description?: string;
 *   matchScore?: number | string;
 *   title?: string;
 *   platform?: string;
 *   [key: string]: unknown;
 * }} JobProfile
 */

/**
 * @param {ProfileContext} ctx
 * @param {JobProfile} job
 * @returns {Promise<string>}
 */
export async function generateCoverLetter(ctx, job) {
  if (ctx.env.AI) {
    try {
      const resume = await getStoredResume(ctx);
      const prompt = buildCoverLetterPrompt(ctx, job, resume);

      const response = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content:
              'You are a professional cover letter writer. Write concise, compelling cover letters. Match the language of the job posting. Keep it under 300 words.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
      });

      if (response?.response) {
        return response.response;
      }
    } catch (error) {
      console.error(
        'Workers AI cover letter generation failed:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return getTemplateCoverLetter(ctx, job);
}

/**
 * @param {ProfileContext} _ctx
 * @param {JobProfile} job
 * @param {{ skills?: string; experience?: string } | null} resume
 * @returns {string}
 */
export function buildCoverLetterPrompt(_ctx, job, resume) {
  const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
  const lang = isKorean ? 'Korean' : 'English';

  let prompt = `Write a cover letter in ${lang} for:\n`;
  prompt += `- Position: ${job.position}\n`;
  prompt += `- Company: ${job.company}\n`;
  if (job.description) prompt += `- Job Description: ${job.description.substring(0, 500)}\n`;
  if (resume?.skills) prompt += `- My Skills: ${resume.skills}\n`;
  if (resume?.experience) prompt += `- My Experience: ${resume.experience}\n`;
  prompt += '\nKeep it professional, concise, and specific to this role.';

  return prompt;
}

/**
 * @param {ProfileContext} _ctx
 * @param {JobProfile} job
 * @returns {string}
 */
export function getTemplateCoverLetter(_ctx, job) {
  const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
  if (isKorean) {
    return `${job.company}의 ${job.position} 포지션에 지원합니다. 해당 직무에 대한 강한 관심과 관련 경험을 바탕으로 기여하고 싶습니다.`;
  }

  return `I am excited to apply for the ${job.position} position at ${job.company}. I am confident my skills and experience make me a strong candidate for this role.`;
}

/**
 * @param {ProfileContext} ctx
 * @param {string} resumeId
 * @returns {Promise<{ data?: string; [key: string]: unknown } | null>}
 */
export async function getResume(ctx, resumeId) {
  const resume = await ctx.env.JOB_DB.prepare('SELECT * FROM resumes WHERE id = ?')
    .bind(resumeId)
    .first();
  return resume;
}

/**
 * @param {ProfileContext} ctx
 * @returns {Promise<{ skills: string; experience: string } | null>}
 */
export async function getStoredResume(ctx) {
  try {
    const master = await getResume(ctx, 'master');
    return master?.data ? summarizeResumeForPrompt(JSON.parse(master.data)) : null;
  } catch (error) {
    console.warn(
      'Master resume unavailable for cover letter prompt:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * @param {ResumeData} data
 * @returns {{ skills: string; experience: string }}
 */
function summarizeResumeForPrompt(data) {
  const skills = Object.values(data.skills || {})
    .flatMap((category) => category.items || [])
    .map((item) => item.name)
    .filter(Boolean)
    .join(', ');
  const experience = (data.careers || [])
    .map((career) => [career.company, career.role].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('; ');
  return { skills, experience };
}

/**
 * @param {ProfileContext} ctx
 * @returns {Promise<import('./matching-config.js').MatchingConfig>}
 */
export async function getMatchingConfig(ctx) {
  return loadMatchingConfig(ctx.env);
}

/**
 * @param {ProfileContext} ctx
 * @param {string} _workflowId
 * @param {string} requestId
 * @param {Record<string, unknown>} job
 * @returns {Promise<void>}
 */
export async function sendApprovalRequestNotification(ctx, _workflowId, requestId, job) {
  const notificationService = new NotificationService(ctx.env);
  await notificationService.sendApprovalRequest(
    job,
    /** @type {number} */ (job.matchScore),
    requestId
  );
}

/**
 * @param {ProfileContext} ctx
 * @param {string} message
 * @returns {Promise<void>}
 */
export async function sendNotification(ctx, message) {
  const notificationService = new NotificationService(ctx.env);
  await notificationService.sendTelegramNotification({ text: message });
}
