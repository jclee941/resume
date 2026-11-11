import { escapeHtml } from '../notifications.js';

/**
 * @typedef {{
 *   JOB_DB: {
 *     prepare(sql: string): {
 *       bind(...values: unknown[]): { first(): Promise<{ id: string } | null> };
 *     };
 *   };
 *   NOTIFICATION_QUEUE?: { send(message: {
 *     id: string;
 *     type: 'telegram';
 *     priority: 'normal';
 *     payload: { text: string; postingId: string };
 *     createdAt: number;
 *   }): Promise<void> };
 * }} PublicJobNotificationEnv
 * @typedef {{ queued: number; failed: number; error?: string }} PublicJobNotificationSummary
 */

/**
 * @param {import('./repository.js').PublicPosting} posting
 * @returns {string}
 */
function postingCard(posting) {
  return [
    `<b>${escapeHtml(posting.company.slice(0, 100))}</b>`,
    escapeHtml(posting.title.slice(0, 180)),
    `지역: ${escapeHtml(posting.location ?? '공고 확인')}`,
    `연봉·급여: ${escapeHtml(posting.salary ?? '미공개 (공고 확인)')}`,
    `관련 분야: ${escapeHtml(posting.terms.join(', '))}`,
    `마감: ${escapeHtml(posting.deadline ? new Date(Date.parse(posting.deadline) + 9 * 3_600_000).toISOString().slice(0, 10) : '공고 확인')}`,
    `<a href="${escapeHtml(posting.url)}">공고 확인</a>`,
  ].join('\n');
}

/**
 * Queue open, unreviewed/recommended postings that have no successful delivery receipt.
 * The consumer also checks the stable id before delivery so queue redelivery is harmless.
 * @param {PublicJobNotificationEnv} env
 * @param {import('./repository.js').PublicPosting[]} postings
 * @param {Date} now
 * @returns {Promise<PublicJobNotificationSummary>}
 */
export async function enqueuePublicJobNotifications(env, postings, now) {
  /** @type {PublicJobNotificationSummary} */
  const summary = { queued: 0, failed: 0 };
  const queue = env.NOTIFICATION_QUEUE;
  if (!queue) return summary;
  for (const posting of postings) {
    const id = `public-job:${posting.id}`;
    try {
      const pending = await env.JOB_DB.prepare(
        `SELECT j.id FROM job_search_results AS j
         LEFT JOIN notification_history AS n ON n.id = ?
         WHERE j.id = ? AND j.status IN ('new', 'recommended')
           AND (j.expires_at IS NULL OR datetime(j.expires_at) >= datetime(?))
           AND (n.status IS NULL OR n.status != 'success')`
      )
        .bind(id, posting.id, now.toISOString())
        .first();
      if (!pending) continue;
      await queue.send({
        id,
        type: 'telegram',
        priority: 'normal',
        payload: { text: postingCard(posting), postingId: posting.id },
        createdAt: now.getTime(),
      });
      summary.queued += 1;
    } catch (error) {
      summary.failed += 1;
      summary.error ??= error instanceof Error ? error.message : String(error);
    }
  }
  return summary;
}
