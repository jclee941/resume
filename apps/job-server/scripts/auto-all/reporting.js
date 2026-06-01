import { PLATFORMS } from './constants.js';
import { c, log } from './logging.js';
import { checkSession } from './session-status.js';

export function buildSummaryData(platforms = PLATFORMS) {
  const summaryData = {};
  for (const platform of platforms) {
    const status = checkSession(platform);
    const icon = status.valid ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
    console.log(`  ${icon} ${platform}`);
    summaryData[platform] = { valid: status.valid, cookies: status.cookies || 0 };
  }
  console.log('');
  return summaryData;
}

export async function sendWebhookNotification({ summaryData, doExtract, doSync, doVerify }) {
  const webhookUrl =
    process.env.N8N_WEBHOOK_URL || 'https://n8n.jclee.me/webhook/automation-run-report';
  if (!webhookUrl) return;

  try {
    const payload = {
      event: 'automation-run',
      timestamp: new Date().toISOString(),
      platforms: summaryData,
      actions: { extract: doExtract, sync: doSync, verify: doVerify },
    };
    const headers = { 'Content-Type': 'application/json' };
    const secret = process.env.N8N_WEBHOOK_SECRET;
    if (secret) {
      const { createHmac } = await import('crypto');
      headers['X-Webhook-Signature'] = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    }
    await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    log('Webhook notification sent', 'ok');
  } catch (e) {
    log(`Webhook failed: ${e.message}`, 'warn');
  }
}
