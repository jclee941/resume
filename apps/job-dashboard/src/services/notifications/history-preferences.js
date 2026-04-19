export async function saveNotificationHistory(service, record) {
  if (!service.env.DB) return;

  try {
    await service.env.DB.prepare(
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

export async function getNotificationHistory(service, options = {}) {
  const { limit = 50, eventType, startDate, endDate } = options;

  let sql = 'SELECT * FROM notification_history WHERE 1=1';
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

  const result = await service.env.DB.prepare(sql)
    .bind(...params)
    .all();
  return result.results || [];
}

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
