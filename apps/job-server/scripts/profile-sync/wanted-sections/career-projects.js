import { log } from '../sync-logger.js';

/**
 * Map a structured SSoT career project to the Wanted project payload.
 * Falls back to the career-level project/description when no structured
 * projects[] array is present.
 * @param {Object} p - SSoT career project entry
 * @returns {{title: string, description: string}}
 */
function mapProject(p) {
  const techLine =
    Array.isArray(p.techStack) && p.techStack.length > 0
      ? `\n\nTech: ${p.techStack.join(', ')}`
      : '';
  const achievementsLine =
    Array.isArray(p.achievements) && p.achievements.length > 0
      ? `\n\n${p.achievements.map((a) => `- ${a}`).join('\n')}`
      : '';
  return {
    title: p.name || p.title || '',
    description: `${p.description || ''}${techLine}${achievementsLine}`.trim(),
  };
}

/**
 * Collect the SSoT projects for a career. Prefers the structured
 * careers[].projects[] array; falls back to the single career-level
 * project/description pair for older SSoT entries.
 * @param {Object} ssotCareer
 * @returns {Array<{title: string, description: string}>}
 */
export function collectCareerProjects(ssotCareer) {
  if (Array.isArray(ssotCareer.projects) && ssotCareer.projects.length > 0) {
    return ssotCareer.projects.map(mapProject).filter((p) => p.title);
  }
  if (ssotCareer.project && ssotCareer.description) {
    return [{ title: ssotCareer.project, description: ssotCareer.description }];
  }
  return [];
}

/**
 * Sync career projects non-destructively: add SSoT projects not already on
 * Wanted (matched by title) and delete only remote projects that are no
 * longer in the SSoT. Career PATCH ignores the `projects` field, so per-item
 * DELETE/POST is required.
 */
export async function syncCareerProjects(client, resumeId, careerId, ssotCareer, existingProjects) {
  const desired = collectCareerProjects(ssotCareer);
  const desiredTitles = new Set(desired.map((p) => p.title));
  const existing = Array.isArray(existingProjects) ? existingProjects : [];
  const existingTitles = new Set(existing.map((p) => p.title));

  // Delete only remote projects that are no longer represented in the SSoT.
  for (const p of existing) {
    if (desiredTitles.has(p.title)) continue;
    try {
      await client.deleteProject(resumeId, careerId, p.id);
    } catch (e) {
      log(`Failed to delete project ${p.id}: ${e.message}`, 'error', 'wanted');
    }
  }

  // Add SSoT projects that are not already present remotely.
  for (const project of desired) {
    if (existingTitles.has(project.title)) continue;
    try {
      await client.addProject(resumeId, careerId, project);
    } catch (e) {
      log(`Failed to add project "${project.title}" for ${ssotCareer.company}: ${e.message}`, 'error', 'wanted');
    }
  }
}
