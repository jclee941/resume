import { normalizePhone } from '@resume/shared/phone';
import {
  mapCareerToWanted,
  mapCertificationToWanted,
  mapEducationToWanted,
} from '../mappers/index.js';

export function buildWantedChanges(ssotData, profileData, currentResume) {
  const currentCareers = currentResume?.careers || [];
  const currentEducations = currentResume?.educations || [];
  const currentActivities = currentResume?.activities || [];
  const about = ssotData.summary?.profileStatement || '';
  const updates = {};
  const sections = [];

  if (about && about !== (currentResume?.about || '')) {
    updates.about = about;
    sections.push('about');
  }

  if (ssotData.personal?.email && ssotData.personal.email !== currentResume?.email) {
    updates.email = ssotData.personal.email;
    sections.push('email');
  }

  const mobile = normalizePhone(ssotData.personal?.phone);
  if (mobile && mobile !== currentResume?.mobile) {
    updates.mobile = mobile;
    sections.push('mobile');
  }

  const careerChanges = { toUpdate: [], toAdd: [], toDelete: [] };
  for (const career of ssotData.careers || []) {
    const normalizedCompany = String(career.company || '')
      .replace(/\(주\)/g, '')
      .trim();
    const existing = currentCareers.find((item) =>
      String(item.company?.name || item.company_name || '').includes(normalizedCompany)
    );
    const mapped = mapCareerToWanted(career);
    if (existing) {
      careerChanges.toUpdate.push({
        id: existing.id,
        company: career.company,
        data: mapped,
        ssotCareer: career,
        existingProjects: existing.projects || [],
      });
    } else {
      careerChanges.toAdd.push({ company: career.company, data: mapped, ssotCareer: career });
    }
  }

  const matchedIds = new Set(careerChanges.toUpdate.map((c) => c.id));
  for (const existing of currentCareers) {
    if (!matchedIds.has(existing.id)) {
      careerChanges.toDelete.push({
        id: existing.id,
        company: existing.company?.name || existing.company_name || 'unknown',
      });
    }
  }

  const educationChanges = { toUpdate: [], toAdd: [] };
  if (ssotData.education?.school) {
    const mapped = mapEducationToWanted(ssotData.education);
    const existingEdu = currentEducations.find((item) =>
      String(item.name || item.school_name || '').includes(ssotData.education.school)
    );
    if (existingEdu) {
      educationChanges.toUpdate.push({
        id: existingEdu.id,
        school: ssotData.education.school,
        data: mapped,
      });
    } else {
      educationChanges.toAdd.push({ school: ssotData.education.school, data: mapped });
    }
  }

  const activityChanges = { toUpdate: [], toAdd: [], toDelete: [] };
  const matchedActivityIds = new Set();
  for (const certification of (ssotData.certifications || []).filter(
    (c) => c.date && c.status !== '준비중'
  )) {
    const mapped = mapCertificationToWanted(certification);
    const existing = currentActivities.find((item) =>
      String(item.title || '').includes(certification.name || '')
    );
    if (existing) {
      matchedActivityIds.add(existing.id);
      activityChanges.toUpdate.push({ id: existing.id, title: certification.name, data: mapped });
    } else {
      activityChanges.toAdd.push({ title: certification.name, data: mapped });
    }
  }

  for (const activity of currentActivities.filter((a) => a.activity_type === 'CERTIFICATE')) {
    if (!matchedActivityIds.has(activity.id)) {
      activityChanges.toDelete.push({ id: activity.id, title: activity.title || 'unknown' });
    }
  }

  const languageCertChanges = { toUpdate: [], toAdd: [], toDelete: [] };
  const matchedLangIds = new Set();
  for (const lang of ssotData.languages || []) {
    const mapped = {
      language_name: lang.name,
      level:
        lang.level === 'Native' ? 5 : lang.level === 'Professional working proficiency' ? 4 : 3,
    };
    const existing = (currentResume?.language_certs || []).find(
      (rl) => rl.language_name === lang.name
    );
    if (existing) {
      matchedLangIds.add(existing.id);
      languageCertChanges.toUpdate.push({ id: existing.id, name: lang.name, data: mapped });
    } else {
      languageCertChanges.toAdd.push({ name: lang.name, data: mapped });
    }
  }

  for (const rl of currentResume?.language_certs || []) {
    if (!matchedLangIds.has(rl.id)) {
      languageCertChanges.toDelete.push({ id: rl.id, name: rl.language_name || 'unknown' });
    }
  }

  return {
    profile: {
      changed: profileData.headline !== '',
      current: null,
      proposed: profileData.headline,
    },
    resumeFields: {
      updates,
      sections,
    },
    careers: careerChanges,
    educations: educationChanges,
    activities: activityChanges,
    languageCerts: languageCertChanges,
  };
}
