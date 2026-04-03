export async function processJob(job, context = {}) {
  const score = Number(job.matchScore ?? job.matchPercentage ?? 0);
  const jobId = String(job.id ?? job.job_id ?? `${job.source}:${job.company}:${job.position}`);

  const stageState = {
    generateCoverLetter: false,
    checkApproval: false,
    submit: false,
    track: false,
  };

  let trackedApplication = null;
  let coverLetter = null;

  try {
    trackedApplication = await this.tracker.startTracking(job, score);
    stageState.track = true;

    await this.tracker.recordScoring(trackedApplication.id, score, job.matchType || 'hybrid');

    if (score >= this.config.reviewThreshold) {
      stageState.generateCoverLetter = true;
      const generated = await this.retryService.execute(
        async () => await this.coverLetterService.generateForJob(job),
        { serviceName: 'cover-letter-generation' }
      );
      coverLetter = generated?.coverLetter || null;
      await this.tracker.recordCoverLetter(trackedApplication.id, coverLetter || '');
      await this.repository.update(trackedApplication.id, {
        cover_letter: coverLetter,
        notes: generated?.cached ? 'Cover letter loaded from cache' : 'Cover letter generated',
      });
    }

    stageState.checkApproval = true;
    const applyDecision = await this.shouldApply(
      {
        ...job,
        matchScore: score,
      },
      trackedApplication
    );

    if (!applyDecision.apply) {
      await this.repository.updateStatus(
        trackedApplication.id,
        applyDecision.status || 'skip',
        applyDecision.reason || 'Skipped by apply decision'
      );
      await this.tracker.recordCompletion(
        trackedApplication.id,
        applyDecision.status || 'skip',
        applyDecision.reason || 'Skipped by apply decision'
      );

      return {
        success: true,
        applied: false,
        status: applyDecision.status || 'skipped',
        reason: applyDecision.reason,
        jobId,
        applicationId: trackedApplication.id,
        stages: stageState,
      };
    }

    if (this.config.dryRun || !this.config.autoApply) {
      await this.repository.updateStatus(
        trackedApplication.id,
        'pending',
        this.config.dryRun ? 'Dry run - submission skipped' : 'Auto-apply disabled'
      );
      await this.tracker.recordCompletion(
        trackedApplication.id,
        'pending',
        this.config.dryRun ? 'Dry run - submission skipped' : 'Auto-apply disabled'
      );

      return {
        success: true,
        applied: false,
        status: 'pending',
        reason: this.config.dryRun ? 'dry_run' : 'auto_apply_disabled',
        jobId,
        applicationId: trackedApplication.id,
        stages: stageState,
      };
    }

    if (typeof context.ensureBrowser === 'function') {
      await context.ensureBrowser();
    }

    stageState.submit = true;
    const submissionResult = await this.submitApplication({
      ...job,
      applicationId: trackedApplication.id,
      coverLetter,
    });

    if (!submissionResult.success) {
      throw new Error(submissionResult.error || 'Unknown submission error');
    }

    await this.tracker.recordSubmission(trackedApplication.id, {
      message: 'Application submitted successfully',
      sourceUrl: job.sourceUrl,
    });
    await this.repository.updateStatus(
      trackedApplication.id,
      'submitted',
      'Application submitted via auto-applier'
    );
    await this.tracker.recordCompletion(trackedApplication.id, 'completed', 'Submission completed');

    await this.retryService.execute(
      async () =>
        await this.notificationAdapter.sendApplicationSuccess(
          job,
          trackedApplication.id,
          job.source
        ),
      { serviceName: 'telegram-notify-success' }
    );

    return {
      success: true,
      applied: true,
      status: 'submitted',
      jobId,
      applicationId: trackedApplication.id,
      submission: submissionResult,
      stages: stageState,
    };
  } catch (error) {
    const applicationId = trackedApplication?.id || null;

    if (applicationId) {
      try {
        await this.repository.updateStatus(applicationId, 'failed', error.message);
        await this.tracker.recordCompletion(applicationId, 'failed', error.message);
      } catch (trackingError) {
        this.logger.error(
          `[auto-applier] failed to persist failure state (${applicationId}): ${trackingError.message}`
        );
      }

      try {
        await this.retryService.execute(
          async () =>
            await this.notificationAdapter.sendApplicationFailed(
              job,
              applicationId,
              error,
              job.source
            ),
          { serviceName: 'telegram-notify-failure' }
        );
      } catch (notifyError) {
        this.logger.error(
          `[auto-applier] failure notification failed (${applicationId}): ${notifyError.message}`
        );
      }
    }

    this.logger.error(`❌ Failed to process job ${job.company}/${job.position}: ${error.message}`);
    return {
      success: false,
      applied: false,
      status: 'failed',
      error: error.message,
      jobId,
      applicationId,
      stages: stageState,
    };
  }
}

