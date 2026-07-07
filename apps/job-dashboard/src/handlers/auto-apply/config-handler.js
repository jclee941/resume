import { getConfig } from './db-helpers.js';
import { jsonResponse } from '../../middleware/cors.js';

export async function configureAutoApply({ request, env, db }) {
  if (!db) {
    return jsonResponse({ error: 'Database not configured' }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const updates = [];

  if (body.enabled !== undefined) {
    updates.push(['auto_apply_enabled', String(body.enabled)]);
  }
  if (body.maxDaily !== undefined) {
    updates.push(['max_daily_applications', String(body.maxDaily)]);
  }
  if (body.minScore !== undefined) {
    updates.push(['min_match_score', String(body.minScore)]);
  }
  if (body.keywords !== undefined) {
    updates.push(['auto_apply_keywords', JSON.stringify(body.keywords)]);
  }

  for (const [key, value] of updates) {
    await db
      .prepare(
        'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
      )
      .bind(key, value, now)
      .run();
  }

  const config = await getConfig(env);
  return jsonResponse({ success: true, config });
}
