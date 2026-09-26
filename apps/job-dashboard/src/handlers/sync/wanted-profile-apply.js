/**
 * @typedef {{
 *   updateCareer(resumeId: string, careerId: unknown, data: unknown): Promise<unknown>;
 *   deleteProject(resumeId: string, careerId: unknown, projectId: unknown): Promise<unknown>;
 *   addProject(resumeId: string, careerId: unknown, data: unknown): Promise<unknown>;
 *   addCareer(resumeId: string, data: unknown): Promise<{ data?: { id?: unknown }; id?: unknown }>;
 *   deleteCareer(resumeId: string, careerId: unknown): Promise<unknown>;
 *   updateEducation(resumeId: string, educationId: unknown, data: unknown): Promise<unknown>;
 *   addEducation(resumeId: string, data: unknown): Promise<unknown>;
 *   updateActivity(resumeId: string, activityId: unknown, data: unknown): Promise<unknown>;
 *   addActivity(resumeId: string, data: unknown): Promise<unknown>;
 *   deleteActivity(resumeId: string, activityId: unknown): Promise<unknown>;
 *   updateLanguageCert(resumeId: string, langId: unknown, data: unknown): Promise<unknown>;
 *   addLanguageCert(resumeId: string, data: unknown): Promise<unknown>;
 *   deleteLanguageCert(resumeId: string, langId: unknown): Promise<unknown>;
 *   updateProfile(data: { description: string }): Promise<unknown>;
 *   updateResumeFields(resumeId: string, updates: unknown): Promise<unknown>;
 *   saveResume(resumeId: string): Promise<unknown>;
 * }} WantedSyncClient
 *
 * @typedef {{
 *   id?: unknown;
 *   company?: unknown;
 *   data?: unknown;
 *   ssotCareer?: { project?: string; description?: string; [key: string]: unknown };
 *   existingProjects?: Array<{ id: unknown; [key: string]: unknown }>;
 * }} CareerUpdateItem
 *
 * @typedef {{
 *   toUpdate: CareerUpdateItem[];
 *   toAdd: CareerUpdateItem[];
 *   toDelete: Array<{ id: unknown; company: unknown }>;
 * }} CareerChanges
 *
 * @typedef {{
 *   toUpdate: Array<{ id: unknown; school: unknown; data: unknown }>;
 *   toAdd: Array<{ school: unknown; data: unknown }>;
 * }} EducationChanges
 *
 * @typedef {{
 *   toUpdate: Array<{ id: unknown; title: unknown; data: unknown }>;
 *   toAdd: Array<{ title: unknown; data: unknown }>;
 *   toDelete: Array<{ id: unknown; title: unknown }>;
 * }} ActivityChanges
 *
 * @typedef {{
 *   toUpdate: Array<{ id: unknown; name: unknown; data: unknown }>;
 *   toAdd: Array<{ name: unknown; data: unknown }>;
 *   toDelete: Array<{ id: unknown; name: unknown }>;
 * }} LanguageCertChanges
 *
 * @typedef {{
 *   updated: string[];
 *   failed: Array<{ section: string; error: string }>;
 * }} SyncResults
 *
 * @typedef {{
 *   profile: { changed: boolean; current?: unknown; proposed?: unknown };
 *   resumeFields: { updates: Record<string, unknown>; sections: string[] };
 *   careers: CareerChanges;
 *   educations: EducationChanges;
 *   activities: ActivityChanges;
 *   languageCerts: LanguageCertChanges;
 * }} WantedProfileChanges
 */

/**
 * @param {WantedSyncClient} client
 * @param {string} resumeId
 * @param {CareerChanges} careers
 * @param {SyncResults} syncResults
 * @returns {Promise<void>}
 */
