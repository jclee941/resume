import { sendTelegramNotification, escapeHtml } from '../../services/notifications.js';
import { getEscalationLevel, isServiceAffected } from './evaluation.js';

const ESCALATION_EMOJI = {
  warning: '🟡',
  critical: '🔴',
  emergency: '🚨',
};

export async function notifyHealthFailure(workflow, healthEvaluation, startedAt) {
  const consecutiveFailures = await workflow.getConsecutiveFailures();
  const escalationLevel = getEscalationLevel(consecutiveFailures);
  const message = buildHealthFailureMessage({
    healthEvaluation,
    escalationLevel,
    consecutiveFailures,
    startedAt,
  });

  await sendTelegramNotification(workflow.env, message);

  return { notified: true, escalationLevel, consecutiveFailures: consecutiveFailures + 1 };
}

function buildHealthFailureMessage({
  healthEvaluation,
  escalationLevel,
  consecutiveFailures,
  startedAt,
}) {
  const emoji = ESCALATION_EMOJI[escalationLevel] || '🟡';
  const affectedServices = formatAffectedServices(healthEvaluation.services);
  const bindingStatus = formatBindingStatus(healthEvaluation);

  let message =
    `${emoji} <b>Health Check: ${healthEvaluation.overallHealth.toUpperCase()} [${escalationLevel.toUpperCase()}]</b>\n\n` +
    `<b>Affected Services</b>:\n${affectedServices}`;

  if (bindingStatus.length) {
    message += `\n\n<b>Binding Issues</b>:\n${bindingStatus.join('\n')}`;
  }

  message +=
    `\n\n<b>Consecutive Failures</b>: ${consecutiveFailures + 1}\n` +
    `<b>Escalation</b>: ${escalationLevel}\n` +
    `<b>Checked at</b>: ${startedAt}`;

  return message;
}

function formatAffectedServices(services) {
  return services
    .filter(isServiceAffected)
    .map(
      (service) =>
        `• ${escapeHtml(service.url)}: ${escapeHtml(service.status_label)} (${service.latencyMs}ms)`
    )
    .join('\n');
}

function formatBindingStatus(healthEvaluation) {
  const bindingStatus = [];

  if (!healthEvaluation.hasBindingFailure) {
    return bindingStatus;
  }

  if (!healthEvaluation.bindings.d1.healthy) {
    bindingStatus.push(`• D1: DOWN (${escapeHtml(healthEvaluation.bindings.d1.error)})`);
  }

  if (!healthEvaluation.bindings.kv.healthy) {
    bindingStatus.push(`• KV: DOWN (${escapeHtml(healthEvaluation.bindings.kv.error)})`);
  }

  return bindingStatus;
}
