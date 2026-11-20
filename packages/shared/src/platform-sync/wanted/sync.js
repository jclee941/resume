import { syncAbout } from './about.js';
import { syncCareers } from './careers.js';
import {
  syncActivities,
  syncContact,
  syncEducations,
  syncLanguageCerts,
  syncSkills,
} from './profile-sections.js';

const SSOT_ACTIVITY_TYPES = new Set(['CERTIFICATE', 'AWARD']);
// contact.blog is listed as a system the owner operates.
const BLOG_LINK_TITLE = '운영 중인 블로그 시스템';

/**
 * @typedef {{ updated: string[]; errors: Array<{ section: string; error: string }> }} WantedSyncResults
 *
 * @typedef {ReturnType<typeof import('./format-mapper.js').mapToWantedFormat>} WantedResumeData
 *
 * @typedef {{
 *   careers?: Parameters<typeof syncCareers>[3];
 *   educations?: Parameters<typeof syncEducations>[3];
 *   skills?: Parameters<typeof syncSkills>[3];
 *   activities?: Array<Parameters<typeof syncActivities>[3][number] & { activity_type?: string }>;
 *   language_certs?: Parameters<typeof syncLanguageCerts>[3];
 *   links?: Array<{ url?: string | null; order: number }>;
 *   about?: string;
 * } & Parameters<typeof syncContact>[3]} WantedResumeDetail
 *
 * @typedef {{
 *     getResumeDetail(resumeId: string | number): Promise<WantedResumeDetail>;
 *     updateProfile(profile: { headline?: string; description?: string }): Promise<unknown>;
 *     resume: Pick<import('../../clients/wanted/endpoints/resume.js').ResumeEndpoint, 'addLink'>;
 *   } & Parameters<typeof syncAbout>[0] &
 *   Parameters<typeof syncCareers>[0] &
 *   Parameters<typeof syncEducations>[0]} WantedResumeApi
 *
 * @typedef {Parameters<typeof syncActivities>[2] &
 *   Parameters<typeof syncLanguageCerts>[2] &
 *   Parameters<typeof syncAbout>[2] &
 *   Parameters<typeof syncContact>[2] & {
 *     careers?: Parameters<typeof syncCareers>[4];
 *     contact?: { blog?: string };
 *   }} WantedSourceData
 */

/**
 * @param {WantedSyncResults} results
 * @param {string} section
 * @param {() => Promise<unknown>} fn
 * @returns {Promise<void>}
 */
async function runStep(results, section, fn) {
  try {
    await fn();
    results.updated.push(section);
  } catch (error) {
    results.errors.push({
      section,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Push Wanted-format resume data (see mapToWantedFormat) to one Wanted resume
 * through an authenticated client. Sections run independently, so one failing
 * section is reported without aborting the rest.
 * @param {WantedResumeApi} api
 * @param {WantedResumeData} data
 * @param {string | number} resumeId
 * @param {WantedSourceData} sourceData
 * @param {Parameters<typeof syncSkills>[4]} [logger]
 * @returns {Promise<WantedSyncResults>}
 */
export async function syncWantedResume(api, data, resumeId, sourceData, logger = console) {
  /** @type {WantedSyncResults} */
  const results = { updated: [], errors: [] };

  /** @type {WantedResumeDetail} */
  let resumeDetail;
  try {
    resumeDetail = await api.getResumeDetail(resumeId);
  } catch (error) {
    results.errors.push({
      section: 'resume_detail',
      error: error instanceof Error ? error.message : String(error),
    });
    return results;
  }

  await runStep(results, 'profile', () =>
    api.updateProfile({ headline: data.profile.headline, description: data.profile.description })
  );
  await runStep(results, 'careers', () =>
    syncCareers(
      api,
      resumeId,
      data.careers || [],
      resumeDetail.careers || [],
      sourceData.careers || []
    )
  );
  await runStep(results, 'educations', () =>
    syncEducations(api, resumeId, data.educations || [], resumeDetail.educations || [])
  );
  await runStep(results, 'skills', () =>
    syncSkills(api, resumeId, data.skills || [], resumeDetail.skills || [], logger)
  );
  await runStep(results, 'activities', () =>
    syncActivities(
      api,
      resumeId,
      sourceData,
      (resumeDetail.activities || []).filter((activity) =>
        SSOT_ACTIVITY_TYPES.has(String(activity.activity_type))
      )
    )
  );
  await runStep(results, 'language_certs', () =>
    syncLanguageCerts(api, resumeId, sourceData, resumeDetail.language_certs || [])
  );
  await runStep(results, 'about', () =>
    syncAbout(api, resumeId, sourceData, resumeDetail.about || '')
  );
  await runStep(results, 'contact', () => syncContact(api, resumeId, sourceData, resumeDetail));

  const blog = sourceData.contact?.blog?.trim();
  const links = resumeDetail.links ?? [];
  if (blog && !links.some((link) => link.url?.trim() === blog)) {
    const order = links.reduce((next, link) => Math.max(next, link.order + 1), 0);
    await runStep(results, 'links', () =>
      api.resume.addLink(resumeId, { order, title: BLOG_LINK_TITLE, url: blog })
    );
  }

  return results;
}
