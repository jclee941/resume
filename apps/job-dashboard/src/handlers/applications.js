import {
  validateApplicationCreate,
  validateApplicationUpdate,
  validateStatusUpdate,
} from '../utils/validators.js';

const APPLICATION_STATUS = {
  PENDING: 'pending',
  SAVED: 'saved',
  APPLIED: 'applied',
  VIEWED: 'viewed',
  IN_PROGRESS: 'in_progress',
  INTERVIEW: 'interview',
  OFFER: 'offer',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
};

const VALID_STATUSES = Object.values(APPLICATION_STATUS);

export class ApplicationsHandler {
  constructor(db) {
    this.db = db;
  }

  jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async list(request) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const source = url.searchParams.get('source');
    const company = url.searchParams.get('company');
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let sql = 'SELECT * FROM applications WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }
    if (company) {
      sql += ' AND company LIKE ?';
      params.push(`%${company}%`);
    }

    const validSortColumns = [
      'created_at',
      'updated_at',
      'company',
      'status',
      'match_score',
    ];
    const sortCol = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    sql += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await this.db
      .prepare(sql)
      .bind(...params)
      .all();

    const countResult = await this.db
      .prepare('SELECT COUNT(*) as total FROM applications')
      .first();

    return this.jsonResponse({
      applications: result.results,
      total: countResult?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  }

  async get(request) {
    const { id } = request.params;
    const app = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();

    if (!app) {
      return this.jsonResponse({ error: 'Application not found' }, 404);
    }

    const timeline = await this.db
      .prepare(
        'SELECT * FROM application_timeline WHERE application_id = ? ORDER BY timestamp DESC',
      )
      .bind(id)
      .all();

    return this.jsonResponse({ ...app, timeline: timeline.results });
  }

  async create(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const validation = validateApplicationCreate(body);
    if (!validation.valid) {
      return this.jsonResponse(
        { error: 'Validation failed', details: validation.errors },
        400,
      );
    }

    const job = body.job || body;
    const options = body.options || {};

    const source = job.source || job.platform || 'manual';
    const sourceUrl =
      job.sourceUrl ||
      job.source_url ||
      job.jobUrl ||
      job.job_url ||
      body.sourceUrl ||
      body.source_url ||
      body.jobUrl ||
      body.job_url ||
      null;

    const notes = job.notes ?? options.notes ?? '';

    const statusCandidate = body.status || job.status || options.status;
    const status = VALID_STATUSES.includes(statusCandidate)
      ? statusCandidate
      : APPLICATION_STATUS.SAVED;

    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const matchScoreRaw =
      job.matchScore ??
      job.match_score ??
      job.matchPercentage ??
      job.match_percentage ??
      0;

    const matchScore = Math.max(0, Math.min(100, parseInt(matchScoreRaw) || 0));

    await this.db
      .prepare(
        `
      INSERT INTO applications (id, job_id, source, source_url, position, company, location, match_score, status, priority, resume_id, cover_letter, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        id,
        job.id || null,
        source,
        sourceUrl,
        job.position || job.title || 'Unknown',
        job.company || 'Unknown',
        job.location || null,
        matchScore,
        status,
        job.priority || options.priority || 'medium',
        options.resumeId || null,
        options.coverLetter || null,
        notes,
        now,
        now,
      )
      .run();

    await this.db
      .prepare(
        `
      INSERT INTO application_timeline (application_id, status, note, timestamp)
      VALUES (?, ?, ?, ?)
    `,
      )
      .bind(id, status, 'Application created', now)
      .run();

    const app = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    return this.jsonResponse(app, 201);
  }

  async update(request) {
    const { id } = request.params;

    let body;
    try {
      body = await request.json();
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const validation = validateApplicationUpdate(body);
    if (!validation.valid) {
      return this.jsonResponse(
        { error: 'Validation failed', details: validation.errors },
        400,
      );
    }

    const now = new Date().toISOString();

    const app = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    if (!app) {
      return this.jsonResponse({ error: 'Application not found' }, 404);
    }

    const updates = [];
    const params = [];

    if (body.notes !== undefined) {
      updates.push('notes = ?');
      params.push(body.notes);
    }
    if (body.priority !== undefined) {
      updates.push('priority = ?');
      params.push(body.priority);
    }
    if (body.resumeId !== undefined) {
      updates.push('resume_id = ?');
      params.push(body.resumeId);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      params.push(now, id);

      await this.db
        .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
    }

    const updated = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    return this.jsonResponse({ success: true, application: updated });
  }

  async updateStatus(request) {
    const { id } = request.params;

    let body;
    try {
      body = await request.json();
    } catch {
      return this.jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const validation = validateStatusUpdate(body);
    if (!validation.valid) {
      return this.jsonResponse(
        { error: 'Validation failed', details: validation.errors },
        400,
      );
    }

    const { status, note = '' } = body;
    const now = new Date().toISOString();

    const app = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    if (!app) {
      return this.jsonResponse(
        { success: false, error: 'Application not found' },
        404,
      );
    }

    const oldStatus = app.status;

    let updateSql = 'UPDATE applications SET status = ?, updated_at = ?';
    const params = [status, now];

    if (status === APPLICATION_STATUS.APPLIED && !app.applied_at) {
      updateSql += ', applied_at = ?';
      params.push(now);
    }

    updateSql += ' WHERE id = ?';
    params.push(id);

    await this.db
      .prepare(updateSql)
      .bind(...params)
      .run();

    await this.db
      .prepare(
        `
      INSERT INTO application_timeline (application_id, status, previous_status, note, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .bind(id, status, oldStatus, note, now)
      .run();

    const updated = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    return this.jsonResponse({ success: true, application: updated });
  }

  async delete(request) {
    const { id } = request.params;

    const app = await this.db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .bind(id)
      .first();
    if (!app) {
      return this.jsonResponse(
        { success: false, error: 'Application not found' },
        404,
      );
    }

    await this.db
      .prepare('DELETE FROM application_timeline WHERE application_id = ?')
      .bind(id)
      .run();
    await this.db
      .prepare('DELETE FROM applications WHERE id = ?')
      .bind(id)
      .run();

    return this.jsonResponse({ success: true });
  }

  async cleanupExpired(_request) {
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const result = await this.db
      .prepare(
        `
      UPDATE applications 
      SET status = 'expired', updated_at = ?
      WHERE status = 'pending' AND created_at < ?
    `,
      )
      .bind(now.toISOString(), thirtyDaysAgo)
      .run();

    return this.jsonResponse({ cleaned: result.meta?.changes || 0 });
  }
}
