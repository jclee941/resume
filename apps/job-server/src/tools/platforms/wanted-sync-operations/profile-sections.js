import { getTagTypeId } from '../../../../scripts/skill-tag-map.js';
import { parseDate } from '../../date-parser.js';

import { isStrictSyncEnabled } from './strict-sync.js';

export async function syncEducations(api, resume_id, localEducations, remoteEducations) {
  for (const edu of localEducations) {
    const matchedEdu = remoteEducations.find((re) => re.school_name === edu.school_name);
    if (matchedEdu) {
      await api.resumeEducation.update(resume_id, matchedEdu.id, edu);
    } else {
      await api.resumeEducation.add(resume_id, edu);
    }
  }
}

export async function syncSkills(
  api,
  resume_id,
  localSkills,
  remoteSkills,
  injectedLogger = console
) {
  for (const skillName of localSkills) {
    const skillExists = remoteSkills.some((rs) => rs.name === skillName || rs.text === skillName);
    if (!skillExists) {
      const tagTypeId = getTagTypeId(skillName);
      if (!tagTypeId) {
        injectedLogger.warn(`[skills] Skipping "${skillName}" - no matching Wanted tag_type_id`);
        continue;
      }
      await api.resumeSkills.add(resume_id, { tag_type_id: tagTypeId, text: skillName });
    }
  }
}

export async function syncActivities(api, resume_id, sourceData, remoteActivities) {
  const strictSync = isStrictSyncEnabled();
  const localActivities = (sourceData.certifications || [])
    .filter((c) => c.date)
    .map((cert) => {
      const acquiredDate = cert.date.split(/\s*\(/)[0];
      return {
        title: cert.name,
        description: `${cert.issuer} | ${acquiredDate}`,
        activity_type: 'CERTIFICATE',
        start_time: parseDate(acquiredDate),
      };
    });

  const matchedActivityIds = new Set();
  for (const activity of localActivities) {
    const matchedActivity = remoteActivities.find((ra) => ra.title === activity.title);
    if (matchedActivity) {
      matchedActivityIds.add(matchedActivity.id);
      await api.resumeActivity.update(resume_id, matchedActivity.id, activity);
    } else {
      const anyMatch = remoteActivities.some((ra) => ra.title === activity.title);
      if (!anyMatch) {
        await api.resumeActivity.add(resume_id, activity);
      }
    }
  }

  const toDeleteActivities = remoteActivities.filter((ra) => {
    if (matchedActivityIds.has(ra.id)) {
      return false;
    }

    if (strictSync) {
      return true;
    }

    return ra.activity_type === 'CERTIFICATE';
  });
  for (const activity of toDeleteActivities) {
    await api.resumeActivity.delete(resume_id, activity.id);
  }
}

export async function syncLanguageCerts(api, resume_id, sourceData, remoteLanguageCerts) {
  const localLanguages = (sourceData.languages || []).map((lang) => ({
    language_name: lang.name,
    level: lang.level === 'Native' ? 5 : lang.level === 'Professional working proficiency' ? 4 : 3,
  }));

  const matchedLangIds = new Set();
  for (const lang of localLanguages) {
    const matchedLang = remoteLanguageCerts.find((rl) => rl.language_name === lang.language_name);
    if (matchedLang) {
      matchedLangIds.add(matchedLang.id);
      await api.resumeLanguageCert.update(resume_id, matchedLang.id, lang);
    } else {
      await api.resumeLanguageCert.add(resume_id, lang);
    }
  }

  const toDeleteLangs = remoteLanguageCerts.filter((rl) => !matchedLangIds.has(rl.id));
  for (const lang of toDeleteLangs) {
    await api.resumeLanguageCert.delete(resume_id, lang.id);
  }
}

export async function syncContact(api, resume_id, sourceData, resumeDetail) {
  const personal = sourceData.personal || {};
  const contactPayload = {};
  if (personal.email && personal.email !== resumeDetail.email) {
    contactPayload.email = personal.email;
  }
  if (personal.phone && personal.phone !== resumeDetail.mobile) {
    contactPayload.mobile = personal.phone;
  }
  if (Object.keys(contactPayload).length > 0) {
    await api.resume.save(resume_id, contactPayload);
  }
}
