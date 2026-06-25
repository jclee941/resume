/**
 * Notification Service for Job Automation
 * Consolidated notification path for automation event webhooks.
 */

import { signWebhookPayload } from '../webhook/webhook-signer.js';

class NotificationService {
  constructor(env = process.env) {
    this.env = env;
    this.webhookUrl = env.AUTOMATION_WEBHOOK_URL || env.WEBHOOK_URL || null;
    this.webhookSecret = env.AUTOMATION_WEBHOOK_SECRET || env.WEBHOOK_SECRET || null;
    this.enabled = !!this.webhookUrl;
  }

  async postEvent(event, data) {
    if (!this.enabled) {
      console.log('Notifications disabled (AUTOMATION_WEBHOOK_URL not set)');
      return { sent: false, event, reason: 'not-configured' };
    }

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
    };

    if (this.webhookSecret) {
      const { signature } = signWebhookPayload(payload, this.webhookSecret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    return { sent: response.ok, event, status: response.status };
  }

  /**
   * 입사지원 성공 알림
   */
  async notifyApplySuccess(companyName, jobTitle, jobUrl, platform = 'wanted') {
    return this.postEvent('apply.success', { companyName, jobTitle, jobUrl, platform });
  }

  /**
   * 입사지원 실패 알림
   */
  async notifyApplyFailed(companyName, jobTitle, jobUrl, error, platform = 'wanted') {
    return this.postEvent('apply.failed', { companyName, jobTitle, jobUrl, error, platform });
  }

  /**
   * 이력서 동기화 완료 알림
   */
  async notifyResumeSync(platform, resumeId, success = true) {
    return this.postEvent('resume.sync', { platform, resumeId, success });
  }

  /**
   * 자동화 작업 시작 알림
   */
  async notifyJobStarted(jobType, details = {}) {
    return this.postEvent('job.started', { jobType, details });
  }

  /**
   * 자동화 작업 완료 알림
   */
  async notifyJobCompleted(jobType, result, duration) {
    return this.postEvent('job.completed', { jobType, result, duration });
  }
}

// Export singleton instance
export const notifications = new NotificationService();
export default NotificationService;
