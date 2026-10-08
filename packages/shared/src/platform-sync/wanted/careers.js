import { normalizeCompanyName } from '@resume/shared/normalize';

import { isStrictSyncEnabled } from './strict-sync.js';
import { normalizeText, truncateWantedProjectDescription } from './text-formatting.js';

/**
 * @typedef {Object} CareerProject
 * @property {string} [period]
 * @property {string[]} [techStack]
 * @property {string[]} [achievements]
 * @property {string} [description]
 * @property {string} [name]
 * @property {string} [title]
 */

/**
 * @typedef {Object} NormalizedProject
 * @property {string} title
 * @property {string} description
 * @property {string} [job_role] shown as the item's 직무; Wanted keeps no role on the career itself
 */

/**
 * @typedef {Object} RemoteProject
 * @property {string | number} id
 * @property {string} title
 * @property {string} [description]
 */

/**
 * @typedef {Object} CompanyInfo
 * @property {string} [name]
 */

/**
 * @typedef {Object} SsotCareer
 * @property {CareerProject[]} [projects]
 * @property {string} [project]
 * @property {string} [description]
 * @property {string} [role]
 * @property {CompanyInfo} [company]
 * @property {string} [company_name]
 */

/**
 * @typedef {Object} LocalCareer
 * @property {CompanyInfo} [company]
 * @property {string} [company_name]
 * @property {string | number} [id]
 * @property {string | null} [start_time]
 */

/**
 * @typedef {Object} RemoteCareer
 * @property {string | number} id
 * @property {CompanyInfo} [company]
 * @property {string} [company_name]
 * @property {string | null} [start_time]
 * @property {RemoteProject[]} [projects]
 */

/**
 * @typedef {Object} WantedCareerApi
 * @property {(resumeId: string | number, careerId: string | number, projectId: string | number, project: NormalizedProject) => Promise<unknown>} [updateProject]
 * @property {(resumeId: string | number, careerId: string | number, projectId: string | number) => Promise<unknown>} deleteProject
 * @property {(resumeId: string | number, careerId: string | number, project: NormalizedProject) => Promise<unknown>} addProject
 * @property {(resumeId: string | number, careerId: string | number, career: LocalCareer) => Promise<unknown>} update
 * @property {(resumeId: string | number, career: LocalCareer) => Promise<{ id?: string | number, data?: { id?: string | number } }>} add
 * @property {(resumeId: string | number, careerId: string | number) => Promise<unknown>} delete
 */

/**
 * @typedef {Object} WantedCareersApiClient
 * @property {WantedCareerApi} resumeCareer
 */

/**
 * @param {CareerProject} [project]
 * @returns {string}
 */
function composeCareerProjectDescription(project = {}) {
  const period = normalizeText(project.period);
  const techStack = Array.isArray(project.techStack)
    ? project.techStack
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .join(', ')
    : '';
  const achievements = Array.isArray(project.achievements)
    ? project.achievements
        .map((achievement) => normalizeText(achievement))
        .filter(Boolean)
        .map((achievement) => `- ${achievement}`)
        .join('\n')
    : '';
  const description = `${period || ''}\n${techStack || ''}\n\n${achievements}`.trim();

  if (description) {
    return truncateWantedProjectDescription(description);
  }

  return truncateWantedProjectDescription(normalizeText(project.description));
}

/**
 * @param {SsotCareer} [ssotCareer]
 * @returns {NormalizedProject[]}
 */
function normalizeCareerProjects(ssotCareer = {}) {
  if (Array.isArray(ssotCareer.projects)) {
    return /** @type {NormalizedProject[]} */ (
      ssotCareer.projects
        .map((project) => {
          if (!project || typeof project !== 'object') {
            return null;
          }

          const title =
            normalizeText(project.name) ||
            normalizeText(project.title) ||
            normalizeText(ssotCareer.project);
          const description = composeCareerProjectDescription(project);

          if (!title || !description) {
            return null;
          }

          return { title, description };
        })
        .filter(Boolean)
    );
  }
  if (ssotCareer.project && ssotCareer.description) {
    return [
      {
        title: normalizeText(ssotCareer.project),
        description: truncateWantedProjectDescription(normalizeText(ssotCareer.description)),
      },
    ];
  }

  if (ssotCareer.description) {
    return [
      {
        title: normalizeText(ssotCareer.project) || 'Career Description',
        description: truncateWantedProjectDescription(normalizeText(ssotCareer.description)),
      },
    ];
  }

  if (ssotCareer.project && ssotCareer.description) {
    return [
      {
        title: normalizeText(ssotCareer.project),
        description: truncateWantedProjectDescription(normalizeText(ssotCareer.description)),
      },
    ];
  }

  return [];
}

