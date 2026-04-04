import { normalizeError } from '@resume/shared/errors';
import { NotificationService, sendTelegramNotification } from '../../notifications.js';

export async function getProfileSyncStatusResponse(handler, request) {
  const syncId = request.params?.syncId;
  const db = handler.env?.DB;

  if (!db) {
    return handler.jsonResponse({ success: false, error: 'Database not configured' }, 503);
  }

  try {
    const sync = await db.prepare('SELECT * FROM profile_syncs WHERE id = ?').bind(syncId).first();

    if (!sync) {
      return handler.jsonResponse({ success: false, error: 'Sync not found' }, 404);
    }

    return handler.jsonResponse({
      success: true,
      sync: {
        id: sync.id,
        platforms: JSON.parse(sync.platforms || '[]'),
        status: sync.status,
        dryRun: !!sync.dry_run,
        result: sync.result ? JSON.parse(sync.result) : null,
        createdAt: sync.created_at,
        updatedAt: sync.updated_at,
      },
    });
  } catch (error) {
    const normalized = normalizeError(error, {
      handler: 'ProfileSyncHandler',
      action: 'getProfileSyncStatus',
      syncId,
    });
    console.error('Get profile sync status failed:', normalized);
    return handler.jsonResponse({ success: false, error: normalized.message }, 500);
  }
}

export async function updateProfileSyncStatusResponse(handler, request) {
  const body = await request.json().catch(() => ({}));
  const { syncId, status, result } = body;
  const db = handler.env?.DB;

  if (!db) {
    return handler.jsonResponse({ success: false, error: 'Database not configured' }, 503);
  }

  try {
    const now = new Date().toISOString();
    await db
      .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
      .bind(status, JSON.stringify(result || {}), now, syncId)
      .run();

    if (status === 'completed') {
      const platforms = result?.platforms || [];
      const successCount = platforms.filter((platform) => platform.success).length;
      await sendTelegramNotification(
        handler.env,
        `✅ <b>Profile Sync Complete</b>: ${successCount}/${platforms.length} platforms updated`
      );
    }

    return handler.jsonResponse({ success: true, message: 'Sync status updated', syncId, status });
  } catch (error) {
    const normalized = normalizeError(error, {
      handler: 'ProfileSyncHandler',
      action: 'updateProfileSyncStatus',
      syncId,
    });
    console.error('Update profile sync status failed:', normalized);
    return handler.jsonResponse({ success: false, error: normalized.message }, 500);
  }
}
