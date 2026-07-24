/**
 * Application repository mock utility for test helpers.
 * @file apps/job-server/src/test-helpers/repository-mock.js
 */

import { mock } from 'node:test';
import { createMockD1Client } from './database-mock.js';

// ========================
// Repository Mock
// ========================

/**
 * Create a mock application repository
 * @returns {Object} Mock repository
 */
export function createMockRepository() {
  const apps = new Map();
  const timeline = [];

  return {
    d1Client: createMockD1Client(),
    create: mock.fn(async (data) => {
      const id = data.id || `app-${apps.size + 1}`;
      const now = new Date().toISOString();
      const row = {
        id,
        job_id: data.job_id,
        source: data.source,
        source_url: data.source_url || null,
        position: data.position,
        company: data.company,
        location: data.location || null,
        match_score: data.match_score || 0,
        status: data.status || 'discovered',
        priority: data.priority || 'medium',
        resume_id: data.resume_id || null,
        cover_letter: data.cover_letter || null,
        notes: data.notes || null,
        created_at: now,
        updated_at: now,
        applied_at: null,
        workflow_id: null,
        approved_at: null,
        rejected_at: null,
      };
      apps.set(id, row);
      timeline.push({
        application_id: id,
        status: row.status,
        previous_status: null,
        note: 'created',
      });
      return { ...row };
    }),
    findById: mock.fn(async (id) => {
      const row = apps.get(id);
      return row ? { ...row } : null;
    }),
    findByJobId: mock.fn(async (jobId) =>
      [...apps.values()]
        .filter((row) => String(row.job_id) === String(jobId))
        .map((row) => ({ ...row }))
    ),
    update: mock.fn(async (id, patch) => {
      const row = apps.get(id);
      if (!row) return null;
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
      return { ...row };
    }),
    updateStatus: mock.fn(async (id, status, note = '') => {
      const row = apps.get(id);
      if (!row) return null;
      const previous = row.status;
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (note) row.notes = note;
      timeline.push({ application_id: id, status, previous_status: previous, note });
      return { ...row };
    }),
    findTodayApplications: mock.fn(async () => [...apps.values()].map((row) => ({ ...row }))),
    getStats: mock.fn(async () => {
      const rows = [...apps.values()];
      return {
        total: rows.length,
        today: rows.length,
        pendingApprovals: rows.filter(
          (r) => r.status === 'pending' && r.match_score >= 60 && r.match_score <= 74
        ).length,
        averageMatchScore: rows.length
          ? rows.reduce((acc, row) => acc + Number(row.match_score || 0), 0) / rows.length
          : 0,
        byStatus: rows.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {}),
        bySource: rows.reduce((acc, row) => {
          acc[row.source] = (acc[row.source] || 0) + 1;
          return acc;
        }, {}),
      };
    }),
    __apps: apps,
    __timeline: timeline,
  };
}
