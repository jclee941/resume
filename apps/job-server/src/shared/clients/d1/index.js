import fetch from 'node-fetch';

export class D1Client {
  constructor(accountId, databaseId, apiKey) {
    this.accountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    this.databaseId = databaseId || process.env.D1_DATABASE_ID;
    this.apiKey = apiKey || process.env.CLOUDFLARE_API_KEY;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  async query(sql, params = []) {
    const url = `${this.baseURL}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    const data = await response.json();

    if (!data.success) {
      const errorMsg = data.errors?.[0]?.message || 'D1 query failed';
      throw new Error(errorMsg);
    }

    return data.result?.[0]?.results || [];
  }

  async getApplications(options = {}) {
    const { status, platform, limit = 100, offset = 0 } = options;
    let sql = 'SELECT * FROM job_applications WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return this.query(sql, params);
  }

  async getStats() {
    const totalResult = await this.query(
      'SELECT COUNT(*) as total FROM job_applications',
    );
    const statusResult = await this.query(`
      SELECT status, COUNT(*) as count 
      FROM job_applications 
      GROUP BY status
    `);
    const platformResult = await this.query(`
      SELECT platform, COUNT(*) as count 
      FROM job_applications 
      GROUP BY platform
    `);

    const byStatus = {};
    for (const row of statusResult) {
      byStatus[row.status] = row.count;
    }

    const byPlatform = {};
    for (const row of platformResult) {
      byPlatform[row.platform] = row.count;
    }

    return {
      total: totalResult[0]?.total || 0,
      byStatus,
      byPlatform,
    };
  }

  async addApplication(app) {
    const sql = `
      INSERT INTO job_applications 
      (id, platform, job_id, title, company, url, location, salary, deadline, status, match_score, resume_id, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    const params = [
      app.id || `${app.platform}_${app.job_id}_${Date.now()}`,
      app.platform,
      app.job_id,
      app.title,
      app.company,
      app.url,
      app.location || null,
      app.salary || null,
      app.deadline || null,
      app.status || 'saved',
      app.match_score || 0,
      app.resume_id || null,
      app.notes || null,
    ];

    await this.query(sql, params);
    return { success: true, id: params[0] };
  }

  async updateStatus(id, status) {
    const sql = `
      UPDATE job_applications 
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `;
    await this.query(sql, [status, id]);
    return { success: true };
  }

  async getAutomationRuns(limit = 20) {
    return this.query(
      'SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT ?',
      [limit],
    );
  }

  async createAutomationRun(run) {
    const sql = `
      INSERT INTO automation_runs (id, run_type, platform, status, config, started_at)
      VALUES (?, ?, ?, 'running', ?, datetime('now'))
    `;
    const id = `run_${Date.now()}`;
    await this.query(sql, [
      id,
      run.run_type,
      run.platform,
      JSON.stringify(run.config || {}),
    ]);
    return { id };
  }

  async completeAutomationRun(id, results) {
    const sql = `
      UPDATE automation_runs 
      SET status = 'completed', 
          results = ?,
          jobs_found = ?,
          jobs_matched = ?,
          jobs_applied = ?,
          completed_at = datetime('now')
      WHERE id = ?
    `;
    await this.query(sql, [
      JSON.stringify(results),
      results.jobs_found || 0,
      results.jobs_matched || 0,
      results.jobs_applied || 0,
      id,
    ]);
    return { success: true };
  }

  /**
   * Check if already applied to a job (duplicate prevention)
   * @param {string} platform - Platform name (wanted, jobkorea, etc.)
   * @param {string} jobId - Platform-specific job ID
   * @param {string} [company] - Company name (fallback check)
   * @param {string} [title] - Job title (fallback check)
   * @returns {Promise<{isDuplicate: boolean, existingApplication?: Object}>}
   */
  async checkDuplicate(platform, jobId, company, title) {
    // Primary check: exact job_id match
    const exactMatch = await this.query(
      'SELECT * FROM job_applications WHERE platform = ? AND job_id = ? LIMIT 1',
      [platform, jobId],
    );

    if (exactMatch.length > 0) {
      return {
        isDuplicate: true,
        existingApplication: exactMatch[0],
        matchType: 'exact',
      };
    }

    // Secondary check: same company + similar title within 90 days
    if (company && title) {
      const fuzzyMatch = await this.query(
        `
        SELECT * FROM job_applications 
        WHERE company = ? 
          AND title = ?
          AND created_at > datetime('now', '-90 days')
        LIMIT 1
      `,
        [company, title],
      );

      if (fuzzyMatch.length > 0) {
        return {
          isDuplicate: true,
          existingApplication: fuzzyMatch[0],
          matchType: 'fuzzy',
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Get all applied job IDs for a platform (for batch deduplication)
   * @param {string} platform
   * @returns {Promise<Set<string>>}
   */
  async getAppliedJobIds(platform) {
    const results = await this.query(
      'SELECT job_id FROM job_applications WHERE platform = ?',
      [platform],
    );
    return new Set(results.map((r) => r.job_id));
  }

  /**
   * Batch check duplicates (more efficient for crawling)
   * @param {string} platform
   * @param {string[]} jobIds
   * @returns {Promise<{duplicates: string[], unique: string[]}>}
   */
  async batchCheckDuplicates(platform, jobIds) {
    if (!jobIds.length) return { duplicates: [], unique: [] };

    const appliedIds = await this.getAppliedJobIds(platform);
    const duplicates = jobIds.filter((id) => appliedIds.has(id));
    const unique = jobIds.filter((id) => !appliedIds.has(id));

    return { duplicates, unique };
  }
}

export function createD1Client() {
  return new D1Client();
}
