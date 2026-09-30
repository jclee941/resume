/**
 * @fileoverview Shared contract of the application-history sync: the normalized record both
 * platform adapters produce and the typed error they raise. Records map onto `applications`
 * rows; `jobId` is the dedupe key the auto-apply approval gate reads
 * (`wanted-<jobId>` / `jobkorea-<posting number>`).
 * @module services/application-history/history-types
 */

/**
 * @typedef {'wanted' | 'jobkorea'} HistoryPlatform
 *
 * @typedef {{
 *   source: HistoryPlatform;
 *   jobId: string;
 *   company: string;
 *   position: string;
 *   url: string;
 *   appliedAt: string | null;
 *   status: string;
 * }} HistoryRecord
 */

export const HISTORY_PLATFORMS = /** @type {const} */ (['wanted', 'jobkorea']);

/** Failure of one platform's sync; `code` is machine-readable, `message` never holds a cookie. */
export class HistorySyncError extends Error {
  /**
   * @param {'SESSION_MISSING' | 'SESSION_EXPIRED' | 'UPSTREAM_ERROR' | 'TIMEOUT'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'HistorySyncError';
    this.code = code;
  }
}
