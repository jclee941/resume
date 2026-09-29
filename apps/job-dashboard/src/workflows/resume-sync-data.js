/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...args: unknown[]): {
 *       first(): Promise<{ data?: string; target_resume_id?: string | null } | null>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} ResumeSyncDb
 *
 * @typedef {{ JOB_DB: ResumeSyncDb }} ResumeSyncEnv
 *
 * @typedef {import('../services/resume-platform-sync/index.js').ResumePlatformSsot} MasterResumeData
 */

/**
 * @param {ResumeSyncEnv} env
 * @param {string} resumeId
 * @returns {Promise<{ data: MasterResumeData; targetResumeId: string | null } | null>}
 */
export async function getMasterResumeRecord(env, resumeId) {
  const row = await env.JOB_DB.prepare('SELECT data, target_resume_id FROM resumes WHERE id = ?')
    .bind(resumeId)
    .first();

  return row?.data
    ? { data: JSON.parse(row.data), targetResumeId: row.target_resume_id || null }
    : null;
}
