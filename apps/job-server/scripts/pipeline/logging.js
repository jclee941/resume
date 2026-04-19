import { ELK_AUTH, ELK_INDEX, ELK_URL } from './constants.js';

export const log = (...args) => console.error('[job-search-apply-pipeline]', ...args);

export function summarizeError(error) {
  if (!error) return 'Unknown error';
  const parts = [error.message || String(error)];
  if (error.statusCode || error.status) parts.push(`status=${error.statusCode || error.status}`);
  return parts.join(' ');
}

export async function shipToElk(eventType, data) {
  if (!ELK_AUTH) return;
  try {
    const doc = {
      '@timestamp': new Date().toISOString(),
      event_type: eventType,
      pipeline: 'job-search-apply',
      ...data,
    };
    const response = await fetch(
      `${ELK_URL}/${ELK_INDEX}-${new Date().toISOString().slice(0, 10)}/_doc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ELK_AUTH,
        },
        body: JSON.stringify(doc),
      }
    );

    if (!response.ok) {
      log('elk ship failed', eventType, response.status);
    }
  } catch (elkError) {
    log('elk ship failed', eventType, elkError.message);
  }
}

export async function recordJobToElk(job, status) {
  if (!ELK_AUTH) return;
  try {
    const doc = {
      '@timestamp': new Date().toISOString(),
      job_id: String(job.id || ''),
      source: job.source || 'unknown',
      source_url: job.url || '',
      position: job.title || job.position || '',
      company: job.company || '',
      location: job.location || '',
      match_score: job.score || 0,
      matched_skills: job.matchedSkills || [],
      status,
      applied_at: status === 'applied' ? new Date().toISOString() : null,
      pipeline_run: new Date().toISOString().slice(0, 10),
      title_matched: job.titleMatched || false,
    };
    const response = await fetch(`${ELK_URL}/job-applications/_doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: ELK_AUTH },
      body: JSON.stringify(doc),
    });

    if (!response.ok) {
      log('elk record job failed', job.id, response.status);
    }
  } catch (elkError) {
    log('elk record job failed', job.id, elkError.message);
  }
}
