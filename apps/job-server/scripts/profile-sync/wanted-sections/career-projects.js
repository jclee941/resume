import { log } from '../sync-logger.js';

/**
 * Sync career projects: delete existing, add SSoT project.
 * Career PATCH ignores the `projects` field — separate DELETE/POST required.
 */
export async function syncCareerProjects(client, resumeId, careerId, ssotCareer, existingProjects) {
  for (const p of existingProjects) {
    try {
      await client.deleteProject(resumeId, careerId, p.id);
    } catch (e) {
      log(`Failed to delete project ${p.id}: ${e.message}`, 'error', 'wanted');
    }
  }
  if (ssotCareer.project && ssotCareer.description) {
    try {
      await client.addProject(resumeId, careerId, {
        title: ssotCareer.project,
        description: ssotCareer.description,
      });
    } catch (e) {
      log(`Failed to add project for ${ssotCareer.company}: ${e.message}`, 'error', 'wanted');
    }
  }
}
