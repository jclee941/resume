import { log } from '../sync-logger.js';

/**
 * @typedef {{
 *   name?: string;
 *   title?: string;
 *   description?: string;
 *   techStack?: string[];
 *   achievements?: string[];
 * }} SsotCareerProject
 */

/**
 * @typedef {{
 *   company?: string;
 *   project?: string;
 *   description?: string;
 *   projects?: SsotCareerProject[];
 * }} SsotCareer
 */

/**
 * @typedef {{
 *   id?: string | number;
 *   title: string;
 *   description?: string | null;
 * }} ExistingWantedProject
 */

/**
 * @typedef {{
 *   deleteProject(resumeId: string | number, careerId: string | number, projectId: string | number | undefined): Promise<unknown>;
 *   addProject(resumeId: string | number, careerId: string | number, project: { title: string; description: string }): Promise<unknown>;
 * }} WantedClient
 */

/**
 * Map a structured SSoT career project to the Wanted project payload.
 * Falls back to the career-level project/description when no structured
 * projects[] array is present.
 * @param {SsotCareerProject} p - SSoT career project entry
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
 * @param {SsotCareer} ssotCareer
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
 * @param {WantedClient} client
 * @param {string | number} resumeId
 * @param {string | number} careerId
 * @param {SsotCareer} ssotCareer
 * @param {ExistingWantedProject[] | null | undefined} existingProjects
 * @returns {Promise<void>}
 */
export async function syncCareerProjects(client, resumeId, careerId, ssotCareer, existingProjects) {
  const desired = collectCareerProjects(ssotCareer);
  const existing = Array.isArray(existingProjects) ? existingProjects : [];
  const desiredByTitle = new Map(desired.map((p) => [p.title, p]));
  const unchangedTitles = new Set(
    existing
      .filter((p) => {
        const desiredProject = desiredByTitle.get(p.title);
        return desiredProject && String(p.description ?? '') === desiredProject.description;
      })
      .map((p) => p.title)
  );

  // Delete remote projects that are no longer represented in the SSoT, or whose
  // persisted description differs from the SSoT. Wanted has POST/DELETE for
  // projects but no PATCH wrapper in the current client.
  for (const p of existing) {
    const desiredProject = desiredByTitle.get(p.title);
    if (desiredProject && String(p.description ?? '') === desiredProject.description) continue;
    try {
      await client.deleteProject(resumeId, careerId, p.id);
    } catch (e) {
      log(
        `Failed to delete project ${p.id}: ${e instanceof Error ? e.message : String(e)}`,
        'error',
        'wanted'
      );
    }
  }

  // Add SSoT projects that are not already present remotely.
  for (const project of desired) {
    if (unchangedTitles.has(project.title)) continue;
    try {
      await client.addProject(resumeId, careerId, project);
    } catch (e) {
      log(
        `Failed to add project "${project.title}" for ${ssotCareer.company}: ${e instanceof Error ? e.message : String(e)}`,
        'error',
        'wanted'
      );
    }
  }
}