export async function shouldApply(job, trackedApplication = null) {
  const score = Number(job.matchScore ?? job.matchPercentage ?? 0);
  const jobId = job.id ?? job.job_id ?? null;

  if (!Number.isFinite(score) || score < this.config.reviewThreshold) {
    return {
      apply: false,
      status: 'skip',
      reason: `Score below threshold (${score} < ${this.config.reviewThreshold})`,
    };
  }

  if (jobId && this.appManager.isDuplicate(jobId)) {
    return { apply: false, status: 'skip', reason: 'Duplicate job in local manager' };
  }

  if (jobId) {
    const existing = await this.repository.findByJobId(String(jobId));
    const alreadySubmitted = existing.some((app) =>
      ['submitted', 'applied', 'completed', 'approved', 'can_apply'].includes(app.status)
    );
    if (alreadySubmitted) {
      return { apply: false, status: 'skip', reason: 'Duplicate job in repository' };
    }
  }

  if (score >= this.config.autoApplyThreshold) {
    return { apply: true, status: 'can_apply', reason: 'Auto-apply threshold met' };
  }

  const approvalResult = await this.handleApproval(job, trackedApplication);
  if (!approvalResult.approved) {
    return {
      apply: false,
      status: approvalResult.status,
      reason: approvalResult.reason,
    };
  }

  return {
    apply: true,
    status: 'can_apply',
    reason: 'Approved by manual workflow',
  };
}

export async function submitApplication(job) {
  return await this.retryService.execute(async () => await this.applyToJob(job), {
    serviceName: `apply-${job.source || 'unknown'}`,
  });
}

export async function handleApproval(job, trackedApplication = null) {
  const score = Number(job.matchScore ?? job.matchPercentage ?? 0);
  if (score < this.config.reviewThreshold || score >= this.config.autoApplyThreshold) {
    return {
      approved: true,
      status: 'can_apply',
      reason: 'Approval not required for this score tier',
    };
  }

  const applicationId = trackedApplication?.id || job.applicationId;
  if (!applicationId) {
    return {
      approved: false,
      status: 'failed',
      reason: 'Missing application ID for approval workflow',
    };
  }

  await this.tracker.recordApprovalRequest(applicationId);
  await this.approvalManager.requestApproval(
    {
      ...job,
      applicationId,
    },
    score
  );

  const status = await this.approvalManager.checkApprovalStatus(applicationId);

  if (status.status === 'approved') {
    await this.tracker.recordApproval(applicationId, true, status.reviewedBy || 'reviewer');
    return {
      approved: true,
      status: 'approved',
      reason: 'Approval granted',
    };
  }

  if (status.status === 'rejected' || status.status === 'timeout') {
    await this.tracker.recordApproval(applicationId, false, status.reviewedBy || 'reviewer');
    return {
      approved: false,
      status: 'rejected',
      reason: status.notes?.reason || 'Approval rejected',
    };
  }

  return {
    approved: false,
    status: 'pending',
    reason: 'Awaiting manual approval',
  };
}

export async function getExistingJobKeys() {
  const todayApplications = await this.repository.findTodayApplications();
  const keys = new Set();
  for (const app of todayApplications) {
    const company = String(app.company || '')
      .toLowerCase()
      .trim();
    const position = String(app.position || '')
      .toLowerCase()
      .trim();
    if (company || position) {
      keys.add(`${company}:${position}`);
    }
  }
  return keys;
}
