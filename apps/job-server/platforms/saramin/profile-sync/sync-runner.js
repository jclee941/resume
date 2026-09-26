import { diffProfileSections } from '../../base-profile-sync.js';
import { SARAMIN_URLS } from './constants.js';

export async function syncProfile(sourceData, options = {}) {
  const { dry_run = false } = options;
  const results = { updated: [], skipped: [], errors: [] };

  if (!(await this.checkLogin())) {
    if (dry_run) {
      return { error: 'Not logged in', dry_run: true };
    }
    await this.waitForManualLogin();
  }

  await this.page.goto(SARAMIN_URLS.resumeEdit, {
    waitUntil: 'load',
  });

  const resumeLinks = await this.page
    .$$eval('a[href*="/zf_user/"], a[href*="resume"]', (links) => links.map((l) => l.href))
    .catch(() => []);

  if (resumeLinks.length === 0) {
    return { error: 'No resumes found. Please create one manually first.' };
  }

  if (dry_run) {
    const current = await this.getProfile().catch(() => ({ data: null }));
    const changes = current.data ? diffProfileSections(sourceData, current.data) : [];
    return {
      dry_run: true,
      resume_url: SARAMIN_URLS.resumeEdit,
      would_update: {
        personal: sourceData.personal,
        careers: sourceData.careers.length,
        education: sourceData.education,
        certifications: sourceData.certifications.length,
      },
      changes,
    };
  }

  const current = await this.getProfile().catch(() => ({ data: null }));
  const changes = current.data ? diffProfileSections(sourceData, current.data) : null;
  const changedSections = new Set(changes?.map((c) => c.section) ?? []);

  if (changes && changes.length === 0) {
    results.skipped.push('all');
    return results;
  }

  if (!changedSections.size || changedSections.has('personal')) {
    try {
      await this.fillPersonalInfo(sourceData.personal);
      results.updated.push('personal');
    } catch (e) {
      results.errors.push({ section: 'personal', error: e.message });
    }
  } else {
    results.skipped.push('personal');
  }

  if (!changedSections.size || changedSections.has('careers')) {
    try {
      await this.fillCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: e.message });
    }
  } else {
    results.skipped.push('careers');
  }

  if (!changedSections.size || changedSections.has('education')) {
    try {
      await this.fillEducation(sourceData.education);
      results.updated.push('education');
    } catch (e) {
      results.errors.push({ section: 'education', error: e.message });
    }
  } else {
    results.skipped.push('education');
  }

  if (!changedSections.size || changedSections.has('certifications')) {
    try {
      await this.fillCertifications(sourceData.certifications);
      results.updated.push('certifications');
    } catch (e) {
      results.errors.push({ section: 'certifications', error: e.message });
    }
  } else {
    results.skipped.push('certifications');
  }

  await this.saveResume();

  return results;
}
