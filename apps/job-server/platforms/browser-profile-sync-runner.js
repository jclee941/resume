import { diffProfileSections } from './base-profile-sync.js';

/**
 * @typedef {Object} ProfileSyncOptions
 * @property {boolean} [dry_run]
 */

/**
 * @typedef {Object} ProfileSyncSectionError
 * @property {string} section
 * @property {string} error
 */

/**
 * @typedef {Object} ProfileSyncResults
 * @property {string[]} updated
 * @property {string[]} skipped
 * @property {ProfileSyncSectionError[]} errors
 */

/**
 * @typedef {Record<string, unknown> & {
 *   personal?: Record<string, unknown>;
 *   careers?: unknown[];
 *   education?: Record<string, unknown>;
 *   certifications?: unknown[];
 *   skills?: string[];
 * }} ProfileSyncSourceData
 */

/**
 * @typedef {Object} SyncRunnerInstance
 * @property {() => Promise<boolean>} checkLogin
 * @property {() => Promise<unknown>} waitForManualLogin
 * @property {() => Promise<{ data: Record<string, unknown> | null }>} getProfile
 * @property {(personal: unknown) => Promise<void>} fillPersonalInfo
 * @property {(careers: unknown) => Promise<void>} fillCareers
 * @property {(education: unknown) => Promise<void>} fillEducation
 * @property {(certifications: unknown) => Promise<void>} fillCertifications
 * @property {() => Promise<void>} saveProfile
 */

/**
 * @param {SyncRunnerInstance} instance
 * @param {ProfileSyncSourceData} sourceData
 * @param {ProfileSyncOptions} [options]
 */
export async function executeProfileSync(instance, sourceData, options = {}) {
  const { dry_run = false } = options;
  /** @type {ProfileSyncResults} */
  const results = { updated: [], skipped: [], errors: [] };

  if (!(await instance.checkLogin())) {
    if (dry_run) {
      return { error: 'Not logged in', dry_run: true };
    }
    await instance.waitForManualLogin();
  }

  if (dry_run) {
    const current = await instance.getProfile().catch(() => ({ data: null }));
    const changes = current.data ? diffProfileSections(sourceData, current.data) : [];
    return {
      dry_run: true,
      would_update: {
        personal: sourceData.personal,
        careers: sourceData.careers?.length ?? 0,
        education: sourceData.education,
        certifications: sourceData.certifications?.length ?? 0,
      },
      changes,
    };
  }

  const current = await instance.getProfile().catch(() => ({ data: null }));
  const changes = current.data ? diffProfileSections(sourceData, current.data) : null;
  const changedSections = new Set(changes?.map((c) => c.section) ?? []);

  if (changes && changes.length === 0) {
    results.skipped.push('all');
    return results;
  }

  if (!changedSections.size || changedSections.has('personal')) {
    try {
      await instance.fillPersonalInfo(sourceData.personal);
      results.updated.push('personal');
    } catch (e) {
      results.errors.push({
        section: 'personal',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    results.skipped.push('personal');
  }

  if (!changedSections.size || changedSections.has('careers')) {
    try {
      await instance.fillCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({
        section: 'careers',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    results.skipped.push('careers');
  }

  if (!changedSections.size || changedSections.has('education')) {
    try {
      await instance.fillEducation(sourceData.education);
      results.updated.push('education');
    } catch (e) {
      results.errors.push({
        section: 'education',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    results.skipped.push('education');
  }

  if (!changedSections.size || changedSections.has('certifications')) {
    try {
      await instance.fillCertifications(sourceData.certifications);
      results.updated.push('certifications');
    } catch (e) {
      results.errors.push({
        section: 'certifications',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    results.skipped.push('certifications');
  }

  await instance.saveProfile();
  return results;
}
