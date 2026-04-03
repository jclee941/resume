import { WorkflowEntrypoint } from 'cloudflare:workers';
import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { NotificationService } from '../services/notifications.js';
import { calculateMatchScore } from '../handlers/auto-apply/match-scoring.js';

/**
 * Application Workflow - Enhanced for Batch Processing with Approval Gates
 *
 * Multi-step job application process with:
 * - Batch job searching and filtering
 * - Approval gates with match score thresholds
 * - Durable execution with step.do()
 * - D1 storage for workflow tracking
 * - Cron, manual, and event trigger support
 * - Partial failure handling
 *
 * @param {Object} params
 * @param {string} params.triggerType - 'cron' | 'manual' | 'event'
 * @param {string[]} params.platforms - Platforms to search ['wanted', 'linkedin', 'remember']
 * @param {Object} params.searchCriteria - Search filters
 * @param {string} params.resumeId - Resume ID to use
 * @param {boolean} params.autoApprove - Auto-approve high-match jobs
 * @param {number} params.autoApproveThreshold - Score threshold for auto-approval (default: 75)
 * @param {number} params.minMatchScore - Minimum match score to consider (default: 60)
 * @param {number} params.maxDailyApplications - Max applications per run (default: 10)
 * @param {boolean} params.dryRun - Preview mode without actual applications
 */
