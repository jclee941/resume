/**
 * Notification Service for Job Automation
 * Consolidated notification path for automation event webhooks.
 */

import { signWebhookPayload } from '../webhook/webhook-signer.js';

class NotificationService {
  /**
   * @param {Record<string, string | undefined>} [env]
   */
  constructor(env = process.env) {
    this.env = env;
    this.webhookUrl = env.AUTOMATION_WEBHOOK_URL || env.WEBHOOK_URL || null;
    this.webhookSecret = env.AUTOMATION_WEBHOOK_SECRET || env.WEBHOOK_SECRET || null;
    this.enabled = !!this.webhookUrl;
  }

  /**
   * @param {string} event
   * @param {unknown} data
   * @returns {Promise<{ sent: boolean; event: string; reason?: string; status?: number }>}
   */
  async postEvent(event, data) {
    if (!this.enabled) {
      console.log('Notifications disabled (AUTOMATION_WEBHOOK_URL not set)');
      return { sent: false, event, reason: 'not-configured' };
    }

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    /** @type {Record<string, string>} */
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
    };

    if (this.webhookSecret) {
      const { signature } = signWebhookPayload(payload, this.webhookSecret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(/** @type {string} */ (this.webhookUrl), {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    return { sent: response.ok, event, status: response.status };
  }

  /**
   * 입사지원 성공 알림
   * @param {string} companyName
   * @param {string} jobTitle
   * @param {string} jobUrl
   * @param {string} [platform]
   */
  async notifyApplySuccess(companyName, jobTitle, jobUrl, platform = 'wanted') {
    return this.postEvent('apply.success', { companyName, jobTitle, jobUrl, platform });
  }

  /**
   * 입사지원 실패 알림
   * @param {string | undefined} companyName
   * @param {string | undefined} jobTitle
   * @param {string} jobUrl
   * @param {unknown} error
   * @param {string} [platform]
   */
  async notifyApplyFailed(companyName, jobTitle, jobUrl, error, platform = 'wanted') {
    return this.postEvent('apply.failed', { companyName, jobTitle, jobUrl, error, platform });
  }

  /**
   * 이력서 동기화 완료 알림
   * @param {string} platform
   * @param {string} resumeId
   * @param {boolean} [success]
   */
  async notifyResumeSync(platform, resumeId, success = true) {
    return this.postEvent('resume.sync', { platform, resumeId, success });
  }

  /**
   * 자동화 작업 시작 알림
   * @param {string} jobType
   * @param {Record<string, unknown>} [details]
   */
  async notifyJobStarted(jobType, details = {}) {
    return this.postEvent('job.started', { jobType, details });
  }

  /**
   * 자동화 작업 완료 알림
   * @param {string} jobType
   * @param {unknown} [result]
   * @param {number} [duration]
   */
  async notifyJobCompleted(jobType, result, duration) {
    return this.postEvent('job.completed', { jobType, result, duration });
  }
}

// Export singleton instance
export const notifications = new NotificationService();
export default NotificationService;
