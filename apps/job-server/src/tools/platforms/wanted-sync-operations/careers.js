import { normalizeCompanyName } from '@resume/shared/normalize';

import { isStrictSyncEnabled } from './strict-sync.js';
import { normalizeText, truncateWantedProjectDescription } from './text-formatting.js';

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

function normalizeCareerProjects(ssotCareer = {}) {
  if (Array.isArray(ssotCareer.projects)) {
    return ssotCareer.projects
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
      .filter(Boolean);
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

async function syncCareerProjects(api, resume_id, careerId, ssotCareer = {}, remoteProjects = []) {
  const strictSync = isStrictSyncEnabled();
  const localProjects = normalizeCareerProjects(ssotCareer);
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

export async function syncCareers(api, resume_id, localCareers, remoteCareers, ssotCareers) {
  const matchedIds = new Set();
  for (let i = 0; i < localCareers.length; i++) {
    const career = localCareers[i];
    const ssotCareer = ssotCareers[i] || {};
    const companyName = career.company?.name || career.company || '';
    const normalizedName = normalizeCompanyName(companyName);
    const matchedCareer = remoteCareers.find(
      (rc) => normalizeCompanyName(rc.company?.name || rc.company_name) === normalizedName
    );

    if (matchedCareer) {
      matchedIds.add(matchedCareer.id);
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

  const toDelete = remoteCareers.filter((rc) => !matchedIds.has(rc.id));
  for (const career of toDelete) {
    await api.resumeCareer.delete(resume_id, career.id);
  }
}
