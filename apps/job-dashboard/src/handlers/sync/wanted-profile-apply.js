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
      syncResults.failed.push({ section: `career:${career.company}`, error: error.message });
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
      syncResults.failed.push({ section: `career:${career.company}`, error: error.message });
    }
  }

  for (const career of careers.toDelete) {
    try {
      await client.deleteCareer(resumeId, career.id);
      syncResults.updated.push(`career_deleted:${career.company}`);
    } catch (error) {
      syncResults.failed.push({
        section: `career_delete:${career.company}`,
        error: error.message,
      });
    }
  }
}

async function applyEducationUpdates(client, resumeId, educations, syncResults) {
  for (const education of educations.toUpdate || []) {
    try {
      await client.updateEducation(resumeId, education.id, education.data);
      syncResults.updated.push(`education_updated:${education.school}`);
    } catch (error) {
      syncResults.failed.push({
        section: `education_update:${education.school}`,
        error: error.message,
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
        error: error.message,
      });
    }
  }
}

async function applyActivityUpdates(client, resumeId, activities, syncResults) {
  for (const activity of activities.toUpdate || []) {
    try {
      await client.updateActivity(resumeId, activity.id, activity.data);
      syncResults.updated.push(`activity_updated:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({
        section: `activity_update:${activity.title}`,
        error: error.message,
      });
    }
  }

  for (const activity of activities.toAdd) {
    try {
      await client.addActivity(resumeId, activity.data);
      syncResults.updated.push(`activity:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({ section: `activity:${activity.title}`, error: error.message });
    }
  }

  for (const activity of activities.toDelete || []) {
    try {
      await client.deleteActivity(resumeId, activity.id);
      syncResults.updated.push(`activity_deleted:${activity.title}`);
    } catch (error) {
      syncResults.failed.push({
        section: `activity_delete:${activity.title}`,
        error: error.message,
      });
    }
  }
}

async function applyLanguageCertUpdates(client, resumeId, languageCerts, syncResults) {
  for (const lc of languageCerts?.toUpdate || []) {
    try {
      await client.updateLanguageCert(resumeId, lc.id, lc.data);
      syncResults.updated.push(`lang_updated:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({ section: `lang_update:${lc.name}`, error: error.message });
    }
  }

  for (const lc of languageCerts?.toAdd || []) {
    try {
      await client.addLanguageCert(resumeId, lc.data);
      syncResults.updated.push(`lang:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({ section: `lang:${lc.name}`, error: error.message });
    }
  }

  for (const lc of languageCerts?.toDelete || []) {
    try {
      await client.deleteLanguageCert(resumeId, lc.id);
      syncResults.updated.push(`lang_deleted:${lc.name}`);
    } catch (error) {
      syncResults.failed.push({ section: `lang_delete:${lc.name}`, error: error.message });
    }
  }
}

export async function applyWantedChanges(client, resumeId, changes, profileData) {
  const syncResults = { updated: [], failed: [] };

  if (changes.profile.changed) {
    try {
      await client.updateProfile({ description: profileData.headline });
      syncResults.updated.push('profile_headline');
    } catch (error) {
      syncResults.failed.push({ section: 'profile_headline', error: error.message });
    }
  }

  if (Object.keys(changes.resumeFields.updates).length > 0) {
    try {
      await client.updateResumeFields(resumeId, changes.resumeFields.updates);
      syncResults.updated.push(...changes.resumeFields.sections);
    } catch (error) {
      syncResults.failed.push({ section: 'resume_fields', error: error.message });
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
    syncResults.failed.push({ section: 'resume_pdf', error: error.message });
  }

  return syncResults;
}
