/**
 * Persist the top matched jobs to D1.
 *
 * @param {Object} env
 * @param {Object[]} matchedJobs
 * @returns {Promise<{saved: number}>}
 */
export async function saveMatchedJobs(env, matchedJobs) {
  const stmt = env.JOB_DB.prepare(`
    INSERT INTO job_search_results (
      id, source, source_url, position, company, location, description,
      tech_stack, experience_level, match_score, crawled_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    ON CONFLICT (id) DO UPDATE SET
      source = excluded.source,
      source_url = excluded.source_url,
      position = excluded.position,
      company = excluded.company,
      location = excluded.location,
      description = excluded.description,
      tech_stack = excluded.tech_stack,
      experience_level = excluded.experience_level,
      match_score = excluded.match_score,
      crawled_at = excluded.crawled_at,
      updated_at = excluded.updated_at
  `);

  const batch = matchedJobs
    .slice(0, 50)
    .map((job) =>
      stmt.bind(
        job.id,
        job.source,
        job.sourceUrl || job.url || null,
        job.position,
        job.company,
        job.location || null,
        job.description || null,
        Array.isArray(job.techStack) ? JSON.stringify(job.techStack) : job.techStack || null,
        job.experienceLevel || job.experience || null,
        job.matchScore ?? 0
      )
    );

  await env.JOB_DB.batch(batch);
  return { saved: batch.length };
}
