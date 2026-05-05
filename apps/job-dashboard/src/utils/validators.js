/**
 * Lightweight input validation for Cloudflare Workers — now backed by
 * `@resume/schemas` Zod schemas (issue #17 Phase 2).
 *
 * The hand-rolled implementation that previously lived here has been
 * replaced with thin wrappers that call into the dashboard-shape schemas
 * in `packages/schemas/src/application.js`. The `{ valid, data?, errors? }`
 * return shape is preserved so the three call sites
 * (handlers/applications/{create,update,status}-operation.js) keep working
 * unchanged.
 *
 * The local hand-rolled `isValidUrl` helper is gone — Zod's `z.string().url()`
 * combinator lives in the schema definitions and gives a uniform error.
 */

import {
  dashboardApplicationCreateSchema,
  dashboardApplicationUpdateSchema,
  dashboardStatusUpdateSchema,
} from '@resume/schemas';

/**
 * Convert Zod issues to the legacy `errors: string[]` shape used by handlers.
 * @param {import('zod').ZodIssue[]} issues
 * @returns {string[]}
 */
function zodIssuesToMessages(issues) {
  return issues.map((i) => i.message);
}

/**
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateApplicationCreate(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  const result = dashboardApplicationCreateSchema.safeParse(body);
  if (result.success) return { valid: true, data: body };
  return { valid: false, errors: zodIssuesToMessages(result.error.issues) };
}

/**
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateApplicationUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  const result = dashboardApplicationUpdateSchema.safeParse(body);
  if (result.success) return { valid: true, data: body };
  return { valid: false, errors: zodIssuesToMessages(result.error.issues) };
}

/**
 * @param {Object} body - Raw request body
 * @returns {{ valid: boolean, data?: Object, errors?: string[] }}
 */
export function validateStatusUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  const result = dashboardStatusUpdateSchema.safeParse(body);
  if (result.success) return { valid: true, data: body };
  return { valid: false, errors: zodIssuesToMessages(result.error.issues) };
}