/**
 * @param {WantedCareersApiClient} api
 * @param {string | number} resume_id
 * @param {string | number} careerId
 * @param {SsotCareer} [ssotCareer]
 * @param {RemoteProject[]} [remoteProjects]
 * @returns {Promise<void>}
 */
async function syncCareerProjects(api, resume_id, careerId, ssotCareer = {}, remoteProjects = []) {
  const strictSync = isStrictSyncEnabled();
  const role = normalizeText(ssotCareer.role);
  const localProjects = normalizeCareerProjects(ssotCareer).map((project) =>
    role ? { ...project, job_role: role } : project
  );
  const matchedProjectIds = new Set();

  for (const project of localProjects) {
    const matchedProject = remoteProjects.find(
      (remoteProject) => remoteProject.title === project.title
    );

    if (matchedProject) {
      matchedProjectIds.add(matchedProject.id);

      if (typeof api.resumeCareer.updateProject === 'function') {
        await api.resumeCareer.updateProject(resume_id, careerId, matchedProject.id, project);
      } else {
        await api.resumeCareer.deleteProject(resume_id, careerId, matchedProject.id);
        await api.resumeCareer.addProject(resume_id, careerId, project);
      }
    } else {
      await api.resumeCareer.addProject(resume_id, careerId, project);
    }
  }

  if (!strictSync) {
    return;
  }

  const unknownProjects = remoteProjects.filter(
    (remoteProject) => !matchedProjectIds.has(remoteProject.id)
  );
  for (const project of unknownProjects) {
    await api.resumeCareer.deleteProject(resume_id, careerId, project.id);
  }
}

/**
 * Pair each local career with a remote career of the same company, same start date first, so
 * two stints at one company each keep their own remote career.
 * @param {LocalCareer[]} localCareers
 * @param {RemoteCareer[]} remoteCareers
 * @returns {Array<RemoteCareer | undefined>}
 */
function matchRemoteCareers(localCareers, remoteCareers) {
  /** @type {Array<RemoteCareer | undefined>} */
  const matches = localCareers.map(() => undefined);
  for (const sameStart of [true, false]) {
    localCareers.forEach((career, i) => {
      if (matches[i]) return;
      const companyName = /** @type {string} */ (career.company?.name || career.company || '');
      const normalizedName = normalizeCompanyName(companyName);
      matches[i] = remoteCareers.find(
        (rc) =>
          !matches.includes(rc) &&
          normalizeCompanyName(rc.company?.name || rc.company_name) === normalizedName &&
          (!sameStart || rc.start_time === career.start_time)
      );
    });
  }
  return matches;
}

/**
 * @param {WantedCareersApiClient} api
 * @param {string | number} resume_id
 * @param {LocalCareer[]} localCareers
 * @param {RemoteCareer[]} remoteCareers
 * @param {SsotCareer[]} ssotCareers
 * @returns {Promise<void>}
 */
export async function syncCareers(api, resume_id, localCareers, remoteCareers, ssotCareers) {
  const matches = matchRemoteCareers(localCareers, remoteCareers);
  for (let i = 0; i < localCareers.length; i++) {
    const career = localCareers[i];
    const ssotCareer = ssotCareers[i] || {};
    const matchedCareer = matches[i];

    if (matchedCareer) {
      await api.resumeCareer.update(resume_id, matchedCareer.id, career);
      await syncCareerProjects(
        api,
        resume_id,
        matchedCareer.id,
        ssotCareer,
        matchedCareer.projects || []
      );
    } else {
      const result = await api.resumeCareer.add(resume_id, career);
      const newId = result?.data?.id || result?.id;
      if (newId) {
        await syncCareerProjects(api, resume_id, newId, ssotCareer, []);
      }
    }
  }

  const toDelete = remoteCareers.filter((rc) => !matches.includes(rc));
  for (const career of toDelete) {
    await api.resumeCareer.delete(resume_id, career.id);
  }
}
