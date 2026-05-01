/**
 * Persist the top matched jobs to D1.
 *
 * @param {Object} env
 * @param {Object[]} matchedJobs
 * @returns {Promise<{saved: number}>}
 */
export async function saveMatchedJobs(env, matchedJobs) {
  const stmt = env.JOB_DB.prepare(`
    INSERT INTO job_search_results (job_id, company, position, source, match_score, data, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (job_id) DO UPDATE SET match_score = excluded.match_score, updated_at = datetime('now')
  `);

  const batch = matchedJobs
    .slice(0, 50)
    .map((job) =>
      stmt.bind(
        job.id || `${job.source}-${Date.now()}`,
        job.company,
        job.position,
        job.source,
        job.matchScore,
        JSON.stringify(job)
      )
    );

  await env.JOB_DB.batch(batch);
  return { saved: batch.length };
}
