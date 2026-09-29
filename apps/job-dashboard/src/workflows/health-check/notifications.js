import { sendTelegramNotification, escapeHtml } from '../../services/notifications.js';
import { getEscalationLevel, isServiceAffected } from './evaluation.js';

/**
 * @typedef {{
 *   url: string;
 *   status_label: string;
 *   latencyMs: number;
 *   healthy: boolean;
 *   [key: string]: unknown;
 * }} EvaluatedService
 *
 * @typedef {{
 *   healthy: boolean;
 *   error?: string;
 * }} EvaluatedBinding
 *
 * @typedef {{
 *   services: EvaluatedService[];
 *   bindings: { d1: EvaluatedBinding; kv: EvaluatedBinding };
 *   overallHealth: string;
 *   hasBindingFailure: boolean;
 *   hasDown: boolean;
 *   hasDegraded: boolean;
 * }} HealthEvaluation
 *
 * @typedef {'emergency' | 'critical' | 'warning' | 'none'} EscalationLevel
 *
 * @typedef {{
 *   env: import('../../services/notifications.js').NotificationEnv;
 *   getConsecutiveFailures(): Promise<number>;
 * }} HealthWorkflow
 */

/** @type {Record<string, string>} */
const ESCALATION_EMOJI = {
  warning: '🟡',
  critical: '🔴',
  emergency: '🚨',
};

/**
 * @param {HealthWorkflow} workflow
 * @param {HealthEvaluation} healthEvaluation
 * @param {string} startedAt
 * @returns {Promise<{ notified: boolean; escalationLevel: EscalationLevel; consecutiveFailures: number }>}
 */
export async function notifyHealthFailure(workflow, healthEvaluation, startedAt) {
  const consecutiveFailures = (await workflow.getConsecutiveFailures()) + 1;
  const escalationLevel = getEscalationLevel(consecutiveFailures);
  const message = buildHealthFailureMessage({
    healthEvaluation,
    escalationLevel,
    consecutiveFailures,
    startedAt,
  });

  await sendTelegramNotification(workflow.env, message);

  return { notified: true, escalationLevel, consecutiveFailures };
}

/**
 * @param {{
 *   healthEvaluation: HealthEvaluation;
 *   escalationLevel: EscalationLevel;
 *   consecutiveFailures: number;
 *   startedAt: string;
 * }} params
 * @returns {string}
 */
export function buildHealthFailureMessage({
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
    `\n\n<b>Consecutive Failures</b>: ${consecutiveFailures}\n` +
    `<b>Escalation</b>: ${escalationLevel}\n` +
    `<b>Checked at</b>: ${startedAt}`;

  return message;
}

/**
 * @param {EvaluatedService[]} services
 * @returns {string}
 */
function formatAffectedServices(services) {
  return services
    .filter(isServiceAffected)
    .map(
      (service) =>
        `• ${escapeHtml(service.url)}: ${escapeHtml(service.status_label)} (${service.latencyMs}ms)`
    )
    .join('\n');
}

/**
 * @param {HealthEvaluation} healthEvaluation
 * @returns {string[]}
 */
function formatBindingStatus(healthEvaluation) {
  /** @type {string[]} */
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