export class ApplicationWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {
      triggerType = 'manual',
      platforms = ['wanted'],
      searchCriteria = {},
      resumeId = 'default',
      autoApprove = false,
      autoApproveThreshold = 75,
      minMatchScore = 60,
      maxDailyApplications = 10,
      dryRun = false,
      eventData = {}, // For event triggers (e.g., { type: 'resume_updated', resumeId: '...' })
    } = event.payload;

    // Initialize workflow tracking
    const workflow = {
      id: event.instanceId,
      triggerType,
      status: 'running',
      startedAt: new Date().toISOString(),
      steps: [],
      stats: {
        jobsFound: 0,
        jobsScored: 0,
        jobsApproved: 0,
        jobsRejected: 0,
        jobsApplied: 0,
        jobsFailed: 0,
      },
      errors: [],
    };


    // Initialize notification service
    const notificationService = new NotificationService(this.env);

    // Step 1: Initialize workflow in D1
    await step.do(
      'initialize-workflow',
      {
        retries: { limit: 3, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        await this.saveWorkflowState(workflow);
        await this.logWorkflowStep(workflow.id, 'initialize', 'completed', { triggerType, platforms });
        return { initialized: true };
      }
    );

    workflow.steps.push({ step: 'initialize', status: 'completed' });

    // Step 2: Check daily application limits
    const dailyCheck = await step.do(
      'check-daily-limits',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const today = new Date().toISOString().split('T')[0];
        const count = await this.getDailyApplicationCount(today);
        const remaining = Math.max(0, maxDailyApplications - count);
        
        if (remaining === 0) {
          throw new Error(`Daily application limit (${maxDailyApplications}) reached for ${today}`);
        }
        
        return { remaining, alreadyApplied: count };
      }
    );

    workflow.steps.push({ step: 'check-daily-limits', status: 'completed', remaining: dailyCheck.remaining });

    // Step 3: Search for jobs across platforms
    const jobsFound = await step.do(
      'search-jobs',
      {
        retries: { limit: 2, delay: '10 seconds', backoff: 'exponential' },
        timeout: '5 minutes',
      },
      async () => {
        const allJobs = [];
        
        for (const platform of platforms) {
          try {
            const platformJobs = await this.searchJobs(platform, searchCriteria);
            allJobs.push(...platformJobs.map(job => ({ ...job, source: platform })));
            
            // Rate limit between platforms
            if (platforms.indexOf(platform) < platforms.length - 1) {
              await step.sleep(`pause-after-${platform}`, '10 seconds');
            }
          } catch (error) {
            workflow.errors.push({ platform, error: error.message });
            console.error(`Failed to search ${platform}:`, error.message);
          }
        }
        
        return allJobs;
      }
    );

    workflow.stats.jobsFound = jobsFound.length;
    workflow.steps.push({ step: 'search-jobs', status: 'completed', count: jobsFound.length });
    await this.logWorkflowStep(workflow.id, 'search-jobs', 'completed', { count: jobsFound.length });

    // If no jobs found, complete early
    if (jobsFound.length === 0) {
      workflow.status = 'completed';
      workflow.completedAt = new Date().toISOString();
      workflow.steps.push({ step: 'complete', status: 'no-jobs-found' });
      await this.saveWorkflowState(workflow);
      
      await step.do(
        'notify-no-jobs',
        {
          retries: { limit: 2, delay: '10 seconds' },
          timeout: '30 seconds',
        },
        async () => {
          await notificationService.sendTelegramNotification({
            text: '🔍 <b>Application Workflow Complete</b>\n\n' +
              `<b>Trigger</b>: ${triggerType}\n` +
              `<b>Platforms</b>: ${platforms.join(', ')}\n` +
              '<b>Result</b>: No jobs found matching criteria'
          });
          return { notified: true };
        }
      );
      
      return {
        success: true,
        workflow,
        message: 'No jobs found',
      };
    }

    // Step 4: Score and filter jobs
    const scoredJobs = await step.do(
      'score-jobs',
      {
        retries: { limit: 2, delay: '5 seconds' },
        timeout: '2 minutes',
      },
      async () => {
        const config = await this.getMatchingConfig();
        
        return jobsFound
          .map(job => ({
            ...job,
            matchScore: calculateMatchScore(job, config),
          }))
          .filter(job => job.matchScore >= minMatchScore)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, dailyCheck.remaining); // Respect daily limit
      }
    );

    workflow.stats.jobsScored = scoredJobs.length;
    workflow.steps.push({ step: 'score-jobs', status: 'completed', count: scoredJobs.length });
    await this.logWorkflowStep(workflow.id, 'score-jobs', 'completed', { 
      count: scoredJobs.length,
      averageScore: scoredJobs.reduce((sum, j) => sum + j.matchScore, 0) / scoredJobs.length || 0
    });

    // Step 5: Approval gate - process each job
    const approvedJobs = [];
    const approvalResults = [];

    for (const job of scoredJobs) {
      const approvalResult = await step.do(
        `approval-gate-${job.id}`,
        {
          retries: { limit: 2, delay: '5 seconds' },
          timeout: '2 minutes',
        },
        async () => {
          // Check if already applied
          const existing = await this.env.DB.prepare(
            'SELECT id FROM applications WHERE job_id = ? AND source = ?'
          )
            .bind(job.id, job.source)
            .first();

          if (existing) {
            return { status: 'already-applied', job };
          }

          // Auto-approve logic
          if (autoApprove && job.matchScore >= autoApproveThreshold) {
            await this.createApprovalRequest(workflow.id, job, 'auto-approved', job.matchScore);
            return { status: 'auto-approved', job };
          }

          // High score: auto-approve
          if (job.matchScore >= 75) {
            await this.createApprovalRequest(workflow.id, job, 'approved', job.matchScore);
            return { status: 'approved', job };
          }

          // Medium score: create approval request and wait
          if (job.matchScore >= 60) {
            const requestId = await this.createApprovalRequest(workflow.id, job, 'pending', job.matchScore);
            
            // Send notification for manual approval
            await this.sendApprovalRequestNotification(workflow.id, requestId, job);
            
            // Wait for approval (max 24 hours)
            await step.sleep(`wait-approval-${job.id}`, '24 hours');
            
            // Check approval status
            const approvalStatus = await this.getApprovalStatus(requestId);
            return { status: approvalStatus, job, requestId };
          }

          // Low score: reject
          await this.createApprovalRequest(workflow.id, job, 'rejected', job.matchScore);
          return { status: 'rejected', job, reason: 'Match score below threshold' };
        }
      );

      approvalResults.push(approvalResult);
      
      if (approvalResult.status === 'approved' || approvalResult.status === 'auto-approved') {
        approvedJobs.push(approvalResult.job);
        workflow.stats.jobsApproved++;
      } else if (approvalResult.status === 'rejected') {
        workflow.stats.jobsRejected++;
      }
    }

    workflow.steps.push({ 
      step: 'approval-gate', 
      status: 'completed', 
      approved: workflow.stats.jobsApproved,
      rejected: workflow.stats.jobsRejected 
    });
    await this.logWorkflowStep(workflow.id, 'approval-gate', 'completed', {
      approved: workflow.stats.jobsApproved,
      rejected: workflow.stats.jobsRejected,
    });

    // Step 6: Apply to approved jobs
    const applicationResults = [];

    if (!dryRun && approvedJobs.length > 0) {
      for (const job of approvedJobs) {
        const result = await step.do(
          `apply-job-${job.id}`,
          {
            retries: { limit: 3, delay: '30 seconds', backoff: 'exponential' },
            timeout: '5 minutes',
          },
          async () => {
            try {
              // Prepare application data
              const coverLetter = await this.generateCoverLetter(job);
              const resume = await this.getResume(resumeId);
              
              // Submit application
              const submitResult = await this.submitApplication({
                platform: job.source,
                jobId: job.id,
                resume,
                coverLetter,
              });

              if (submitResult.success) {
                workflow.stats.jobsApplied++;
                
                // Record in database
                await this.recordApplication({
                  workflowId: workflow.id,
                  jobId: job.id,
                  platform: job.source,
                  company: job.company,
                  position: job.position,
                  resumeId,
                  coverLetter,
                  matchScore: job.matchScore,
                });

                return { 
                  success: true, 
                  jobId: job.id,
                  company: job.company,
                  position: job.position,
                };
              } else {
                workflow.stats.jobsFailed++;
                return { 
                  success: false, 
                  jobId: job.id,
                  error: submitResult.error,
                };
              }
            } catch (error) {
              workflow.stats.jobsFailed++;
              return { 
                success: false, 
                jobId: job.id,
                error: error.message,
              };
            }
          }
        );

        applicationResults.push(result);

        // Rate limit between applications
        if (approvedJobs.indexOf(job) < approvedJobs.length - 1) {
          await step.sleep('pause-between-applications', '5 seconds');
        }
      }
    } else if (dryRun) {
      workflow.steps.push({ step: 'apply-jobs', status: 'dry-run', count: approvedJobs.length });
    }

    workflow.steps.push({ 
      step: 'apply-jobs', 
      status: 'completed', 
      applied: workflow.stats.jobsApplied,
      failed: workflow.stats.jobsFailed 
    });
    await this.logWorkflowStep(workflow.id, 'apply-jobs', 'completed', {
      applied: workflow.stats.jobsApplied,
      failed: workflow.stats.jobsFailed,
    });

    // Step 7: Finalize workflow
    workflow.status = workflow.stats.jobsFailed > 0 && workflow.stats.jobsApplied === 0 
      ? 'failed' 
      : 'completed';
    workflow.completedAt = new Date().toISOString();
    await this.saveWorkflowState(workflow);

    // Step 8: Send completion notification
    await step.do(
      'notify-completion',
      {
        retries: { limit: 2, delay: '10 seconds' },
        timeout: '30 seconds',
      },
      async () => {
        const success = workflow.stats.jobsApplied > 0;
        const icon = success ? '✅' : workflow.stats.jobsFailed > 0 ? '⚠️' : 'ℹ️';
        const status = success ? 'Success' : workflow.stats.jobsFailed > 0 ? 'Partial' : 'No Action';
        
        const jobList = approvedJobs
          .slice(0, 5)
          .map(j => `  • ${escapeHtml(j.company)} - ${escapeHtml(j.position)} (${j.matchScore}%)`)
          .join('\n') || 'None';

        await notificationService.sendTelegramNotification({
          text:
            `${icon} <b>Application Workflow Complete</b>\n\n` +
            `<b>Status</b>: ${status}\n` +
            `<b>Trigger</b>: ${triggerType}\n` +
            `<b>Mode</b>: ${dryRun ? 'Dry Run' : 'Live'}\n\n` +
            `<b>Stats</b>:\n` +
            `  Found: ${workflow.stats.jobsFound}\n` +
            `  Approved: ${workflow.stats.jobsApproved}\n` +
            `  Applied: ${workflow.stats.jobsApplied}\n` +
            `  Failed: ${workflow.stats.jobsFailed}\n\n` +
            `<b>Top Jobs</b>:\n${jobList}`
        });
      },
    );



    workflow.steps.push({ step: 'notify', status: 'completed' });

    return {
      success: workflow.status === 'completed',
      workflow,
      applications: applicationResults,
      dryRun,
    };
  }

  // ============================================================================
  // Database Operations
  // ============================================================================

  async saveWorkflowState(workflow) {
    await this.env.DB.prepare(
      `
      INSERT INTO application_workflows (
        id, status, trigger_type, jobs_found, jobs_approved, jobs_applied,
        jobs_failed, started_at, completed_at, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        jobs_found = excluded.jobs_found,
        jobs_approved = excluded.jobs_approved,
        jobs_applied = excluded.jobs_applied,
        jobs_failed = excluded.jobs_failed,
        completed_at = excluded.completed_at,
        data = excluded.data,
        updated_at = datetime('now')
      `
    )
      .bind(
        workflow.id,
        workflow.status,
        workflow.triggerType,
        workflow.stats.jobsFound,
        workflow.stats.jobsApproved,
        workflow.stats.jobsApplied,
        workflow.stats.jobsFailed,
        workflow.startedAt,
        workflow.completedAt,
        JSON.stringify({ steps: workflow.steps, errors: workflow.errors })
      )
      .run();
  }

  async logWorkflowStep(workflowId, stepName, status, details = {}) {
    await this.env.DB.prepare(
      `
      INSERT INTO workflow_logs (
        id, workflow_id, step_name, status, details, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
      `
    )
      .bind(
        `${workflowId}-${stepName}-${Date.now()}`,
        workflowId,
        stepName,
        status,
        JSON.stringify(details)
      )
      .run();
  }

  async createApprovalRequest(workflowId, job, status, matchScore) {
    const requestId = `approval-${workflowId}-${job.id}`;
    
    await this.env.DB.prepare(
      `
      INSERT INTO approval_requests (
        id, workflow_id, job_id, job_title, company, platform,
        match_score, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        status = excluded.status,
        updated_at = datetime('now')
      `
    )
      .bind(
        requestId,
        workflowId,
        job.id,
        job.position,
        job.company,
        job.source,
        matchScore,
        status
      )
      .run();
    
    return requestId;
  }

  async getApprovalStatus(requestId) {
    const result = await this.env.DB.prepare(
      'SELECT status FROM approval_requests WHERE id = ?'
    )
      .bind(requestId)
      .first();
    
    return result?.status || 'pending';
  }

  async recordApplication({ workflowId, jobId, platform, company, position, resumeId, coverLetter, matchScore }) {
    const applicationId = `${workflowId}-${jobId}`;
    
    await this.env.DB.prepare(
      `
      INSERT INTO applications (
        id, workflow_id, job_id, source, company, position,
        match_score, status, resume_id, cover_letter, applied_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `
    )
      .bind(
        applicationId,
        workflowId,
        jobId,
        platform,
        company,
        position,
        matchScore,
        'applied',
        resumeId,
        coverLetter
      )
      .run();
  }

  async getDailyApplicationCount(date) {
    const result = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as count FROM applications 
      WHERE date(applied_at) = ? AND status = 'applied'
      `
    )
      .bind(date)
      .first();
    
    return result?.count || 0;
  }

  // ============================================================================
  // Job Search
  // ============================================================================

  async searchJobs(platform, criteria) {
    switch (platform) {
      case 'wanted':
        return this.searchWanted(criteria);
      case 'linkedin':
        return this.searchLinkedIn(criteria);
      case 'remember':
        return this.searchRemember(criteria);
      default:
        return [];
    }
  }

  async searchWanted(criteria) {
    const session = await this.env.SESSIONS.get('auth:wanted');
    if (!session) {
      throw new Error('No Wanted session available');
    }

    const params = new URLSearchParams();
    if (criteria.keyword) params.append('query', criteria.keyword);
    if (criteria.location) params.append('location', criteria.location);
    
    const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs?${params}`, {
      headers: {
        Cookie: session,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Wanted API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map(job => ({
      id: `wanted-${job.id}`,
      company: job.company?.name || 'Unknown',
      position: job.position || 'Unknown',
      url: `https://www.wanted.co.kr/wd/${job.id}`,
      location: job.address?.location || '',
      experience: job.years || '',
      description: job.detail?.description || '',
    }));
  }

  async searchLinkedIn(criteria) {
    const keyword = encodeURIComponent(criteria.keyword || '');
    const location = encodeURIComponent(criteria.location || '');
    
    const response = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&f_TPR=r604800`,
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const html = await response.text();
    const jobs = [];
    const pattern = /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title[^>]*>([^<]+)<\/[\s\S]*?base-search-card__subtitle[\s\S]*?<a[^>]*>([^<]+)</gi;
    
    let match = pattern.exec(html);
    while (match !== null) {
      jobs.push({
        id: `linkedin-${match[1]}`,
        position: match[2].trim(),
        company: match[3].trim(),
        url: `https://www.linkedin.com/jobs/view/${match[1]}`,
      });
      match = pattern.exec(html);
    }
    
    return jobs;
  }

  async searchRemember(criteria) {
    const headers = {
      Accept: 'application/json',
      Origin: 'https://career.rememberapp.co.kr',
      Referer: 'https://career.rememberapp.co.kr/job/postings',
      'User-Agent': DEFAULT_USER_AGENT,
    };

    const response = criteria.keyword
      ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `page=1&per=20&search=${encodeURIComponent(criteria.keyword)}`,
        })
      : await fetch('https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20', {
          headers,
        });

    if (!response.ok) {
      throw new Error(`Remember API error: ${response.status}`);
    }

    const data = await response.json();
    const jobs = Array.isArray(data?.data?.job_postings)
      ? data.data.job_postings
      : Array.isArray(data?.data)
        ? data.data
        : [];

    return jobs
      .filter(job => job?.id)
      .map(job => ({
        id: `remember-${job.id}`,
        company: job.organization?.name || job.company?.name || '',
        position: job.title || '',
        url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
        location: job.location?.name || '',
      }));
  }

  // ============================================================================
  // Application Submission
  // ============================================================================

  async submitApplication({ platform, jobId, resume, coverLetter }) {
    const submitters = {
      wanted: () => this.submitToWanted(jobId, resume, coverLetter),
      linkedin: () => this.submitToLinkedIn(jobId, resume, coverLetter),
      remember: () => this.submitToRemember(jobId, resume, coverLetter),
      jobkorea: () => this.submitToJobKorea(jobId, resume, coverLetter),
      saramin: () => this.submitToSaramin(jobId, resume, coverLetter),
    };

    const submitter = submitters[platform];
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

    const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs/${jobId.replace('wanted-', '')}/apply`, {
      method: 'POST',
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({
        resume_id: resume?.id,
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
    return {
      success: false,
      error: 'LinkedIn Easy Apply requires browser automation (Puppeteer). Use job-server CLI.',
      platform: 'linkedin',
      requiresJobServer: true,
    };
  }

  async submitToRemember(jobId, resume, coverLetter) {
    return {
      success: false,
      error: 'Remember application requires browser automation (Puppeteer). Use job-server CLI.',
      platform: 'remember',
      requiresJobServer: true,
    };
  }

  async submitToJobKorea(jobId, resume, coverLetter) {
    return {
      success: false,
      error: 'JobKorea application requires browser automation (Puppeteer). Use job-server CLI.',
      platform: 'jobkorea',
      requiresJobServer: true,
    };
  }

  async submitToSaramin(jobId, resume, coverLetter) {
    return {
      success: false,
      error: 'Saramin application requires browser automation (Puppeteer). Use job-server CLI.',
      platform: 'saramin',
      requiresJobServer: true,
    };
  }

  // ============================================================================
  // Cover Letter & Resume
  // ============================================================================

  async generateCoverLetter(job) {
    if (this.env.AI) {
      try {
        const resume = await this.getStoredResume();
        const prompt = this.buildCoverLetterPrompt(job, resume);
        
        const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'You are a professional cover letter writer. Write concise, compelling cover letters. Match the language of the job posting. Keep it under 300 words.',
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

    return this.getTemplateCoverLetter(job);
  }

  buildCoverLetterPrompt(job, resume) {
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

  getTemplateCoverLetter(job) {
    const isKorean = ['wanted', 'jobkorea', 'saramin', 'remember'].includes(job.source);
    if (isKorean) {
      return `${job.company}의 ${job.position} 포지션에 지원합니다. 해당 직무에 대한 강한 관심과 관련 경험을 바탕으로 기여하고 싶습니다.`;
    }
    return `I am excited to apply for the ${job.position} position at ${job.company}. I am confident my skills and experience make me a strong candidate for this role.`;
  }

  async getResume(resumeId) {
    const resume = await this.env.DB.prepare('SELECT * FROM resumes WHERE id = ?')
      .bind(resumeId)
      .first();
    return resume;
  }

  async getStoredResume() {
    try {
      return await this.env.SESSIONS.get('resume:current', 'json');
    } catch {
      return null;
    }
  }

  async getMatchingConfig() {
    try {
      const config = await this.env.DB.prepare(
        "SELECT value FROM config WHERE key = 'auto_apply_config'"
      ).first();
      return config?.value ? JSON.parse(config.value) : { minMatchScore: 70 };
    } catch {
      return { minMatchScore: 70 };
    }
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  async sendApprovalRequestNotification(workflowId, requestId, job) {
    const notificationService = new NotificationService(this.env);
    await notificationService.sendApprovalRequest(job, job.matchScore, requestId);
  }

  async sendNotification(message) {
    const notificationService = new NotificationService(this.env);
    await notificationService.sendTelegramNotification({ text: message });
  }
}
