import { existsSync } from 'fs';
import { join } from 'path';
import { BaseCommand, DATA_DIR } from './base-command.js';

/**
 * @typedef {Record<string, unknown> & {
 *   step: string;
 *   status: string;
 *   backup?: string;
 *   reason?: string;
 * }} PipelineStep
 */

/**
 * @typedef {{
 *   started_at: string;
 *   steps: PipelineStep[];
 *   completed_at?: string;
 *   duration_ms?: number;
 * }} PipelineRunResults
 */

/**
 * @typedef {{
 *   section: string;
 *   action?: string;
 *   id?: unknown;
 *   data?: unknown;
 *   tag_type_id?: unknown;
 *   [key: string]: unknown;
 * }} PipelineUpdateItem
 */

/**
 * @typedef {{
 *   updates?: PipelineUpdateItem[];
 *   [key: string]: unknown;
 * }} PipelineUpdatesFile
 */

export class PipelineRunCommand extends BaseCommand {
  /**
   * @param {{ resume_id?: string; dry_run?: boolean }} params
   * @returns {Promise<{
   *   success: boolean;
   *   error?: string;
   *   message?: string;
   *   results?: PipelineRunResults;
   * }>}
   */
  async execute(params) {
    const { resume_id, dry_run = false } = params;

    if (!resume_id) {
      return { success: false, error: 'resume_id is required for pipeline_run' };
    }

    const startTime = Date.now();
    /** @type {PipelineRunResults} */
    const results = {
      started_at: new Date().toISOString(),
      steps: [],
    };

    // Step 1: Export current state
    results.steps.push({ step: 'export', status: 'running' });
    const remoteData = await /** @type {(id: string) => Promise<unknown>} */ (
      this.api.getResumeDetail
    )(resume_id);
    const backupPath = join(DATA_DIR, `${resume_id}_backup_${Date.now()}.json`);
    this.writeJsonFile(backupPath, remoteData);
    results.steps[0] = { step: 'export', status: 'done', backup: backupPath };

    // Step 2: Check for updates file
    const updatesFile = join(DATA_DIR, `${resume_id}_updates.json`);
    if (!existsSync(updatesFile)) {
      results.steps.push({ step: 'updates', status: 'skipped', reason: 'No updates file' });
    } else {
      results.steps.push({ step: 'updates', status: 'running' });
      const updates = /** @type {PipelineUpdatesFile} */ (this.readJsonFile(updatesFile));
      const updateResults = await this._applyUpdates(resume_id, updates, dry_run);
      results.steps[1] = { step: 'updates', status: 'done', ...updateResults };
    }

    // Step 3: Save and regenerate PDF
    if (!dry_run) {
      results.steps.push({ step: 'save', status: 'running' });
      await /** @type {(id: string) => Promise<unknown>} */ (this.api.saveResume)(resume_id);
      results.steps[results.steps.length - 1] = { step: 'save', status: 'done' };
    }

    results.completed_at = new Date().toISOString();
    results.duration_ms = Date.now() - startTime;

    const statusFile = join(DATA_DIR, 'pipeline-status.json');
    this.writeJsonFile(statusFile, {
      last_run: results.completed_at,
      last_result: results,
      resume_id,
    });

    return { success: true, message: 'Pipeline completed', results };
  }

  /**
   * @param {string} resumeId
   * @param {PipelineUpdatesFile} updates
   * @param {boolean} dryRun
   * @returns {Promise<{
   *   applied: PipelineUpdateItem[];
   *   skipped: Array<PipelineUpdateItem & { reason: string }>;
   *   errors: Array<{ update: PipelineUpdateItem; error: string }>;
   * }>}
   */
  async _applyUpdates(resumeId, updates, dryRun) {
    /** @type {{
     *   applied: PipelineUpdateItem[];
     *   skipped: Array<PipelineUpdateItem & { reason: string }>;
     *   errors: Array<{ update: PipelineUpdateItem; error: string }>;
     * }} */
    const results = { applied: [], skipped: [], errors: [] };

    for (const update of updates.updates || []) {
      if (dryRun) {
        results.skipped.push({ ...update, reason: 'dry_run' });
        continue;
      }

      try {
        await this._applySingleUpdate(resumeId, update);
        results.applied.push(update);
      } catch (error) {
        results.errors.push({
          update,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * @param {string} resumeId
   * @param {PipelineUpdateItem} update
   * @returns {Promise<void>}
   */
  async _applySingleUpdate(resumeId, update) {
    const api = /** @type {import('./base-command.js').BaseCommandApi & {
      updateResumeEducation(resumeId: string, id: unknown, data: unknown): Promise<unknown>;
      updateResumeActivity(resumeId: string, id: unknown, data: unknown): Promise<unknown>;
    }} */ (this.api);

    switch (update.section) {
      case 'career':
        if (update.action === 'update')
          await api.updateResumeCareer(resumeId, update.id, update.data);
        else if (update.action === 'add') await api.addResumeCareer(resumeId, update.data);
        break;
      case 'education':
        if (update.action === 'update')
          await api.updateResumeEducation(resumeId, update.id, update.data);
        break;
      case 'skill':
        if (update.action === 'add') await api.addResumeSkill(resumeId, update.tag_type_id);
        else if (update.action === 'delete') await api.deleteResumeSkill(resumeId, update.id);
        break;
      case 'activity':
        if (update.action === 'update')
          await api.updateResumeActivity(resumeId, update.id, update.data);
        break;
    }
  }
}
