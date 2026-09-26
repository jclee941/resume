import { DEFAULT_USER_AGENT } from '@resume/shared/ua';
import { readPlatformSession } from '../services/platform-session.js';

/**
 * @typedef {{
 *   prepare(query: string): {
 *     bind(...args: unknown[]): {
 *       first(): Promise<{ data?: string; target_resume_id?: string | null } | null>;
 *     };
 *   };
 * }} D1DatabaseLite
 */

/**
 * @typedef {{
 *   JOB_DB: D1DatabaseLite;
 *   ENCRYPTION_KEY?: string;
 *   SESSIONS?: { get(key: string): Promise<string | null> };
 *   [key: string]: unknown;
 * }} ResumeSyncEnv
 */

/**
 * @typedef {import('./resume-sync-diff.js').ResumeItem} ResumeItem
 *
 * @typedef {{
 *   careers?: ResumeItem[];
 *   educations?: ResumeItem[];
 *   skills?: ResumeItem[];
 *   activities?: ResumeItem[];
 *   language_certs?: ResumeItem[];
 *   links?: ResumeItem[];
 * }} RawWantedResumeData
 */

/**
 * @param {ResumeSyncEnv} env
 * @param {string | number} resumeId
 * @returns {Promise<{ data: Record<string, ResumeItem[]>; targetResumeId: string | null } | null>}
 */
export async function getMasterResumeRecord(env, resumeId) {
  const row = await env.JOB_DB.prepare('SELECT data, target_resume_id FROM resumes WHERE id = ?')
    .bind(resumeId)
    .first();

  return row?.data
    ? { data: JSON.parse(row.data), targetResumeId: row.target_resume_id || null }
    : null;
}

/**
 * @param {ResumeSyncEnv} env
 * @param {string} platform
 * @param {string | number | null | undefined} resumeId
 * @returns {Promise<Record<string, ResumeItem[]>>}
 */
export async function exportFromPlatform(env, platform, resumeId) {
  /** @type {Record<string, () => Promise<Record<string, ResumeItem[]>>>} */
  const exporters = {
    wanted: () => exportFromWanted(env, resumeId),
    linkedin: () => exportFromLinkedIn(resumeId),
    remember: () => exportFromRemember(resumeId),
  };

  const exporter = exporters[platform];
  if (!exporter) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await exporter();
}

/**
 * @param {ResumeSyncEnv} env
 * @param {string | number | null | undefined} resumeId
 * @returns {Promise<ReturnType<typeof normalizeWantedResume>>}
 */
export async function exportFromWanted(env, resumeId) {
  if (!resumeId) {
    throw new Error('No Wanted resume ID: set targetResumeId on the master resume');
  }

  const session = await readPlatformSession(env, 'wanted');
  if (!session) {
    throw new Error('No Wanted session');
  }

  try {
    const response = await fetch(`https://www.wanted.co.kr/api/chaos/resumes/v1/${resumeId}`, {
      headers: {
        Cookie: session,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Wanted API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizeWantedResume(data);
  } catch (error) {
    throw new Error(
      `Wanted export failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * @param {string | number | null} [_resumeId]
 * @returns {Promise<Record<string, ResumeItem[]>>}
 */
export async function exportFromLinkedIn(_resumeId) {
  return { careers: [], educations: [], skills: [] };
}

/**
 * @param {string | number | null} [_resumeId]
 * @returns {Promise<Record<string, ResumeItem[]>>}
 */
export async function exportFromRemember(_resumeId) {
  return { careers: [], educations: [], skills: [] };
}

/**
 * @param {RawWantedResumeData} data
 */
export function normalizeWantedResume(data) {
  return {
    careers: data.careers || [],
    educations: data.educations || [],
    skills: data.skills || [],
    activities: data.activities || [],
    language_certs: data.language_certs || [],
    links: data.links || [],
  };
}
