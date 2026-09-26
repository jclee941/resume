import { MESSAGE_TYPES } from './queue-message-constants.js';

/**
 * @typedef {Object} WorkflowInstance
 * @property {string} id
 */

/**
 * @typedef {Object} WorkflowBinding
 * @property {(options: { params: Record<string, unknown> }) => Promise<WorkflowInstance>} create
 */

/**
 * @typedef {Object} DispatcherEnv
 * @property {WorkflowBinding} JOB_CRAWLING_WORKFLOW
 * @property {WorkflowBinding} APPLICATION_WORKFLOW
 * @property {WorkflowBinding} RESUME_SYNC_WORKFLOW
 * @property {WorkflowBinding} DAILY_REPORT_WORKFLOW
 * @property {WorkflowBinding} CLEANUP_WORKFLOW
 */

/**
 * @typedef {Object} DispatcherLogger
 * @property {(message: string, meta?: Record<string, unknown>) => void} info
 * @property {(message: string, meta?: Record<string, unknown>) => void} warn
 */

/**
 * @typedef {Object} WorkflowPayload
 * @property {string[]} [platforms]
 * @property {Record<string, unknown>} [searchCriteria]
 * @property {Record<string, unknown>} [filters]
 * @property {string[]} [keywords]
 * @property {boolean} [dryRun]
 * @property {string} [jobId]
 * @property {string} [platform]
 * @property {string} [resumeId]
 * @property {boolean} [autoSubmit]
 * @property {string} [source]
 * @property {string} [triggerType]
 * @property {unknown[]} [candidates]
 * @property {string[]} [sections]
 * @property {string} [reportType]
 * @property {string[]} [recipients]
 * @property {number} [retentionDays]
 * @property {string[]} [targets]
 */

export class QueueWorkflowDispatcher {
  /**
   * @param {DispatcherEnv} env
   * @param {DispatcherLogger} logger
   */
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;
  }

  /**
   * @param {string} type
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
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

  /**
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
  async handleCrawl(payload) {
    const instance = await this.env.JOB_CRAWLING_WORKFLOW.create({
      params: {
        platforms: payload.platforms || ['wanted'],
        searchCriteria: payload.searchCriteria || {
          ...(payload.filters || {}),
          keywords: payload.keywords || [],
        },
        dryRun: payload.dryRun ?? false,
        source: 'queue',
      },
    });

    this.logger.info('Crawl workflow started', {
      instanceId: instance.id,
      platforms: payload.platforms,
    });
  }

  /**
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
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

  /**
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
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

  /**
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
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

  /**
   * @param {WorkflowPayload} payload
   * @returns {Promise<void>}
   */
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

/**
 * @param {WorkflowPayload | null | undefined} payload
 * @returns {unknown}
 */
function isApplicationWorkflowPayload(payload) {
  return (
    Array.isArray(payload?.candidates) ||
    Array.isArray(payload?.platforms) ||
    payload?.searchCriteria ||
    payload?.triggerType
  );
}
