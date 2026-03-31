/**
 * Notification Service for Job Automation
 * Consolidated notification path: app -> N8NWebhookService -> n8n -> Telegram
 * All notifications route through n8n for centralized credential management
 */

import { n8n } from '../n8n/index.js';

class NotificationService {
  constructor() {
    this.enabled = !!(process.env.N8N_URL || process.env.N8N_WEBHOOK_URL);
  }

  /**
   * 입사지원 성공 알림
   * Routes through n8n webhook -> Telegram
   */
  async notifyApplySuccess(companyName, jobTitle, jobUrl, platform = 'wanted') {
    if (!this.enabled) {
      console.log('ℹ️ Notifications disabled (N8N_WEBHOOK_URL not set)');
      return;
    }
    return n8n.notifyApplySuccess(companyName, jobTitle, jobUrl, platform);
  }

  /**
   * 입사지원 실패 알림
   * Routes through n8n webhook -> Telegram
   */
  async notifyApplyFailed(companyName, jobTitle, jobUrl, error, platform = 'wanted') {
    if (!this.enabled) {
      console.log('ℹ️ Notifications disabled (N8N_WEBHOOK_URL not set)');
      return;
    }
    return n8n.notifyApplyFailed(companyName, jobTitle, jobUrl, error, platform);
  }

  /**
   * 이력서 동기화 완료 알림
   * Routes through n8n webhook -> Telegram
   */
  async notifyResumeSync(platform, resumeId, success = true) {
    if (!this.enabled) {
      console.log('ℹ️ Notifications disabled (N8N_WEBHOOK_URL not set)');
      return;
    }
    return n8n.notifyResumeSync(platform, resumeId, success);
  }

  /**
   * 자동화 작업 시작 알림
   * Routes through n8n webhook -> Telegram
   */
  async notifyJobStarted(jobType, details = {}) {
    if (!this.enabled) {
      console.log('ℹ️ Notifications disabled (N8N_WEBHOOK_URL not set)');
      return;
    }
    return n8n.notifyJobStarted(jobType, details);
  }

  /**
   * 자동화 작업 완료 알림
   * Routes through n8n webhook -> Telegram
   */
  async notifyJobCompleted(jobType, result, duration) {
    if (!this.enabled) {
      console.log('ℹ️ Notifications disabled (N8N_WEBHOOK_URL not set)');
      return;
    }
    return n8n.notifyJobCompleted(jobType, result, duration);
  }
}

// Export singleton instance
export const notifications = new NotificationService();
export default NotificationService;
