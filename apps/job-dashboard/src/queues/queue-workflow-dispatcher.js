import { MESSAGE_TYPES } from './queue-message-constants.js';

export class QueueWorkflowDispatcher {
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;
  }

  async dispatch(type, payload) {
    switch (type) {
      case MESSAGE_TYPES.CRAWL:
        return this.handleCrawl(payload);
      case MESSAGE_TYPES.APPLY:
        return this.handleApply(payload);
      case MESSAGE_TYPES.SYNC:
        return this.handleSync(payload);
      case MESSAGE_TYPES.REPORT:
        return this.handleReport(payload);
      case MESSAGE_TYPES.CLEANUP:
        return this.handleCleanup(payload);
      default:
        this.logger.warn('Unknown message type, acknowledging to prevent DLQ', { type });
        return undefined;
    }
  }

  async handleCrawl(payload) {
    const instance = await this.env.JOB_CRAWLING_WORKFLOW.create({
      params: {
        platforms: payload.platforms || ['wanted'],
        keywords: payload.keywords || [],
        filters: payload.filters || {},
        dryRun: payload.dryRun ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Crawl workflow started', {
      instanceId: instance.id,
      platforms: payload.platforms,
    });
  }

  async handleApply(payload) {
    if (isApplicationWorkflowPayload(payload)) {
      const instance = await this.env.APPLICATION_WORKFLOW.create({
        params: { ...payload, source: payload.source || 'queue' },
      });

      this.logger.info('Application workflow started', {
        instanceId: instance.id,
        triggerType: payload.triggerType,
        candidates: payload.candidates?.length || 0,
      });
      return;
    }

    const instance = await this.env.APPLICATION_WORKFLOW.create({
      params: {
        jobId: payload.jobId,
        platform: payload.platform,
        resumeId: payload.resumeId,
        autoSubmit: payload.autoSubmit ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Application workflow started', {
      instanceId: instance.id,
      jobId: payload.jobId,
      platform: payload.platform,
    });
  }

  async handleSync(payload) {
    const instance = await this.env.RESUME_SYNC_WORKFLOW.create({
      params: {
        sections: payload.sections || ['all'],
        dryRun: payload.dryRun ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Sync workflow started', {
      instanceId: instance.id,
      sections: payload.sections,
    });
  }

  async handleReport(payload) {
    const instance = await this.env.DAILY_REPORT_WORKFLOW.create({
      params: {
        type: payload.reportType || 'daily',
        recipients: payload.recipients || [],
        source: 'queue',
      },
    });

    this.logger.info('Report workflow started', {
      instanceId: instance.id,
      reportType: payload.reportType,
    });
  }

  async handleCleanup(payload) {
    const instance = await this.env.CLEANUP_WORKFLOW.create({
      params: {
        retentionDays: payload.retentionDays || 30,
        targets: payload.targets || ['applications', 'logs', 'cache'],
        source: 'queue',
      },
    });

    this.logger.info('Cleanup workflow started', {
      instanceId: instance.id,
      targets: payload.targets,
    });
  }
}

function isApplicationWorkflowPayload(payload) {
  return (
    Array.isArray(payload?.candidates) ||
    Array.isArray(payload?.platforms) ||
    payload?.searchCriteria ||
    payload?.triggerType
  );
}
