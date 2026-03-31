/**
 * N8N Webhook Service for Job Automation
 * Routes events to platform-specific n8n workflows
 * n8n에서 텔레그램 알림 처리 및 크리덴셜 관리
 */

class N8NWebhookService {
  constructor() {
    this.baseUrl = process.env.N8N_URL || process.env.N8N_WEBHOOK_URL?.replace(/\/webhook.*/, '') || 'https://n8n.jclee.me';
    this.webhookPaths = {
      default: '/webhook/job-automation',
      wanted: '/webhook/job-automation',
      jobkorea: '/webhook/jobkorea-automation',
      saramin: '/webhook/job-automation',
      remember: '/webhook/job-automation',
    };
  }

  /**
   * Get webhook URL for platform
   */
  getWebhookUrl(platform = 'default') {
    const path = this.webhookPaths[platform] || this.webhookPaths.default;
    return `${this.baseUrl}${path}`;
  }

  /**
   * 입사지원 성공 알림 -> n8n
   */
  async notifyApplySuccess(companyName, jobTitle, jobUrl, platform = 'wanted') {
    return this.sendWebhook(
      {
        event: 'apply_success',
        platform,
        company: companyName,
        title: jobTitle,
        url: jobUrl,
        timestamp: new Date().toISOString(),
        status: 'success',
        message: `🎉 ${companyName} - ${jobTitle} 입사지원 완료`,
      },
      platform
    );
  }

  /**
   * 입사지원 실패 알림 -> n8n
   */
  async notifyApplyFailed(companyName, jobTitle, jobUrl, error, platform = 'wanted') {
    return this.sendWebhook(
      {
        event: 'apply_failed',
        platform,
        company: companyName,
        title: jobTitle,
        url: jobUrl,
        error: error?.message || String(error),
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: `⚠️ ${companyName} - ${jobTitle} 입사지원 실패: ${error?.message || error}`,
      },
      platform
    );
  }

  /**
   * 이력서 동기화 완료 알림 -> n8n
   */
  async notifyResumeSync(platform, resumeId, success = true) {
    const platformNames = {
      wanted: '원티드',
      jobkorea: '잡코리아',
      saramin: '사람인',
      remember: '리멤버',
    };

    return this.sendWebhook(
      {
        event: 'resume_sync',
        platform,
        platformName: platformNames[platform] || platform,
        resumeId,
        success,
        timestamp: new Date().toISOString(),
        status: success ? 'success' : 'failed',
        message: success
          ? `📝 ${platformNames[platform] || platform} 이력서 동기화 완료`
          : `❌ ${platformNames[platform] || platform} 이력서 동기화 실패`,
      },
      platform
    );
  }

  /**
   * 자동화 작업 시작 알림 -> n8n
   */
  async notifyJobStarted(jobType, details = {}) {
    return this.sendWebhook({
      event: 'job_started',
      jobType,
      details,
      timestamp: new Date().toISOString(),
      status: 'started',
    });
  }

  /**
   * 자동화 작업 완료 알림 -> n8n
   */
  async notifyJobCompleted(jobType, result, duration) {
    return this.sendWebhook({
      event: 'job_completed',
      jobType,
      result,
      duration,
      timestamp: new Date().toISOString(),
      status: 'completed',
    });
  }

  /**
   * n8n 웹훅 전송
   * n8n에서 텔레그램 알림 처리 및 크리덴셜 관리
   */
  async sendWebhook(payload, platform = 'default') {
    const webhookUrl = this.getWebhookUrl(platform);
    if (!webhookUrl) {
      console.log('ℹ️ n8n webhook URL not configured');
      return { success: false, reason: 'no_webhook_url' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Source': 'job-automation',
          'X-Event-Type': payload.event,
        },
        body: JSON.stringify({
          ...payload,
          source: 'job-automation',
          project: 'resume-monorepo',
          meta: {
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
          },
        }),
      });

      if (response.ok) {
        console.log(`✅ n8n webhook sent: ${payload.event} -> ${platform}`);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ n8n webhook failed: ${response.status} - ${errorText}`);
        return { success: false, reason: 'http_error', status: response.status };
      }
    } catch (error) {
      console.warn('⚠️ n8n webhook error:', error.message);
      return { success: false, reason: 'network_error', error: error.message };
    }
  }
}

// Export singleton
export const n8n = new N8NWebhookService();
export default N8NWebhookService;
