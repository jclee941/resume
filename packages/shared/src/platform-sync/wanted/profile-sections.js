import { getTagTypeId } from '../skill-tag-map.js';
import { parseDate } from '../date-parser.js';

import { isStrictSyncEnabled } from './strict-sync.js';

/**
 * @typedef {{
 *   add(resumeId: string | number, data: unknown): Promise<unknown>;
 *   update(resumeId: string | number, id: unknown, data: unknown): Promise<unknown>;
 *   delete?(resumeId: string | number, id: unknown): Promise<unknown>;
 * }} WantedSyncSubApi
 */

/**
 * @typedef {{
 *   resumeEducation: WantedSyncSubApi;
 *   resumeSkills: { add(resumeId: string | number, data: unknown): Promise<unknown> };
 *   resumeActivity: WantedSyncSubApi & { delete(resumeId: string | number, id: unknown): Promise<unknown> };
 *   resumeLanguageCert: WantedSyncSubApi & { delete(resumeId: string | number, id: unknown): Promise<unknown> };
 *   resume: { save(resumeId: string | number, data: unknown): Promise<unknown> };
 * }} WantedSyncApi
 */

/**
 * @typedef {Object} LocalEducationItem
 * @property {string} [school_name]
 * @property {string} [major]
 * @property {string} [degree]
 * @property {string | null} [start_time]
 * @property {string | null} [end_time]
 * @property {string | null} [description]
 */

/**
 * @typedef {Object} RemoteEducationItem
 * @property {unknown} id
 * @property {string} [school_name]
 */

/**
 * @param {WantedSyncApi} api
 * @param {string | number} resume_id
 * @param {LocalEducationItem[]} localEducations
 * @param {RemoteEducationItem[]} remoteEducations
 * @returns {Promise<void>}
 */
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

/**
 * @typedef {string | { name?: string; level?: string }} LocalSkillItem
 * @typedef {{ id?: unknown; name?: string; text?: string }} RemoteSkillItem
 */

/**
 * @param {WantedSyncApi} api
 * @param {string | number} resume_id
 * @param {LocalSkillItem[]} localSkills
 * @param {RemoteSkillItem[]} remoteSkills
 * @param {Pick<Console, 'warn'>} [injectedLogger]
 * @returns {Promise<void>}
 */
export async function syncSkills(
  api,
  resume_id,
  localSkills,
  remoteSkills,
  injectedLogger = console
) {
  for (const skill of localSkills) {
    const skillName = typeof skill === 'object' ? skill.name || '' : skill;
    const skillLevel = typeof skill === 'object' ? skill.level || '' : '';
    if (!skillName) continue;
    const skillExists = remoteSkills.some((rs) => rs.name === skillName || rs.text === skillName);
    if (!skillExists) {
      const tagTypeId = getTagTypeId(skillName);
      if (!tagTypeId) {
        injectedLogger.warn(`[skills] Skipping "${skillName}" - no matching Wanted tag_type_id`);
        continue;
      }
      /** @type {{ tag_type_id: number; text: string; level?: string }} */
      const payload = { tag_type_id: tagTypeId, text: skillName };
      if (skillLevel) {
        payload.level = skillLevel;
      }
      await api.resumeSkills.add(resume_id, payload);
    }
  }
}

/**
 * @typedef {Object} WantedCertification
 * @property {string} [date]
 * @property {string} [name]
 * @property {string} [issuer]
 * @property {string} [expirationDate]
 * @property {string} [credentialId]
 * @property {string} [credentialUrl]
 * @property {string} [status]
 * @property {string} [note]
 */

/**
 * @typedef {Object} WantedAward
 * @property {string} [name]
 * @property {string} [organization]
 * @property {string} [year]
 */

/**
 * @typedef {Object} RemoteActivityItem
 * @property {unknown} id
 * @property {string} [title]
 * @property {string} [activity_type]
 */

/**
 * @param {WantedSyncApi} api
 * @param {string | number} resume_id
 * @param {{ certifications?: WantedCertification[]; awards?: WantedAward[] }} sourceData
 * @param {RemoteActivityItem[]} remoteActivities
 * @returns {Promise<void>}
 */
export async function syncActivities(api, resume_id, sourceData, remoteActivities) {
  const strictSync = isStrictSyncEnabled();
  const certActivities = (sourceData.certifications || [])
    .filter((c) => c.date)
    .map((cert) => {
      const acquiredDate = /** @type {string} */ (cert.date).split(/\s*\(/)[0];
      return {
        title: cert.name,
        description: `${cert.issuer} | ${acquiredDate}`,
        activity_type: 'CERTIFICATE',
        start_time: parseDate(acquiredDate),
        expirationDate: cert.expirationDate || '',
        credentialId: cert.credentialId || '',
        credentialUrl: cert.credentialUrl || '',
        status: cert.status || '',
        note: cert.note || '',
      };
    });

  const awardActivities = (sourceData.awards || []).map((award) => ({
    title: award.name || '',
    description: `${award.organization || ''} | ${award.year || ''}`,
    activity_type: 'AWARD',
    start_time: award.year && /\./.test(award.year) ? parseDate(award.year) : null,
  }));

  const localActivities = [...certActivities, ...awardActivities];

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

    return ra.activity_type === 'CERTIFICATE' || ra.activity_type === 'AWARD';
  });
  for (const activity of toDeleteActivities) {
    await api.resumeActivity.delete(resume_id, activity.id);
  }
}

/**
 * @typedef {Object} WantedLanguageItem
 * @property {string} [name]
 * @property {string} [level]
 * @property {string} [note]
 */

/**
 * @typedef {Object} RemoteLanguageCertItem
 * @property {unknown} id
 * @property {string} [language_name]
 */

/**
 * @param {WantedSyncApi} api
 * @param {string | number} resume_id
 * @param {{ languages?: WantedLanguageItem[] }} sourceData
 * @param {RemoteLanguageCertItem[]} remoteLanguageCerts
 * @returns {Promise<void>}
 */
export async function syncLanguageCerts(api, resume_id, sourceData, remoteLanguageCerts) {
  const localLanguages = (sourceData.languages || []).map((lang) => ({
    language_name: lang.name,
    level: lang.level === 'Native' ? 5 : lang.level === 'Professional working proficiency' ? 4 : 3,
    note: lang.note || '',
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

/**
 * @typedef {Object} WantedPersonalData
 * @property {string} [email]
 * @property {string} [phone]
 */

/**
 * @typedef {Object} RemoteResumeContactDetail
 * @property {string} [email]
 * @property {string} [mobile]
 */

/**
 * @param {WantedSyncApi} api
 * @param {string | number} resume_id
 * @param {{ personal?: WantedPersonalData }} sourceData
 * @param {RemoteResumeContactDetail} resumeDetail
 * @returns {Promise<void>}
 */
export async function syncContact(api, resume_id, sourceData, resumeDetail) {
  const personal = sourceData.personal || {};
  /** @type {{ email?: string; mobile?: string }} */
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
