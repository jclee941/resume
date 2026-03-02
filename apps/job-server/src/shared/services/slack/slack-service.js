import {
  slackAPI,
  sendViaWebhook,
  getWebhookUrl,
  getChannelId,
} from './client.js';
import {
  formatHighMatchJob,
  formatStatusChange,
  formatDailyReport,
  formatSearchResults,
  formatAutoApplyResult,
} from './formatters.js';

const DEFAULT_CHANNEL = '#job-alerts';

export class SlackService {
  #channel;
  #webhookUrl;

  constructor(channel = DEFAULT_CHANNEL) {
    this.#channel = channel;
    this.#webhookUrl = getWebhookUrl();
  }

  async send(payload, channel) {
    const targetChannel = channel || this.#channel;

    if (this.#webhookUrl && !channel) {
      return sendViaWebhook(this.#webhookUrl, payload);
    }

    const channelId = await getChannelId(targetChannel);
    return slackAPI('chat.postMessage', {
      channel: channelId,
      ...payload,
    });
  }

  async update(channel, ts, payload) {
    const channelId = await getChannelId(channel);
    return slackAPI('chat.update', {
      channel: channelId,
      ts,
      ...payload,
    });
  }

  async notifyHighMatchJob(job, matchScore, channel) {
    const payload = formatHighMatchJob(job, matchScore);
    return this.send(payload, channel);
  }

  async notifyStatusChange(application, oldStatus, newStatus, note, channel) {
    const payload = formatStatusChange(application, oldStatus, newStatus, note);
    return this.send(payload, channel);
  }

  async notifyDailyReport(stats, date, channel) {
    const payload = formatDailyReport(stats, date);
    return this.send(payload, channel);
  }

  async notifySearchResults(jobs, query, channel) {
    const payload = formatSearchResults(jobs, query);
    return this.send(payload, channel);
  }

  async notifyAutoApplyResult(results, dryRun, channel) {
    const payload = formatAutoApplyResult(results, dryRun);
    return this.send(payload, channel);
  }

  async sendTest(message, channel) {
    const payload = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🧪 *테스트 메시지*\n${message || 'Slack 연동 테스트입니다.'}`,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `전송 시간: ${new Date().toISOString()}` },
          ],
        },
      ],
    };
    return this.send(payload, channel);
  }
}

let instance = null;

export function getSlackService(channel) {
  if (!instance) {
    instance = new SlackService(channel);
  }
  return instance;
}

export default SlackService;
