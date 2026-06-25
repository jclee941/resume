import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEFAULT_DATA_DIR, ensureFileParentSync } from './common.js';

function toSqliteParams(sql, bound) {
  if (bound.length === 0) {
    return [];
  }

  if (/\?\d+/.test(sql)) {
    const mapped = {};
    for (let i = 0; i < bound.length; i += 1) {
      mapped[i + 1] = bound[i];
    }
    return mapped;
  }

  return bound;
}

class MockD1PreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.bound = [];
  }

  bind(...values) {
    this.bound = values;
    return this;
  }

  async run() {
    const stmt = this.db.prepare(this.sql);
    const start = Date.now();
    const result = stmt.run(toSqliteParams(this.sql, this.bound));
    return {
      success: true,
      meta: {
        changes: Number(result.changes || 0),
        last_row_id: Number(result.lastInsertRowid || 0),
        duration: Date.now() - start,
      },
    };
  }

  async first(column) {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(toSqliteParams(this.sql, this.bound)) || null;
    if (!row) return null;
    if (column) {
      return Object.prototype.hasOwnProperty.call(row, column) ? row[column] : null;
    }
    return row;
  }

  async all() {
    const stmt = this.db.prepare(this.sql);
    const start = Date.now();
    const results = stmt.all(toSqliteParams(this.sql, this.bound));
    return {
      results,
      success: true,
      meta: {
        duration: Date.now() - start,
        changes: 0,
      },
    };
  }

  async raw(options = {}) {
    const stmt = this.db.prepare(this.sql);
    const rows = stmt.raw(true).all(toSqliteParams(this.sql, this.bound));
    return options.columnNames ? [stmt.columns().map((c) => c.name), ...rows] : rows;
  }
}

export class MockD1Database {
  constructor(options = {}) {
    this.filePath = options.filePath || resolve(DEFAULT_DATA_DIR, 'd1.sqlite');
    ensureFileParentSync(this.filePath);
    this.db = new Database(this.filePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  prepare(sql) {
    return new MockD1PreparedStatement(this.db, sql);
  }

  async exec(sql) {
    const start = Date.now();
    this.db.exec(sql);
    const count = sql
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean).length;
    return { count, duration: Date.now() - start };
  }

  async batch(statements) {
    const results = [];
    const tx = this.db.transaction(() => {
      for (const statement of statements) {
        const stmt = this.db.prepare(statement.sql);
        const start = Date.now();
        const result = stmt.run(toSqliteParams(statement.sql, statement.bound));
        results.push({
          success: true,
          meta: {
            changes: Number(result.changes || 0),
            last_row_id: Number(result.lastInsertRowid || 0),
            duration: Date.now() - start,
          },
        });
      }
    });
    tx();
    return results;
  }

  async dump() {
    this.db.pragma('wal_checkpoint(FULL)');
    const bytes = readFileSync(this.filePath);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  close() {
    this.db.close();
  }
}
