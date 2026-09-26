/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...values: unknown[]): {
 *       run(): Promise<unknown>;
 *       all(): Promise<{ results?: unknown[] }>;
 *     };
 *   };
 * }} D1DatabaseLike
 */

/**
 * @typedef {{
 *   get(key: string, type?: string): Promise<Record<string, unknown> | null>;
 *   put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
 * }} KvNamespaceLike
 */

/**
 * @typedef {Object} NotificationService
 * @property {{ JOB_DB: D1DatabaseLike; SESSIONS: KvNamespaceLike }} env
 * @property {Record<string, unknown>} preferences
 */

/**
 * @typedef {Object} NotificationHistoryRecord
 * @property {string} id
 * @property {string} eventType
 * @property {unknown} [data]
 * @property {string[]} [channels]
 * @property {string} timestamp
 * @property {string} status
 * @property {unknown} [results]
 */

/**
 * @typedef {Object} HistoryOptions
 * @property {number} [limit]
 * @property {string} [eventType]
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * @param {NotificationService} service
 * @param {NotificationHistoryRecord} record
 * @returns {Promise<void>}
 */
export async function saveNotificationHistory(service, record) {
  if (!service.env.JOB_DB) return;

  try {
    await service.env.JOB_DB.prepare(
      `
        INSERT INTO notification_history (
          id, event_type, data, channels, timestamp, status, results
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
      .bind(
        record.id,
        record.eventType,
        JSON.stringify(record.data),
        JSON.stringify(record.channels),
        record.timestamp,
        record.status,
        JSON.stringify(record.results)
      )
      .run();
  } catch (error) {
    console.error('[NotificationService] Save history error:', error);
    throw error;
  }
}

/**
 * @param {NotificationService} service
 * @param {HistoryOptions} [options]
 * @returns {Promise<unknown[]>}
 */
export async function getNotificationHistory(service, options = {}) {
  const { limit = 50, eventType, startDate, endDate } = options;

  let sql = 'SELECT * FROM notification_history WHERE 1=1';
  /** @type {(string | number)[]} */
  const params = [];

  if (eventType) {
    sql += ' AND event_type = ?';
    params.push(eventType);
  }

  if (startDate) {
    sql += ' AND timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND timestamp <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const result = await service.env.JOB_DB.prepare(sql)
    .bind(...params)
    .all();
  return result.results || [];
}

/**
 * @param {NotificationService} service
 * @param {string} eventType
 * @param {Record<string, unknown>} preferences
 * @returns {Promise<{ success: boolean; reason?: string }>}
 */
export async function updatePreferences(service, eventType, preferences) {
  if (!service.preferences[eventType]) {
    return { success: false, reason: 'invalid_event_type' };
  }

  service.preferences[eventType] = { ...service.preferences[eventType], ...preferences };

  await service.env.SESSIONS.put(
    'config:notification:preferences',
    JSON.stringify(service.preferences),
    { expirationTtl: 86400 * 30 }
  );

  return { success: true };
}

/**
 * @param {NotificationService} service
 * @returns {Promise<void>}
 */
export async function loadPreferences(service) {
  try {
    const saved = await service.env.SESSIONS.get('config:notification:preferences', 'json');
    if (saved) {
      service.preferences = { ...service.preferences, ...saved };
    }
  } catch (error) {
    console.error('[NotificationService] Load preferences error:', error);
  }
}
