import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SLACK_CREDENTIALS_PATH = join(homedir(), '.slack', 'credentials.json');
const CONFIG_PATH = join(__dirname, '..', '..', '..', '..', 'config.json');
const TEAM_ID = 'T09SNJD9TGW';

export function getWebhookUrl() {
  if (process.env.SLACK_WEBHOOK_URL) {
    return process.env.SLACK_WEBHOOK_URL;
  }

  if (existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
      return config.notifications?.slack?.webhookUrl;
    } catch {
      return null;
    }
  }
  return null;
}

export function getSlackToken() {
  if (process.env.SLACK_BOT_TOKEN) {
    return process.env.SLACK_BOT_TOKEN;
  }

  if (existsSync(SLACK_CREDENTIALS_PATH)) {
    try {
      const credentials = JSON.parse(
        readFileSync(SLACK_CREDENTIALS_PATH, 'utf-8'),
      );
      const teamCreds = credentials[TEAM_ID];
      if (teamCreds?.token) {
        return teamCreds.token;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export async function slackAPI(method, body = {}) {
  const token = getSlackToken();

  if (!token) {
    throw new Error(
      'Slack token not found. Set SLACK_BOT_TOKEN or run: slack login',
    );
  }

  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }

  return result;
}

export async function sendViaWebhook(webhookUrl, payload) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Webhook error: ${response.status} - ${text}`);
  }

  return { ok: true };
}

const channelCache = new Map();

export async function getChannelId(channelName) {
  if (channelCache.has(channelName)) {
    return channelCache.get(channelName);
  }

  try {
    const result = await slackAPI('conversations.list', {
      types: 'public_channel,private_channel',
      limit: 200,
    });

    const channel = result.channels.find(
      (c) =>
        c.name === channelName.replace('#', '') || `#${c.name}` === channelName,
    );

    if (channel) {
      channelCache.set(channelName, channel.id);
      return channel.id;
    }
  } catch {
    return channelName;
  }

  return channelName;
}
