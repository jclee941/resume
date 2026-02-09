import { BaseHandler } from './base-handler.js';
import { normalizeError } from '../lib/errors.js';

/**
 * Handler for job search operations.
 * Fetches jobs from Wanted API and stores them in D1.
 */
export class JobSearchHandler extends BaseHandler {
  /**
   * Trigger job search with keywords and store results in D1
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async triggerJobSearch(request) {
    const body = await request.json().catch(() => ({}));
    const {
      keywords = 'DevOps,SRE,Platform',
      minScore = 70,
      limit = 30,
      maxPerKeyword = 10,
    } = body;

    const keywordList = Array.isArray(keywords)
      ? keywords
      : String(keywords)
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);

    const cleanedKeywords = keywordList.slice(0, 5);
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const now = new Date().toISOString();
      const maxTotal = Math.max(1, Math.min(parseInt(limit) || 30, 100));
      const perKeyword = Math.max(1, Math.min(parseInt(maxPerKeyword) || 10, 25));

      const jobs = [];
      const seen = new Set();

      for (const keyword of cleanedKeywords.length ? cleanedKeywords : ['DevOps']) {
        const wantedJobs = await this.fetchWantedJobs(keyword, {
          limit: perKeyword,
        });
        for (const job of wantedJobs) {
          const jobId = job?.id;
          if (!jobId) continue;
          const key = `wanted:${jobId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          jobs.push({ keyword, job });
          if (jobs.length >= maxTotal) break;
        }
        if (jobs.length >= maxTotal) break;
      }

      let inserted = 0;
      for (const item of jobs) {
        const job = item.job;
        const jobId = String(job.id);

        const company = job.company?.name || job.company_name || job.company || 'Unknown';
        const position = job.position?.title || job.position || job.title || 'Unknown';
        const location =
          job.address?.full_location || job.address?.location || job.location || null;

        const appId = `wanted_${jobId}`;
        const sourceUrl = `https://www.wanted.co.kr/wd/${jobId}`;
        const matchScoreRaw = job.matching_score ?? job.matchingScore ?? 0;
        const matchScore = Math.max(0, Math.min(100, parseInt(matchScoreRaw) || 0));
        const notes = `keyword=${item.keyword}; minScore=${minScore}`;

        const result = await db
          .prepare(
            'INSERT OR IGNORE INTO applications (id, job_id, source, source_url, position, company, location, match_score, status, priority, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .bind(
            appId,
            jobId,
            'wanted',
            sourceUrl,
            position,
            company,
            location,
            matchScore,
            'saved',
            'medium',
            notes,
            now,
            now,
            now
          )
          .run();

        const changes = result?.meta?.changes || 0;
        inserted += changes;

        if (changes > 0) {
          await db
            .prepare(
              'INSERT INTO application_timeline (application_id, status, note, timestamp) VALUES (?, ?, ?, ?)'
            )
            .bind(appId, 'saved', 'Imported from Wanted API (Direct)', now)
            .run();
        }
      }

      return this.jsonResponse({
        success: true,
        message: 'Job search completed successfully',
        totalFetched: jobs.length,
        inserted,
        details: { keywords: cleanedKeywords, maxTotal },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'JobSearchHandler',
        action: 'triggerJobSearch',
      });
      console.error('Job search failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  /**
   * Fetch jobs from Wanted API
   * @param {string} keyword - Search keyword
   * @param {Object} options - Options
   * @param {number} options.limit - Max results
   * @param {number} options.offset - Offset
   * @returns {Promise<Array>}
   */
  async fetchWantedJobs(keyword, { limit = 10, offset = 0 } = {}) {
    const queryParams = new URLSearchParams({
      country: 'kr',
      query: keyword,
      limit: String(limit),
      offset: String(offset),
      years: '-1',
      locations: 'all',
      job_sort: 'job.latest_order',
    });

    const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs?${queryParams.toString()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json().catch(() => null);
    return Array.isArray(data?.data) ? data.data : [];
  }
}