async function applyCareerUpdates(client, resumeId, careers, syncResults) {
  for (const career of careers.toUpdate) {
    try {
      await client.updateCareer(resumeId, career.id, career.data);
      for (const p of career.existingProjects || []) {
        await client.deleteProject(resumeId, career.id, p.id);
      }
      if (career.ssotCareer?.project && career.ssotCareer?.description) {
        await client.addProject(resumeId, career.id, {
          title: career.ssotCareer.project,
          description: career.ssotCareer.description,
        });
      }
      syncResults.updated.push(`career:${career.company}`);
    } catch (error) {
      syncResults.failed.push({
        section: `career:${career.company}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const career of careers.toAdd) {
    try {
      const result = await client.addCareer(resumeId, career.data);
      const newCareerId = result?.data?.id || result?.id;
      if (newCareerId && career.ssotCareer?.project && career.ssotCareer?.description) {
        await client.addProject(resumeId, newCareerId, {
          title: career.ssotCareer.project,
          description: career.ssotCareer.description,
        });
      }
      syncResults.updated.push(`career:${career.company}`);
    } catch (error) {
      syncResults.failed.push({
        section: `career:${career.company}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const career of careers.toDelete) {
    try {
      await client.deleteCareer(resumeId, career.id);
      syncResults.updated.push(`career_deleted:${career.company}`);
    } catch (error) {
      syncResults.failed.push({
        section: `career_delete:${career.company}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {WantedSyncClient} client
 * @param {string} resumeId
 * @param {EducationChanges} educations
 * @param {SyncResults} syncResults
 * @returns {Promise<void>}
 */
async function applyEducationUpdates(client, resumeId, educations, syncResults) {
  for (const education of educations.toUpdate || []) {
    try {
      await client.updateEducation(resumeId, education.id, education.data);
      syncResults.updated.push(`education_updated:${education.school}`);
    } catch (error) {
      syncResults.failed.push({
        section: `education_update:${education.school}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const education of educations.toAdd) {
    try {
      await client.addEducation(resumeId, education.data);
      syncResults.updated.push(`education:${education.school}`);
    } catch (error) {
      syncResults.failed.push({
        section: `education:${education.school}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {WantedSyncClient} client
 * @param {string} resumeId
 * @param {ActivityChanges} activities
 * @param {SyncResults} syncResults
 * @returns {Promise<void>}
 */
async function applyActivityUpdates(client, resumeId, activities, syncResults) {
  for (const activity of activities.toUpdate || []) {
    try {
      await client.updateActivity(resumeId, activity.id, activity.data);
      syncResults.updated.push(`activity_updated:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({
        section: `activity_update:${activity.title}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const activity of activities.toAdd) {
    try {
      await client.addActivity(resumeId, activity.data);
      syncResults.updated.push(`activity:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({
        section: `activity:${activity.title}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const activity of activities.toDelete || []) {
    try {
      await client.deleteActivity(resumeId, activity.id);
      syncResults.updated.push(`activity_deleted:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({
        section: `activity_delete:${activity.title}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {WantedSyncClient} client
 * @param {string} resumeId
 * @param {LanguageCertChanges} languageCerts
 * @param {SyncResults} syncResults
 * @returns {Promise<void>}
 */
async function applyLanguageCertUpdates(client, resumeId, languageCerts, syncResults) {
  for (const lc of languageCerts?.toUpdate || []) {
    try {
      await client.updateLanguageCert(resumeId, lc.id, lc.data);
      syncResults.updated.push(`lang_updated:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({
        section: `lang_update:${lc.name}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const lc of languageCerts?.toAdd || []) {
    try {
      await client.addLanguageCert(resumeId, lc.data);
      syncResults.updated.push(`lang:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({
        section: `lang:${lc.name}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const lc of languageCerts?.toDelete || []) {
    try {
      await client.deleteLanguageCert(resumeId, lc.id);
      syncResults.updated.push(`lang_deleted:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({
        section: `lang_delete:${lc.name}`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * @param {WantedSyncClient} client
 * @param {string} resumeId
 * @param {WantedProfileChanges} changes
 * @param {{ headline: string, [key: string]: unknown }} profileData
 * @returns {Promise<SyncResults>}
 */
export async function applyWantedChanges(client, resumeId, changes, profileData) {
  /** @type {SyncResults} */
  const syncResults = { updated: [], failed: [] };

  if (changes.profile.changed) {
    try {
      await client.updateProfile({ description: profileData.headline });
      syncResults.updated.push('profile_headline');
    } catch (error) {
      syncResults.failed.push({
        section: 'profile_headline',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (Object.keys(changes.resumeFields.updates).length > 0) {
    try {
      await client.updateResumeFields(resumeId, changes.resumeFields.updates);
      syncResults.updated.push(...changes.resumeFields.sections);
    } catch (error) {
      syncResults.failed.push({
        section: 'resume_fields',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await applyCareerUpdates(client, resumeId, changes.careers, syncResults);
  await applyEducationUpdates(client, resumeId, changes.educations, syncResults);
  await applyActivityUpdates(client, resumeId, changes.activities, syncResults);
  await applyLanguageCertUpdates(client, resumeId, changes.languageCerts, syncResults);

  try {
    await client.saveResume(resumeId);
    syncResults.updated.push('resume_pdf');
  } catch (error) {
    syncResults.failed.push({
      section: 'resume_pdf',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return syncResults;
}
