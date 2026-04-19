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

export function determineNotificationStatus(results) {
  const values = Object.values(results || {});
  if (values.length === 0) return 'failed';

  const allSent = values.every((value) => value?.sent);
  const someSent = values.some((value) => value?.sent);

  if (allSent) return 'success';
  if (someSent) return 'partial';
  return 'failed';
}

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
    adapter.logger.error(
      '[TelegramNotificationAdapter] Failed to save notification history:',
      error?.message
    );
    return {
      saved: false,
      reason: 'save_failed',
      error: error?.message,
    };
  }
}
