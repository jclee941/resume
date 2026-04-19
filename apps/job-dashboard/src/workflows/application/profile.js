import { NotificationService } from '../../services/notifications.js';

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
      console.error('Workers AI cover letter generation failed:', error.message);
    }
  }

  return getTemplateCoverLetter(ctx, job);
}

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

export function getTemplateCoverLetter(_ctx, job) {
  const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
  if (isKorean) {
    return `${job.company}의 ${job.position} 포지션에 지원합니다. 해당 직무에 대한 강한 관심과 관련 경험을 바탕으로 기여하고 싶습니다.`;
  }

  return `I am excited to apply for the ${job.position} position at ${job.company}. I am confident my skills and experience make me a strong candidate for this role.`;
}

export async function getResume(ctx, resumeId) {
  const resume = await ctx.env.DB.prepare('SELECT * FROM resumes WHERE id = ?')
    .bind(resumeId)
    .first();
  return resume;
}

export async function getStoredResume(ctx) {
  try {
    return await ctx.env.SESSIONS.get('resume:current', 'json');
  } catch {
    return null;
  }
}

export async function getMatchingConfig(ctx) {
  try {
    const config = await ctx.env.DB.prepare(
      "SELECT value FROM config WHERE key = 'auto_apply_config'"
    ).first();
    return config?.value ? JSON.parse(config.value) : { minMatchScore: 70 };
  } catch {
    return { minMatchScore: 70 };
  }
}

export async function sendApprovalRequestNotification(ctx, workflowId, requestId, job) {
  const notificationService = new NotificationService(ctx.env);
  await notificationService.sendApprovalRequest(job, job.matchScore, requestId);
}

export async function sendNotification(ctx, message) {
  const notificationService = new NotificationService(ctx.env);
  await notificationService.sendTelegramNotification({ text: message });
}
