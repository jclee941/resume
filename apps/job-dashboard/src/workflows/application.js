import { WorkflowEntrypoint } from 'cloudflare:workers';
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { sendTelegramNotification, escapeHtml } from '../services/notification/telegram.js';
import { WantedClient } from '@resume/shared/wanted-client';
import { LinkedInClient } from '../services/linkedin-client.js';
import { RememberClient } from '../services/remember-client.js';


/**
 * Application Workflow
 *
 * Multi-step job application process with approval gates.
 * Supports manual approval, automatic submission, and status tracking.
 *
 * @param {Object} params
 * @param {string} params.jobId - Job ID to apply
 * @param {string} params.platform - Platform (wanted, linkedin, remember)
 * @param {string} params.resumeId - Resume ID to use
 * @param {boolean} params.autoSubmit - Auto-submit without approval
 */
export class ApplicationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { jobId, platform, resumeId, autoSubmit = false, coverLetter } = event.payload;

    const application = {
      id: event.instanceId,
      jobId,
      platform,
      resumeId,
      status: 'pending',
      startedAt: new Date().toISOString(),
      steps: [],
    };

    // Step 1: Validate job and resume exist
    const validation = await step.do(
      'validate-inputs',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        // Check job exists
        const jobData = await this.getJobDetails(platform, jobId);
        if (!jobData) {
          throw new Error(`Job not found: ${jobId}`);
        }

        // Check resume exists
        const resume = await this.getResume(resumeId);
        if (!resume) {
          throw new Error(`Resume not found: ${resumeId}`);
        }

        // Check not already applied
        const existing = await this.env.DB.prepare(
          'SELECT id FROM applications WHERE job_id = ? AND source = ?'
        )
          .bind(jobId, platform)
          .first();

        if (existing) {
          throw new Error(`Already applied to job: ${jobId}`);
        }

        return { job: jobData, resume, valid: true };
      }
    );

    application.job = validation.job;
    application.steps.push({ step: 'validate', status: 'completed' });

    // Step 2: Prepare application data
    const preparedData = await step.do(
      'prepare-application',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        // Generate or use provided cover letter
        const letter = coverLetter || (await this.generateCoverLetter(validation.job));

        // Format resume for platform
        const formattedResume = await this.formatResumeForPlatform(
          validation.resume,
          platform,
          validation.job
        );

        return {
          coverLetter: letter,
          resume: formattedResume,
          preparedAt: new Date().toISOString(),
        };
      }
    );

    application.steps.push({ step: 'prepare', status: 'completed' });

    // Step 3: Approval gate (if not auto-submit)
    if (!autoSubmit) {
      // Send approval request
      await step.do(
        'request-approval',
        {
          retries: { limit: 2, delay: '10 seconds' },
          timeout: '30 seconds',
        },
        async () => {
          await this.sendApprovalRequest({
            applicationId: application.id,
            job: validation.job,
            platform,
          });
          return { requested: true };
        }
      );

      application.steps.push({ step: 'approval-requested', status: 'waiting' });
      application.status = 'awaiting_approval';

      // Save state before waiting
      await this.saveApplicationState(application);

      // Wait for approval (max 24 hours)
      // User calls /api/workflows/application/{id}/approve or /reject
      await step.sleep('wait-for-approval', '24 hours');

      // Check approval status
      const approvalStatus = await step.do(
        'check-approval',
        {
          retries: { limit: 3, delay: '5 seconds' },
          timeout: '30 seconds',
        },
        async () => {
          const state = await this.getApplicationState(application.id);
          return state?.approved ?? false;
        }
      );

      if (!approvalStatus) {
        application.status = 'rejected';
        application.completedAt = new Date().toISOString();
        await this.saveApplicationState(application);

        return {
          success: false,
          reason: 'Approval timeout or rejected',
          application,
        };
      }

      application.steps.push({ step: 'approved', status: 'completed' });
    }

    // Step 4: Submit application
    const submitResult = await step.do(
      'submit-application',
      {
        retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      },
      async () => {
        return await this.submitApplication({
          platform,
          jobId,
          resume: preparedData.resume,
          coverLetter: preparedData.coverLetter,
        });
      }
    );

    application.steps.push({
      step: 'submit',
      status: submitResult.success ? 'completed' : 'failed',
    });

    if (!submitResult.success) {
      application.status = 'failed';
      application.error = submitResult.error;
      await this.saveApplicationState(application);

      // Notify failure
      await step.do(
        'notify-failure',
        {
          retries: { limit: 2, delay: '10 seconds' },
          timeout: '30 seconds',
        },
        async () => {
          await sendTelegramNotification(
            this.env,
            '❌ <b>Application Failed</b>\n\n' +
              `<b>Error</b>: ${escapeHtml(submitResult.error || 'Unknown')}\n` +
              `<b>Platform</b>: ${escapeHtml(platform)}\n` +
              `<b>Job</b>: ${escapeHtml(validation.job.company)} - ${escapeHtml(validation.job.position)}`
          );
          return { notified: true };
        }
      );

      return {
        success: false,
        error: submitResult.error,
        application,
      };
    }

    // Step 5: Record in database
    await step.do(
      'record-application',
      {
        retries: { limit: 3, delay: '5 seconds' },
        timeout: '1 minute',
      },
      async () => {
        await this.env.DB.prepare(
          `
          INSERT INTO applications (
            id, job_id, source, company, position, status, 
            resume_id, cover_letter, applied_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `
        )
          .bind(
            application.id,
            jobId,
            platform,
            validation.job.company,
            validation.job.position,
            'applied',
            resumeId,
            preparedData.coverLetter
          )
          .run();
      }
    );

    application.steps.push({ step: 'record', status: 'completed' });

    // Step 6: Send success notification
    await step.do(
      'notify-success',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        await sendTelegramNotification(
          this.env,
          '✅ <b>Application Submitted</b>\n\n' +
            `<b>Company</b>: ${escapeHtml(validation.job.company)}\n` +
            `<b>Position</b>: ${escapeHtml(validation.job.position)}\n` +
            `<b>Platform</b>: ${escapeHtml(platform)}\n` +
            `<b>Auto-Submit</b>: ${autoSubmit ? 'Yes' : 'No (Approved)'}`
        );
        return { notified: true };
      }
    );

    application.status = 'applied';
    application.completedAt = new Date().toISOString();
    await this.saveApplicationState(application);

    return {
      success: true,
      application,
      submittedAt: new Date().toISOString(),
    };
  }

  async getJobDetails(platform, jobId) {
    // Fetch job details from platform or cache
    const cached = await this.env.DB.prepare('SELECT data FROM job_search_results WHERE job_id = ?')
      .bind(jobId)
      .first();

    if (cached?.data) {
      return JSON.parse(cached.data);
    }

    // Fetch from platform API if not in cache
    try {
      switch (platform) {
        case 'wanted': {
          const session = await this.env.SESSIONS.get('auth:wanted');
          if (!session) {
            throw new Error('No Wanted session available');
          }
          const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs/${jobId}`, {
            headers: {
              'Cookie': session,
              'User-Agent': DEFAULT_USER_AGENT,
            },
          });
          if (!response.ok) {
            throw new Error(`Wanted API returned ${response.status}`);
          }
          const data = await response.json();
          return {
            id: jobId,
            company: data.job?.company?.name || 'Unknown',
            position: data.job?.position || 'Unknown',
            source: 'wanted',
          };
        }
        case 'remember':
        case 'jobkorea':
        case 'saramin': {
          // These platforms require browser automation (Puppeteer) for job details
          // Cloudflare Workers cannot run Puppeteer, so we rely on cached data
          // To fetch these jobs, use job-server CLI crawling first
          return null;
        }
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to fetch job details from ${platform}:`, error.message);
      return null;
    }
  }

  async getResume(resumeId) {
    const resume = await this.env.DB.prepare('SELECT * FROM resumes WHERE id = ?')
      .bind(resumeId)
      .first();
    return resume;
  }

  async generateCoverLetter(job) {
    // Try Workers AI if available
    if (this.env.AI) {
      try {
        const resume = await this.getStoredResume();
        const prompt = this.buildCoverLetterPrompt(job, resume);
        const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content:
                'You are a professional cover letter writer. Write concise, compelling cover letters. Match the language of the job posting (Korean for Korean jobs, English for English jobs). Keep it under 300 words.',
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

    // Template fallback
    return this.getTemplateCoverLetter(job);
  }

  buildCoverLetterPrompt(job, resume) {
    const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
    const lang = isKorean ? 'Korean' : 'English';

    let prompt = `Write a cover letter in ${lang} for the following position:
`;
    prompt += `- Position: ${job.position}
`;
    prompt += `- Company: ${job.company}
`;
    if (job.description)
      prompt += `- Job Description: ${job.description.substring(0, 500)}
`;
    if (resume?.skills)
      prompt += `- My Skills: ${resume.skills}
`;
    if (resume?.experience)
      prompt += `- My Experience: ${resume.experience}
`;
    prompt += `
Keep it professional, concise, and specific to this role.`;

    return prompt;
  }

  getTemplateCoverLetter(job) {
    const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
    if (isKorean) {
      return `${job.company}의 ${job.position} 포지션에 지원합니다. 해당 직무에 대한 강한 관심과 관련 경험을 바탕으로 기여하고 싶습니다.`;
    }
    return `I am excited to apply for the ${job.position} position at ${job.company}. I am confident my skills and experience make me a strong candidate for this role.`;
  }

  async getStoredResume() {
    try {
      const cached = await this.env.SESSIONS.get('resume:current', 'json');
      return cached;
    } catch {
      return null;
    }
  }

  async formatResumeForPlatform(resume, _platform, _job) {
    // Platform-specific resume formatting
    return resume;
  }

  async submitApplication({ platform, jobId, resume, coverLetter }) {
    // Platform-specific submission logic
    const submitters = {
      wanted: () => this.submitToWanted(jobId, resume, coverLetter),
      linkedin: () => this.submitToLinkedIn(jobId, resume, coverLetter),
      remember: () => this.submitToRemember(jobId, resume, coverLetter),
      jobkorea: () => this.submitToJobKorea(jobId, resume, coverLetter),
      saramin: () => this.submitToSaramin(jobId, resume, coverLetter),
    };
    if (!submitter) {
      return { success: false, error: `Unknown platform: ${platform}` };
    }

    try {
      return await submitter();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async submitToWanted(jobId, resume, coverLetter) {
    const session = await this.env.SESSIONS.get('auth:wanted');
    if (!session) {
      return { success: false, error: 'No Wanted session' };
    }

    // Wanted application API
    const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({
        resume_id: resume.id,
        cover_letter: coverLetter,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Wanted API error: ${response.status} - ${error}` };
    }

    return { success: true, platformResponse: await response.json() };
  }
  async submitToLinkedIn(jobId, resume, coverLetter) {
    // LinkedIn Easy Apply requires browser automation via Puppeteer
    // Cloudflare Workers cannot run Puppeteer, so we delegate to job-server
    //
    // TODO: Implement job-server API call for single-job submission
    // Current workaround: Use job-server CLI or n8n webhook trigger
    //
    // Example n8n webhook trigger:
    // await fetch('https://n8n.jclee.me/webhook/linkedin-apply', {
    //   method: 'POST',
    //   body: JSON.stringify({ jobId, resumeId: resume.id, coverLetter }),
    // });
    return {
      success: false,
      error:
        'LinkedIn Easy Apply requires browser automation (Puppeteer) which is not available in Cloudflare Workers. ' +
        'Please use job-server CLI: npm run auto-apply -- --platforms=linkedin --apply',
      platform: 'linkedin',
      requiresJobServer: true,
    };
  }

  async submitToRemember(jobId, resume, coverLetter) {
    // Remember.co.kr requires browser automation for form submission
    // Cloudflare Workers cannot run Puppeteer, so we delegate to job-server
    //
    // TODO: Implement job-server API call for single-job submission
    // Current workaround: Use job-server CLI or n8n webhook trigger
    //
    // Example n8n webhook trigger:
    // await fetch('https://n8n.jclee.me/webhook/remember-apply', {
    //   method: 'POST',
    //   body: JSON.stringify({ jobId, resumeId: resume.id, coverLetter }),
    // });
    return {
      success: false,
      error:
        'Remember application requires browser automation (Puppeteer) which is not available in Cloudflare Workers. ' +
        'Please use job-server CLI: npm run auto-apply -- --platforms=remember --apply',
      platform: 'remember',
      requiresJobServer: true,
    };
  }

  async submitToJobKorea(_jobId, _resume, _coverLetter) {
    // JobKorea application requires browser automation (Puppeteer/Playwright)
    // Cloudflare Workers cannot run Puppeteer, so we delegate to job-server
    //
    // TODO: Implement job-server API call for single-job submission
    // Current workaround: Use job-server CLI or n8n webhook trigger
    return {
      success: false,
      error:
        'JobKorea application requires browser automation (Puppeteer) which is not available in Cloudflare Workers. ' +
        'Please use job-server CLI: npm run auto-apply -- --platforms=jobkorea --apply',
      platform: 'jobkorea',
      requiresJobServer: true,
    };
  }

  async submitToSaramin(_jobId, _resume, _coverLetter) {
    // Saramin application requires browser automation (Puppeteer/Playwright)
    // Cloudflare Workers cannot run Puppeteer, so we delegate to job-server
    //
    // TODO: Implement job-server API call for single-job submission
    // Current workaround: Use job-server CLI or n8n webhook trigger
    return {
      success: false,
      error:
        'Saramin application requires browser automation (Puppeteer) which is not available in Cloudflare Workers. ' +
        'Please use job-server CLI: npm run auto-apply -- --platforms=saramin --apply',
      platform: 'saramin',
      requiresJobServer: true,
    };
  }

  async sendApprovalRequest({ applicationId, job, platform }) {
    await sendTelegramNotification(
      this.env,
      '⏳ <b>Approval Required</b>\n\n' +
        `<b>Company</b>: ${escapeHtml(job.company)}\n` +
        `<b>Position</b>: ${escapeHtml(job.position)}\n` +
        `<b>Platform</b>: ${escapeHtml(platform)}\n` +
        `<b>Application ID</b>: ${escapeHtml(applicationId)}`
    );
  }

  async saveApplicationState(application) {
    await this.env.SESSIONS.put(
      `workflow:application:${application.id}`,
      JSON.stringify(application),
      { expirationTtl: 86400 * 7 } // 7 days
    );
  }

  async getApplicationState(applicationId) {
    const data = await this.env.SESSIONS.get(`workflow:application:${applicationId}`);
    return data ? JSON.parse(data) : null;
  }

  async sendNotification(message) {
    await sendTelegramNotification(this.env, message);
  }
}
