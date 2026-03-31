/**
 * ES Logger for MCP server.
 */
import { Logger } from '@resume/shared/logger';

const logger = Logger.create(process.env, {
  service: 'job-automation',
  defaultLevel: 'INFO',
});

/**
 * Structured logger wrapper.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
export function log(level, message, context = {}) {
  const logMethod =
    level === 'debug' ? 'debug' : level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info';
  logger[logMethod](message, null, context);
}

export { logger };
