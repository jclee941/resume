import { diffProfileSections } from './base-profile-sync.js';

export async function executeProfileSync(instance, sourceData, options = {}) {
  const { dry_run = false } = options;
  const results = { updated: [], skipped: [], errors: [] };

  if (!(await instance.checkLogin())) {
    if (dry_run) {
      return { error: 'Not logged in', dry_run: true };
    }
    await instance.waitForManualLogin();
  }

  if (dry_run) {
    const current = await instance.getProfile().catch(() => ({ data: null }));
    const changes = current.data ? diffProfileSections(sourceData, current.data) : [];
    return {
      dry_run: true,
      would_update: {
        personal: sourceData.personal,
        careers: sourceData.careers?.length ?? 0,
        education: sourceData.education,
        certifications: sourceData.certifications?.length ?? 0,
      },
      changes,
    };
  }

  const current = await instance.getProfile().catch(() => ({ data: null }));
  const changes = current.data ? diffProfileSections(sourceData, current.data) : null;
  const changedSections = new Set(changes?.map((c) => c.section) ?? []);

  if (changes && changes.length === 0) {
    results.skipped.push('all');
    return results;
  }

  if (!changedSections.size || changedSections.has('personal')) {
    try {
      await instance.fillPersonalInfo(sourceData.personal);
      results.updated.push('personal');
    } catch (e) {
      results.errors.push({ section: 'personal', error: e.message });
    }
  } else {
    results.skipped.push('personal');
  }

  if (!changedSections.size || changedSections.has('careers')) {
    try {
      await instance.fillCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: e.message });
    }
  } else {
    results.skipped.push('careers');
  }

  if (!changedSections.size || changedSections.has('education')) {
    try {
      await instance.fillEducation(sourceData.education);
      results.updated.push('education');
    } catch (e) {
      results.errors.push({ section: 'education', error: e.message });
    }
  } else {
    results.skipped.push('education');
  }

  if (!changedSections.size || changedSections.has('certifications')) {
    try {
      await instance.fillCertifications(sourceData.certifications);
      results.updated.push('certifications');
    } catch (e) {
      results.errors.push({ section: 'certifications', error: e.message });
    }
  } else {
    results.skipped.push('certifications');
  }

  await instance.saveProfile();
  return results;
}
