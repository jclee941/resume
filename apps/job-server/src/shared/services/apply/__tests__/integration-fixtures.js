import { afterEach, mock } from 'node:test';
import Database from 'better-sqlite3';

import { ApplicationRepository } from '../../../repositories/application-repository.js';

const openDbs = new Set();

export class InMemoryD1Client {
  constructor() {
    this.db = new Database(':memory:');
    openDbs.add(this.db);
    this.#createSchema();
  }

  async query(sql, params = []) {
    const statement = this.db.prepare(sql);
    const normalized = sql.trim().toUpperCase();

    if (
      normalized.startsWith('SELECT') ||
      normalized.startsWith('WITH') ||
      normalized.startsWith('PRAGMA')
    ) {
      return statement.all(...params);
    }

    statement.run(...params);
    return [];
  }

  #createSchema() {
    this.db.exec(`
      CREATE TABLE applications (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        source TEXT,
        source_url TEXT,
        position TEXT,
        company TEXT,
        location TEXT,
        match_score INTEGER,
        status TEXT,
        priority TEXT,
        resume_id TEXT,
        cover_letter TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        applied_at TEXT,
        workflow_id TEXT,
        approved_at TEXT,
        rejected_at TEXT
      );

      CREATE TABLE application_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT,
        status TEXT,
        previous_status TEXT,
        note TEXT,
        timestamp TEXT
      );

      CREATE TABLE approval_requests (
        id TEXT PRIMARY KEY,
        workflow_id TEXT,
        job_id TEXT,
        job_title TEXT,
        company TEXT,
        platform TEXT,
        match_score INTEGER,
        status TEXT,
        reviewed_by TEXT,
        reviewed_at TEXT,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE notification_history (
        id TEXT PRIMARY KEY,
        event_type TEXT,
        data TEXT,
        channels TEXT,
        timestamp TEXT,
        status TEXT,
        results TEXT
      );
    `);
  }
}

export function createLogger() {
  return {
    info: mock.fn(),
    log: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
  };
}

export function createApplyServiceFixture() {
  const d1Client = new InMemoryD1Client();
  return {
    d1Client,
    repository: new ApplicationRepository(d1Client),
    logger: createLogger(),
  };
}

export async function getTimeline(d1Client, applicationId) {
  return d1Client.query(
    `
      SELECT status, previous_status, note
      FROM application_timeline
      WHERE application_id = ?
      ORDER BY id ASC
    `,
    [applicationId]
  );
}

afterEach(() => {
  mock.restoreAll();
  for (const db of openDbs) {
    try {
      db.close();
    } catch {}
  }
  openDbs.clear();
});
