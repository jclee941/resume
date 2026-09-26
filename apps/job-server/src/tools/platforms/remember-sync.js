import { syncToRemember as platformSyncToRemember } from '../../../platforms/remember/remember-profile-sync.js';

/**
 * @typedef {Object} RememberCareer
 * @property {string} company
 * @property {string} [role]
 * @property {string} [period]
 * @property {string} [project]
 */

/**
 * @typedef {Object} RememberSourceResume
 * @property {{ name: string }} personal
 * @property {{ position?: string, company?: string }} [current]
 * @property {{ totalExperience: string | number, expertise?: unknown }} summary
 * @property {RememberCareer[]} careers
 */

/**
 * @typedef {Object} RememberFormattedResume
 * @property {string} name
 * @property {string} headline
 * @property {string | number} experience
 * @property {Array<{ company: string, title?: string, period?: string, project?: string }>} careers
 * @property {unknown} skills
 */

/**
 * @typedef {{
 *   dry_run?: boolean,
 *   [key: string]: unknown,
 * }} RememberSyncParams
 */

/**
 * @param {RememberSourceResume} source
 * @returns {RememberFormattedResume}
 */
export function mapToRememberFormat(source) {
  return {
    name: source.personal.name,
    headline: `${source.current?.position || source.careers?.[0]?.role || ''} @ ${source.current?.company || source.careers?.[0]?.company || ''}`,
    experience: source.summary.totalExperience,
    careers: source.careers.map((c) => ({
      company: c.company,
      title: c.role,
      period: c.period,
      project: c.project,
    })),
    skills: source.summary.expertise,
  };
}

/**
 * @param {RememberFormattedResume | Record<string, unknown>} data
 * @param {RememberSyncParams} params
 * @returns {Promise<unknown>}
 */
export async function syncToRemember(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to career.rememberapp.co.kr',
        '2. Login via mobile app QR',
        '3. Update profile headline',
        '4. Add/update career entries',
        '5. Save changes',
      ],
    };
  }

  return platformSyncToRemember({ ...params, headless: false });
}
