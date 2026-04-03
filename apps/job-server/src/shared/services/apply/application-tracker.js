import { ApplicationRepository } from '../../repositories/application-repository.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG = {
  enableTimeline: true,
  enableAnalytics: true,
};

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeJob(job = {}) {
  return {
    jobId: job.id ?? job.job_id ?? job.jobId ?? null,
    source: job.source ?? job.platform ?? 'manual',
    sourceUrl: job.sourceUrl ?? job.source_url ?? job.url ?? null,
    position: job.position ?? job.title ?? 'Unknown Position',
    company: job.company ?? job.companyName ?? 'Unknown Company',
    location: job.location ?? null,
    priority: job.priority ?? job.applicationPriority ?? 'medium',
  };
}

function normalizeMatchScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const score = Number(value);
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function normalizeCoverLetterValue(coverLetter) {
  if (!coverLetter) return '';
  if (typeof coverLetter === 'string') return coverLetter;
  if (typeof coverLetter.coverLetter === 'string') return coverLetter.coverLetter;
  return String(coverLetter);
}

export class ApplicationTrackerService {
  #repository;

  #coverLetterService;

  #logger;

  #config;

  constructor(dependencies = {}) {
    this.#repository = dependencies.applicationRepository ?? new ApplicationRepository();
    this.#coverLetterService = dependencies.coverLetterService ?? null;
    this.#logger = dependencies.logger ?? console;
    this.#config = {
      ...DEFAULT_CONFIG,
      ...dependencies,
    };
  }

  async startTracking(job, matchScore = 0) {
    const normalizedJob = normalizeJob(job);

    const created = await this.#repository.create({
      job_id: normalizedJob.jobId,
      source: normalizedJob.source,
      source_url: normalizedJob.sourceUrl,
      position: normalizedJob.position,
      company: normalizedJob.company,
      location: normalizedJob.location,
      match_score: normalizeMatchScore(matchScore),
      status: 'discovered',
      priority: normalizedJob.priority,
      notes: 'Application discovered and tracking started',
    });

    return created;
  }

  async recordSearch(jobs = [], stats = {}) {
    const result = {
      searched: Array.isArray(jobs) ? jobs.length : 0,
      tracked: 0,
      duplicates: 0,
      failed: 0,
      stats,
    };

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return result;
    }

    for (const job of jobs) {
      const normalized = normalizeJob(job);

      try {
        const existing = normalized.jobId
          ? await this.#repository.findByJobId(normalized.jobId)
          : [];
        if (existing.length > 0) {
          result.duplicates += 1;
          continue;
        }

        const score = normalizeMatchScore(job?.matchScore ?? job?.matchPercentage ?? 0);
        await this.startTracking(job, score);
        result.tracked += 1;
      } catch (error) {
        result.failed += 1;
        this.#logger.warn('[ApplicationTrackerService] Failed to track searched job', {
          jobId: normalized.jobId,
          error: error?.message,
        });
      }
    }

    return result;
  }

  async recordScoring(jobId, score, type = 'rule') {
    const application = await this.#findByApplicationOrJobId(jobId);
    const nextScore = normalizeMatchScore(score);

    await this.#repository.update(application.id, {
      match_score: nextScore,
      notes: `Scoring updated (${type}) → ${nextScore}`,
    });

    return this.#transitionStatus(application.id, 'scored', `Scoring recorded (${type})`);
  }

  async recordCoverLetter(jobId, coverLetter) {
    const application = await this.#findByApplicationOrJobId(jobId);
    const letter = normalizeCoverLetterValue(coverLetter);

    await this.#repository.update(application.id, {
      cover_letter: letter,
      notes: 'Cover letter generated',
    });

    if (this.#coverLetterService?.cache && application.job_id) {
      await this.#coverLetterService.cache(application.job_id, letter);
    }

    return this.#transitionStatus(
      application.id,
      'cover_letter_generated',
      'Cover letter generated'
    );
  }

  async recordSubmission(jobId, result = {}) {
    const application = await this.#findByApplicationOrJobId(jobId);
    const note = result?.message ?? result?.error ?? 'Submission attempted';

    await this.#repository.update(application.id, {
      notes: note,
      source_url: result?.sourceUrl ?? application.source_url,
    });

    return this.#transitionStatus(application.id, 'submitted', note);
  }

  async recordApprovalRequest(jobId) {
    const application = await this.#findByApplicationOrJobId(jobId);
    return this.#transitionStatus(application.id, 'approval_requested', 'Approval requested');
  }

  async recordApproval(jobId, approved, reviewer = 'system') {
    const application = await this.#findByApplicationOrJobId(jobId);
    const approvedFlag = Boolean(approved);
    const status = approvedFlag ? 'approved' : 'rejected';
    const note = `Approval ${status} by ${reviewer}`;

    return this.#transitionStatus(application.id, status, note);
  }

  async recordCompletion(jobId, status = 'completed', notes = '') {
    const application = await this.#findByApplicationOrJobId(jobId);

    await this.#repository.update(application.id, {
      notes: notes || application.notes,
    });

    return this.#transitionStatus(
      application.id,
      status,
      notes || 'Application lifecycle completed'
    );
  }

  async getApplication(id) {
    const application = await this.#findByApplicationOrJobId(id);
    const timeline = this.#config.enableTimeline ? await this.#getTimeline(application.id) : [];

    return {
      ...application,
      timeline,
    };
  }

  async getStats(timeRange = {}) {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const baseStats = await this.#repository.getStats();
    const range = this.#normalizeTimeRange(timeRange);
    const rangeSummary = await this.#queryOne(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          AVG(COALESCE(match_score, 0)) AS averageMatchScore
        FROM applications
        WHERE date(created_at) BETWEEN date(?) AND date(?)
      `,
      [range.from, range.to]
    );

    return {
      ...baseStats,
      range,
      rangeTotal: Number(rangeSummary?.total || 0),
      rangeCompleted: Number(rangeSummary?.completed || 0),
      rangeAverageMatchScore: Number(rangeSummary?.averageMatchScore || 0),
    };
  }

  async getDailyStats(date = new Date()) {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const targetDate = toIsoDate(date);
    const summary = await this.#queryOne(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          AVG(COALESCE(match_score, 0)) AS averageMatchScore
        FROM applications
        WHERE date(created_at) = date(?)
      `,
      [targetDate]
    );

    return {
      date: targetDate,
      total: Number(summary?.total || 0),
      submitted: Number(summary?.submitted || 0),
      completed: Number(summary?.completed || 0),
      averageMatchScore: Number(summary?.averageMatchScore || 0),
    };
  }

  async getWeeklyStats() {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const rows = await this.#repository.d1Client.query(
      `
        SELECT
          date(created_at) AS day,
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted
        FROM applications
        WHERE date(created_at) >= date('now', '-6 days')
        GROUP BY day
        ORDER BY day ASC
      `
    );

    return rows.map((row) => ({
      day: row.day,
      total: Number(row.total || 0),
      completed: Number(row.completed || 0),
      submitted: Number(row.submitted || 0),
    }));
  }

  async getSuccessRate() {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const row = await this.#queryOne(
      `
        SELECT
          SUM(CASE WHEN status IN ('completed', 'approved') THEN 1 ELSE 0 END) AS success,
          SUM(CASE WHEN status IN ('completed', 'approved', 'rejected', 'failed') THEN 1 ELSE 0 END) AS terminal
        FROM applications
      `
    );

    const success = Number(row?.success || 0);
    const terminal = Number(row?.terminal || 0);

    return {
      success,
      terminal,
      rate: terminal === 0 ? 0 : Number(((success / terminal) * 100).toFixed(2)),
    };
  }

  async getAverageMatchScore() {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const row = await this.#queryOne(
      `
        SELECT AVG(COALESCE(match_score, 0)) AS average
        FROM applications
        WHERE status IN ('submitted', 'completed', 'approved', 'rejected')
      `
    );

    return Number(row?.average || 0);
  }

  async getTopCompanies(limit = 10) {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const rows = await this.#repository.d1Client.query(
      `
        SELECT company, COUNT(*) AS count
        FROM applications
        GROUP BY company
        ORDER BY count DESC, company ASC
        LIMIT ?
      `,
      [Number(limit) || 10]
    );

    return rows.map((row) => ({
      company: row.company,
      count: Number(row.count || 0),
    }));
  }

  async getPlatformBreakdown() {
    if (!this.#config.enableAnalytics) {
      return { enabled: false };
    }

    const rows = await this.#repository.d1Client.query(
      `
        SELECT source AS platform, COUNT(*) AS count
        FROM applications
        GROUP BY source
        ORDER BY count DESC, platform ASC
      `
    );

    return rows.map((row) => ({
      platform: row.platform,
      count: Number(row.count || 0),
    }));
  }

  async #findByApplicationOrJobId(id) {
    if (!id) {
      throw new Error('Application identifier is required');
    }

    const byId = await this.#repository.findById(String(id));
    if (byId) return byId;

    const byJobId = await this.#repository.findByJobId(String(id));
    if (byJobId.length > 0) {
      return byJobId[0];
    }

    throw new Error(`Application not found for identifier: ${id}`);
  }

  async #transitionStatus(applicationId, status, note = '') {
    if (!this.#config.enableTimeline) {
      return this.#repository.update(applicationId, {
        notes: note,
      });
    }

    return this.#repository.updateStatus(applicationId, status, note);
  }

  async #getTimeline(applicationId) {
    return this.#repository.d1Client.query(
      `
        SELECT id, application_id, status, previous_status, note, timestamp
        FROM application_timeline
        WHERE application_id = ?
        ORDER BY timestamp ASC, id ASC
      `,
      [applicationId]
    );
  }

  #normalizeTimeRange(timeRange = {}) {
    if (typeof timeRange === 'string') {
      if (timeRange === '7d') {
        const to = new Date();
        const from = new Date(to.getTime() - 6 * ONE_DAY_MS);
        return {
          from: toIsoDate(from),
          to: toIsoDate(to),
        };
      }

      if (timeRange === '30d') {
        const to = new Date();
        const from = new Date(to.getTime() - 29 * ONE_DAY_MS);
        return {
          from: toIsoDate(from),
          to: toIsoDate(to),
        };
      }
    }

    const to = toIsoDate(timeRange.to);
    const from = toIsoDate(timeRange.from ?? new Date(new Date(to).getTime() - 6 * ONE_DAY_MS));
    return { from, to };
  }

  async #queryOne(query, params = []) {
    const rows = await this.#repository.d1Client.query(query, params);
    return rows?.[0] || null;
  }
}

export default ApplicationTrackerService;
