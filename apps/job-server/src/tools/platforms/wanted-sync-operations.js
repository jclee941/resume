import { getTagTypeId, flattenSkills } from '../../../scripts/skill-tag-map.js';
import {
  JOB_CATEGORY_MAPPING,
  DEFAULT_JOB_CATEGORY,
} from '../../../scripts/profile-sync/constants.js';
import { parseDate } from '../utils.js';

export function mapToWantedFormat(source) {
  const currentPosition = source.current?.position || source.careers?.[0]?.role || '';
  const totalExperience = source.summary?.totalExperience || '';
  const expertise = source.summary?.expertise || [];

  const wantedVariant = source.platformVariants?.wanted || {};

  return {
    profile: {
      headline: (wantedVariant.headline || (currentPosition ? `${currentPosition} | ${totalExperience}` : totalExperience)).slice(0, 50),
      description: (wantedVariant.about || expertise.join(', ')).slice(0, 150),
    },
    careers: (source.careers || []).map((c) => {
      const [startStr, endStr] = (c.period || '').split(/~| - /).map((s) => s.trim());
      const start_time = parseDate(startStr);
      const end_time = endStr === '현재' || !endStr ? null : parseDate(endStr);
      const jobCategoryId = JOB_CATEGORY_MAPPING[c.role] || DEFAULT_JOB_CATEGORY;

      return {
        company: { name: c.company, type: 'CUSTOM' },
        job_role: c.role,
        job_category_id: jobCategoryId,
        start_time,
        end_time,
        served: end_time === null,
        employment_type: 'FULLTIME',
      };
    }),
    educations: [
      {
        school_name: source.education?.school,
        major: source.education?.major,
        degree: '학사',
        start_time: parseDate(source.education?.startDate),
        end_time:
          source.education?.status === '재학중' ? null : parseDate(source.education?.endDate),
        description:
          source.education?.status === '재학중'
            ? `재학중 (${source.education?.startDate || ''} ~ )`
            : null,
      },
    ],
    skills: flattenSkills(source.skills).slice(0, 20),
  };
}

export async function syncCareers(api, resume_id, localCareers, remoteCareers, ssotCareers) {
  const matchedIds = new Set();
  for (let i = 0; i < localCareers.length; i++) {
    const career = localCareers[i];
    const ssotCareer = ssotCareers[i] || {};
    const companyName = career.company?.name || career.company || '';
    const normalizedName = companyName.replace(/\(주\)/g, '').trim();
    const matchedCareer = remoteCareers.find((rc) =>
      (rc.company?.name || '').includes(normalizedName)
    );

    if (matchedCareer) {
      matchedIds.add(matchedCareer.id);
      await api.resumeCareer.update(resume_id, matchedCareer.id, career);
      for (const p of matchedCareer.projects || []) {
        await api.resumeCareer.deleteProject(resume_id, matchedCareer.id, p.id);
      }
      if (ssotCareer.project && ssotCareer.description) {
        await api.resumeCareer.addProject(resume_id, matchedCareer.id, {
          title: ssotCareer.project,
          description: ssotCareer.description,
        });
      }
    } else {
      const result = await api.resumeCareer.add(resume_id, career);
      const newId = result?.data?.id || result?.id;
      if (newId && ssotCareer.project && ssotCareer.description) {
        await api.resumeCareer.addProject(resume_id, newId, {
          title: ssotCareer.project,
          description: ssotCareer.description,
        });
      }
    }
  }

  const toDelete = remoteCareers.filter((rc) => !matchedIds.has(rc.id));
  for (const career of toDelete) {
    await api.resumeCareer.delete(resume_id, career.id);
  }
}

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

  const toDeleteActivities = remoteActivities.filter((ra) => !matchedActivityIds.has(ra.id));
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

export async function syncAbout(api, resume_id, sourceData, currentAbout) {
  const platformAbout = sourceData.platformVariants?.wanted?.about;
  const profileStatement = platformAbout || sourceData.summary?.profileStatement;
  if (typeof profileStatement === 'string' && profileStatement !== (currentAbout || '')) {
    await api.resume.save(resume_id, { about: profileStatement });
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
