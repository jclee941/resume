import { jsonResponse } from '../middleware/cors.js';

export async function getConfig(db) {
  const result = await db.prepare('SELECT key, value FROM config').all();
  const config = {};
  for (const row of result.results) {
    try {
      config[row.key] = JSON.parse(row.value);
    } catch {
      config[row.key] = row.value;
    }
  }
  return jsonResponse(config);
}

export async function saveConfig(request, db) {
  const body = await request.json();
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(body)) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    await db
      .prepare(
        'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)',
      )
      .bind(key, valueStr, now)
      .run();
  }

  return jsonResponse({ success: true });
}
