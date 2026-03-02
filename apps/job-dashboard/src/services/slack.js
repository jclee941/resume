export async function sendSlackMessage(env, message) {
  if (!env.SLACK_TOKEN || !env.SLACK_CHANNEL) {
    console.warn('Slack not configured: missing SLACK_TOKEN or SLACK_CHANNEL');
    return false;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.SLACK_TOKEN}`,
      },
      body: JSON.stringify({
        channel: env.SLACK_CHANNEL,
        text: message.text,
        ...(message.blocks && { blocks: message.blocks }),
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Slack API error:', result.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    return false;
  }
}
