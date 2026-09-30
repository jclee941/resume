/**
 * @typedef {import('./d1-client.mjs').D1Client} D1Client
 * @typedef {{ path: string, bytes: Buffer, sha256: string, size: number }} RemoteFile
 */

export const PAGE_SIZE = 20;
export const MASTER_RESUME_PATH = 'packages/data/resumes/master/resume_data.json';

/**
 * Every stored path with its hash, keyed by path.
 * @param {D1Client} client
 * @returns {Promise<Map<string, string>>}
 */
export async function listRemote(client) {
  const { results } = await client.query('SELECT path, sha256 FROM content_files ORDER BY path');
  return new Map(results.map((row) => [row.path, row.sha256]));
}

/**
 * Stream stored files in pages of PAGE_SIZE using a `path > ?` cursor.
 * @param {D1Client} client
 * @returns {AsyncGenerator<RemoteFile>}
 */
export async function* readFiles(client) {
  let cursor = '';
  for (;;) {
    const { results } = await client.query(
      'SELECT path, hex(body) AS body_hex, sha256, size FROM content_files WHERE path > ?1 ORDER BY path LIMIT ?2',
      [cursor, PAGE_SIZE]
    );
    for (const row of results) {
      yield {
        path: row.path,
        bytes: Buffer.from(row.body_hex ?? '', 'hex'),
        sha256: row.sha256,
        size: row.size,
      };
    }
    if (results.length < PAGE_SIZE) return;
    cursor = results[results.length - 1].path;
  }
}

/**
 * Upsert one file per request; the body travels as a hex string param.
 * @param {D1Client} client
 * @param {{ path: string, bytes: Buffer, sha256: string, contentType: string, now: string }} file
 */
export async function upsertFile(client, { path, bytes, sha256, contentType, now }) {
  await client.query(
    `INSERT INTO content_files (path, body, sha256, size, content_type, updated_at)
VALUES (?1, unhex(?2), ?3, ?4, ?5, ?6)
ON CONFLICT(path) DO UPDATE SET body = excluded.body, sha256 = excluded.sha256,
  size = excluded.size, content_type = excluded.content_type, updated_at = excluded.updated_at`,
    [path, bytes.toString('hex'), sha256, bytes.length, contentType, now]
  );
}

/**
 * @param {D1Client} client
 * @param {string} path
 */
export async function deleteFile(client, path) {
  await client.query('DELETE FROM content_files WHERE path = ?1', [path]);
}

/**
 * Refresh the platform-sync master row only; target_resume_id is never touched.
 * @param {D1Client} client
 * @param {string} json
 * @param {string} now
 * @returns {Promise<number>} rows changed
 */
export async function updateMasterResume(client, json, now) {
  const { meta } = await client.query(
    "UPDATE resumes SET data = ?1, updated_at = ?2 WHERE id = 'master'",
    [json, now]
  );
  return meta.changes ?? 0;
}
