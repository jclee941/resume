import { WANTED_ABOUT_LIMIT } from './constants.js';
import { normalizeText, truncateWantedAbout } from './text-formatting.js';

function composePersonalProjectSummary(project = {}) {
  const technologies = Array.isArray(project.technologies)
    ? project.technologies
        .map((item) => normalizeText(item))
        .filter(Boolean)
        .slice(0, 4)
        .join(', ')
    : '';
  const fallbackDescription = normalizeText(project.description).split('\n')[0]?.trim() || '';
  const summary = normalizeText(project.tagline) || fallbackDescription;
  const projectName = normalizeText(project.name);

  if (!projectName || !summary) {
    return '';
  }

  return `- ${projectName} (${technologies}): ${summary}`;
}

export function composeWantedAbout(sourceData = {}) {
  const manualAbout = normalizeText(sourceData.platformVariants?.wanted?.about);
  if (manualAbout) {
    return truncateWantedAbout(manualAbout);
  }

  const profileStatement = normalizeText(sourceData.summary?.profileStatement);
  const personalProjects = Array.isArray(sourceData.personalProjects)
    ? sourceData.personalProjects
        .map((project) => composePersonalProjectSummary(project))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (personalProjects.length === 0) {
    return profileStatement;
  }

  const sections = [];
  if (profileStatement) {
    sections.push(profileStatement);
  }
  sections.push('주요 개인 프로젝트:');

  let about = sections.join('\n\n');
  for (const projectLine of personalProjects) {
    const nextAbout = `${about}\n${projectLine}`;
    if (nextAbout.length <= WANTED_ABOUT_LIMIT) {
      about = nextAbout;
      continue;
    }

    const remaining = WANTED_ABOUT_LIMIT - about.length - 1;
    if (remaining <= 0) {
      return truncateWantedAbout(about);
    }

    if (remaining <= 3) {
      return `${about}${'.'.repeat(remaining)}`;
    }

    return `${about}\n${projectLine.slice(0, remaining - 3).trimEnd()}...`;
  }

  return about;
}

export async function syncAbout(api, resume_id, sourceData, currentAbout) {
  const nextAbout = composeWantedAbout(sourceData);
  if (!nextAbout) {
    return;
  }
  if (typeof nextAbout === 'string' && nextAbout !== (currentAbout || '')) {
    await api.resume.save(resume_id, { about: nextAbout });
  }
}
