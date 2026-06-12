export class ApplicationRepository {
  constructor(db) {
    this.db = db;
  }

  async insert(app) {
    await this.db
      .prepare(
        `
        INSERT INTO applications (id, job_id, source, source_url, position, company, location, match_score, status, priority, resume_id, cover_letter, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        app.id,
        app.jobId || null,
        app.source,
        app.sourceUrl,
        app.position,
        app.company,
        app.location,
        app.matchScore,
        app.status,
        app.priority,
        app.resumeId || null,
        app.coverLetter || null,
        app.notes,
        app.createdAt,
        app.updatedAt
      )
      .run();

    return this.findById(app.id);
  }

  async insertTimeline(event) {
    await this.db
      .prepare(
        `
        INSERT INTO application_timeline (application_id, status, previous_status, note, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `
      )
      .bind(
        event.applicationId,
        event.status,
        event.previousStatus || null,
        event.note,
        event.timestamp
      )
      .run();
  }

  async findById(id) {
    return this.db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
  }

  async findTimelineByAppId(applicationId) {
    const result = await this.db
      .prepare(
        'SELECT * FROM application_timeline WHERE application_id = ? ORDER BY timestamp DESC'
      )
      .bind(applicationId)
      .all();
    return result.results || [];
  }

  async findAll({
    status,
    source,
    company,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 100,
    offset = 0,
  }) {
    const VALID_SORT_COLUMNS = ['created_at', 'updated_at', 'company', 'status', 'match_score'];
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

    const sortCol = VALID_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await this.db
      .prepare(sql)
      .bind(...params)
      .all();
    return result.results || [];
  }

  async countAll() {
    const result = await this.db.prepare('SELECT COUNT(*) as total FROM applications').first();
    return result?.total || 0;
  }

  async updateStatus(id, { status, updatedAt, appliedAt }) {
    let sql = 'UPDATE applications SET status = ?, updated_at = ?';
    const params = [status, updatedAt];

    if (appliedAt) {
      sql += ', applied_at = ?';
      params.push(appliedAt);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await this.db
      .prepare(sql)
      .bind(...params)
      .run();
    return this.findById(id);
  }

  async update(id, fields, updatedAt) {
    const updates = [];
    const params = [];

    if (fields.notes !== undefined) {
      updates.push('notes = ?');
      params.push(fields.notes);
    }
    if (fields.priority !== undefined) {
      updates.push('priority = ?');
      params.push(fields.priority);
    }
    if (fields.resumeId !== undefined) {
      updates.push('resume_id = ?');
      params.push(fields.resumeId);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    params.push(updatedAt, id);

    await this.db
      .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
    return this.findById(id);
  }

  async delete(id) {
    await this.db
      .prepare('DELETE FROM application_timeline WHERE application_id = ?')
      .bind(id)
      .run();
    await this.db.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();
  }

  async cleanupExpired(cutoffDate) {
    const result = await this.db
      .prepare(
        `
        UPDATE applications
        SET status = 'expired', updated_at = datetime('now')
        WHERE status = 'pending'
          AND created_at < ?
      `
      )
      .bind(cutoffDate)
      .run();

    return result.meta?.changes || 0;
  }
}
