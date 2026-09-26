/**
 * @typedef {Object} D1PreparedStatement
 * @property {(...args: unknown[]) => D1PreparedStatement} bind
 * @property {() => Promise<unknown>} run
 */

/**
 * @typedef {Object} D1DatabaseLike
 * @property {(query: string) => D1PreparedStatement} prepare
 */

/**
 * @typedef {Object} D1ClientLike
 * @property {(query: string, params?: unknown[]) => Promise<unknown>} query
 */

/**
 * @typedef {Object} LoggerLike
 * @property {(...args: unknown[]) => void} error
 * @property {(...args: unknown[]) => void} [warn]
 * @property {(...args: unknown[]) => void} [info]
 */

/**
 * @typedef {Object} HistoryAdapter
 * @property {D1DatabaseLike} [db]
 * @property {D1ClientLike} [d1Client]
 * @property {LoggerLike} logger
 */

/**
 * @typedef {Object} NotificationHistoryRecord
 * @property {string} id
 * @property {string} eventType
 * @property {unknown} [data]
 * @property {string[]} [channels]
 * @property {string} timestamp
 * @property {string} status
 * @property {Record<string, { sent?: boolean }>} [results]
 */

/**
 * @param {string} eventType
 * @param {unknown} data
 * @returns {NotificationHistoryRecord}
 */
export function createNotificationHistoryRecord(eventType, data) {
  return {
    id: crypto.randomUUID(),
    eventType,
    data,
    channels: [],
    timestamp: new Date().toISOString(),
    status: 'pending',
    results: {},
  };
}

/**
 * @param {Record<string, { sent?: boolean }> | null | undefined} results
 * @returns {'success' | 'partial' | 'failed'}
 */
export function determineNotificationStatus(results) {
  const values = Object.values(results || {});
  if (values.length === 0) return 'failed';

  const allSent = values.every((value) => value?.sent);
  const someSent = values.some((value) => value?.sent);

  if (allSent) return 'success';
  if (someSent) return 'partial';
  return 'failed';
}

/**
 * @param {HistoryAdapter} adapter
 * @param {NotificationHistoryRecord} record
 * @returns {Promise<{ saved: boolean, backend?: string, reason?: string, error?: string }>}
 */
export async function saveNotificationHistory(adapter, record) {
  try {
    if (adapter.db?.prepare) {
      await adapter.db
        .prepare(
          `
            INSERT INTO notification_history (
              id, event_type, data, channels, timestamp, status, results
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          record.id,
          record.eventType,
          JSON.stringify(record.data ?? {}),
          JSON.stringify(record.channels ?? []),
          record.timestamp,
          record.status,
          JSON.stringify(record.results ?? {})
        )
        .run();

      return { saved: true, backend: 'db_binding' };
    }

    if (typeof adapter.d1Client?.query === 'function') {
      await adapter.d1Client.query(
        `
          INSERT INTO notification_history (
            id, event_type, data, channels, timestamp, status, results
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          record.id,
          record.eventType,
          JSON.stringify(record.data ?? {}),
          JSON.stringify(record.channels ?? []),
          record.timestamp,
          record.status,
          JSON.stringify(record.results ?? {}),
        ]
      );

      return { saved: true, backend: 'd1_client' };
    }

    return { saved: false, reason: 'no_d1_backend' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    adapter.logger.error(
      '[TelegramNotificationAdapter] Failed to save notification history:',
      errorMessage
    );
    return {
      saved: false,
      reason: 'save_failed',
      error: errorMessage,
    };
  }
}
