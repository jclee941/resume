import { BaseHandler } from './base-handler.js';
import { normalizeError } from '../../../job-server/src/shared/errors/index.js';

function summarizeResume(data) {
  return {
    name: data?.personal?.name || null,
    email: data?.personal?.email || null,
    careers: Array.isArray(data?.careers) ? data.careers.length : 0,
    projects: Array.isArray(data?.projects) ? data.projects.length : 0,
    certifications: Array.isArray(data?.certifications) ? data.certifications.length : 0,
  };
}

export class ResumeMasterHandler extends BaseHandler {
  async getMasterResume(request) {
    const url = new URL(request.url);
    const resumeId = url.searchParams.get('resumeId') || 'master';

    try {
      const row = await this.env.DB.prepare(
        'SELECT id, target_resume_id, source, data, created_at, updated_at FROM resumes WHERE id = ?'
      )
        .bind(resumeId)
        .first();

      if (!row) {
        return this.jsonResponse({ success: false, error: 'Master resume not found' }, 404);
      }

      const data = JSON.parse(row.data);
      return this.jsonResponse({
        success: true,
        resume: data,
        meta: {
          id: row.id,
          targetResumeId: row.target_resume_id || null,
          source: row.source,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          summary: summarizeResume(data),
        },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ResumeMasterHandler',
        action: 'getMasterResume',
      });
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  async uploadMasterResume(request) {
    try {
      const body = await request.json();
      const resumeId = body.resumeId || 'master';
      const targetResumeId = body.targetResumeId || null;
      const ssotData = body.ssotData || body.data || null;
      const source = body.source || 'dashboard';

      if (!ssotData || !ssotData.personal) {
        return this.jsonResponse(
          { success: false, error: 'Invalid resume payload: missing personal section' },
          400
        );
      }

      const now = new Date().toISOString();
      await this.env.DB.prepare(
        `INSERT INTO resumes (id, target_resume_id, source, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           target_resume_id = excluded.target_resume_id,
           source = excluded.source,
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
        .bind(resumeId, targetResumeId, source, JSON.stringify(ssotData), now, now)
        .run();

      return this.jsonResponse({
        success: true,
        message: 'Master resume uploaded successfully',
        meta: {
          id: resumeId,
          targetResumeId,
          source,
          updatedAt: now,
          summary: summarizeResume(ssotData),
        },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ResumeMasterHandler',
        action: 'uploadMasterResume',
      });
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  async listResumeSyncHistory(request) {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50);

    try {
      const rows = await this.env.DB.prepare(
        `SELECT id, platforms, status, dry_run, result, created_at, updated_at
         FROM profile_syncs
         ORDER BY created_at DESC
         LIMIT ?`
      )
        .bind(limit)
        .all();

      return this.jsonResponse({
        success: true,
        history: (rows.results || []).map((row) => ({
          id: row.id,
          platforms: JSON.parse(row.platforms || '[]'),
          status: row.status,
          dryRun: !!row.dry_run,
          result: row.result ? JSON.parse(row.result) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ResumeMasterHandler',
        action: 'listResumeSyncHistory',
      });
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}
