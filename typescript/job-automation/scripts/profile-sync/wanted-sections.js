import { CONFIG, JOB_CATEGORY_MAPPING, DEFAULT_JOB_CATEGORY } from './constants.js';
import { log, parsePeriod, normalizePhone } from './utils.js';

/** @param {Object} career @returns {Object} Wanted career format */
export function mapCareerToWanted(career) {
  const { startsAt, endsAt } = parsePeriod(career.period);
  const jobCategoryId = JOB_CATEGORY_MAPPING[career.role] || DEFAULT_JOB_CATEGORY;
  if (!JOB_CATEGORY_MAPPING[career.role]) {
    log(`Unknown role "${career.role}" - using default category ${DEFAULT_JOB_CATEGORY}`, 'warn', 'wanted');
  }
  return {
    company: { name: career.company, type: 'CUSTOM' },
    job_role: career.role,
    job_category_id: jobCategoryId,
    start_time: startsAt,
    end_time: endsAt,
    served: endsAt === null,
    employment_type: 'FULLTIME',
    projects: [{ title: career.project, description: career.description }],
  };
}

/** @param {Object} api @param {Object} ssot @param {Object} profile @returns {Promise<Object>} */
export async function syncWantedSkills(api, ssot, profile) {
  const { flattenSkills, diffSkills } = await import('../skill-tag-map.js');
  const ssotSkills = flattenSkills(ssot.skills);
  const wantedSkills = profile.skills || [];
  const diff = diffSkills(ssotSkills, wantedSkills);

  log(`Skills: ${diff.unchanged.length} unchanged, ${diff.toAdd.length} to add, ${diff.toDelete.length} to delete`, 'info', 'wanted');
  if (diff.unmapped.length > 0) {
    log(`Unmapped skills (no tagTypeId): ${diff.unmapped.join(', ')}`, 'warn', 'wanted');
  }

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const skill of diff.toAdd) console.log(`  + ${skill.name} (tagTypeId: ${skill.tagTypeId})`);
    for (const skill of diff.toDelete) console.log(`  - ${skill.name} (id: ${skill.id})`);
    return { changes: diff.toAdd.length + diff.toDelete.length, added: 0, deleted: 0, dryRun: true };
  }

  const resumes = await api.getResumeList();
  const resumeId = resumes?.[0]?.key;
  if (!resumeId) {
    log('Could not get resumeId for skills sync', 'error', 'wanted');
    return { changes: 0, added: 0, deleted: 0 };
  }

  let added = 0;
  for (const skill of diff.toAdd) {
    try {
      await api.resumeSkills.add(resumeId, { tag_type_id: skill.tagTypeId });
      log(`Added skill: ${skill.name}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }

  let deleted = 0;
  for (const skill of diff.toDelete) {
    try {
      await api.resumeSkills.delete(resumeId, skill.id);
      log(`Deleted skill: ${skill.name}`, 'success', 'wanted');
      deleted++;
    } catch (e) {
      log(`Failed to delete ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }
  return { changes: added + deleted, added, deleted };
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedCareers(client, ssot, profile, resumeId) {
  const ssotCareers = ssot.careers || [];
  const resumeDetail = await client.getResumeDetail(resumeId);
  const wantedCareers = resumeDetail?.careers || [];

  log(`Careers: SSOT has ${ssotCareers.length}, Wanted has ${wantedCareers.length}`, 'info', 'wanted');

  const toUpdate = [];
  const toAdd = [];
  const matched = new Set();

  for (const ssotCareer of ssotCareers) {
    const ssotCompanyNormalized = ssotCareer.company.replace(/\(주\)/g, '').trim();
    const wantedCareer = wantedCareers.find((w) => {
      return (w.company?.name || '').includes(ssotCompanyNormalized);
    });
    const mapped = mapCareerToWanted(ssotCareer);
    if (wantedCareer) {
      matched.add(wantedCareer.id);
      toUpdate.push({ id: wantedCareer.id, data: mapped, ssot: ssotCareer });
    } else {
      toAdd.push({ data: mapped, ssot: ssotCareer });
    }
  }

  log(`Careers: ${toUpdate.length} to override, ${toAdd.length} to add`, 'info', 'wanted');

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const item of toUpdate) console.log(`  ~ ${item.ssot.company}: ${item.ssot.role}`);
    for (const item of toAdd) console.log(`  + ${item.ssot.company}: ${item.ssot.role}`);
    return { changes: toUpdate.length + toAdd.length, updated: 0, added: 0, dryRun: true };
  }

  let updated = 0;
  for (const item of toUpdate) {
    try {
      await client.updateCareer(resumeId, item.id, item.data);
      log(`Updated career: ${item.ssot.company}`, 'success', 'wanted');
      updated++;
    } catch (e) {
      log(`Failed to update ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }

  let added = 0;
  for (const item of toAdd) {
    try {
      await client.addCareer(resumeId, item.data);
      log(`Added career: ${item.ssot.company}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }
  return { changes: updated + added, updated, added };
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedEducations(client, ssot, profile, resumeId) {
  const ssotEducation = ssot.education;
  const wantedEducations = profile.educations || [];

  log(`Education: SSOT has 1, Wanted has ${wantedEducations.length}`, 'info', 'wanted');
  const wantedEdu = wantedEducations.find((w) => w.name && w.name.includes(ssotEducation.school));

  const ssotData = {
    school_name: ssotEducation.school,
    major: ssotEducation.major,
    start_time: ssotEducation.startDate.replace('.', '-') + '-01',
    end_time: null,
    degree: '학사',
  };

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    if (wantedEdu) console.log(`  = ${ssotEducation.school} (already exists)`);
    else console.log(`  + ${ssotEducation.school}: ${ssotEducation.major}`);
    return { changes: wantedEdu ? 0 : 1, updated: 0, added: 0, dryRun: true };
  }
  if (wantedEdu) return { changes: 0, updated: 0, added: 0 };

  try {
    await client.addEducation(resumeId, ssotData);
    log(`Added education: ${ssotEducation.school}`, 'success', 'wanted');
    return { changes: 1, updated: 0, added: 1 };
  } catch (e) {
    log(`Failed to add education: ${e.message}`, 'error', 'wanted');
    return { changes: 0, updated: 0, added: 0 };
  }
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedActivities(client, ssot, profile, resumeId) {
  const ssotCerts = ssot.certifications || [];
  const wantedActivities = profile.activities || [];

  log(`Activities: SSOT has ${ssotCerts.length} certs, Wanted has ${wantedActivities.length}`, 'info', 'wanted');

  const toAdd = [];
  const matched = new Set();

  for (const cert of ssotCerts) {
    const existing = wantedActivities.find((w) => w.title && w.title.includes(cert.name));
    if (existing) matched.add(existing.id);
    else toAdd.push({
      data: {
        title: cert.name,
        description: `${cert.issuer} | ${cert.date}`,
        start_time: cert.date.replace('.', '-') + '-01',
        activity_type: 'CERTIFICATE',
      },
      cert,
    });
  }

  log(`Activities: ${matched.size} matched, ${toAdd.length} to add`, 'info', 'wanted');

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const item of toAdd) console.log(`  + ${item.cert.name} (${item.cert.issuer})`);
    return { changes: toAdd.length, added: 0, dryRun: true };
  }

  let added = 0;
  for (const item of toAdd) {
    try {
      await client.addActivity(resumeId, item.data);
      log(`Added activity: ${item.cert.name}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.cert.name}: ${e.message}`, 'error', 'wanted');
    }
  }
  return { changes: added, added };
}

/** @param {Object} client @param {Object} ssot @param {Object} resumeDetail @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedAbout(client, ssot, resumeDetail, resumeId) {
  const ssotAbout = ssot.summary?.profileStatement || '';
  const wantedAbout = resumeDetail?.about || '';

  if (ssotAbout === wantedAbout) {
    log('About: no changes', 'info', 'wanted');
    return { changes: 0 };
  }

  log(`About: "${wantedAbout.slice(0, 30)}..." -> "${ssotAbout.slice(0, 30)}..."`, 'diff', 'wanted');
  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) return { changes: 1, dryRun: true };

  try {
    await client.updateResumeFields(resumeId, { about: ssotAbout });
    log('Updated about field', 'success', 'wanted');
    return { changes: 1, updated: 1 };
  } catch (e) {
    log(`Failed to update about: ${e.message}`, 'error', 'wanted');
    return { changes: 0 };
  }
}

/** @param {Object} client @param {Object} ssot @param {Object} resumeDetail @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedContactInfo(client, ssot, resumeDetail, resumeId) {
  const updates = {};
  const changes = [];

  if (ssot.personal?.email && ssot.personal.email !== resumeDetail?.email) {
    updates.email = ssot.personal.email;
    changes.push({ field: 'email', from: resumeDetail?.email, to: ssot.personal.email });
  }

  const normalizedPhoneVal = normalizePhone(ssot.personal?.phone);
  if (normalizedPhoneVal && normalizedPhoneVal !== resumeDetail?.mobile) {
    updates.mobile = normalizedPhoneVal;
    changes.push({ field: 'mobile', from: resumeDetail?.mobile, to: normalizedPhoneVal });
  }

  if (changes.length === 0) {
    log('Contact: no changes', 'info', 'wanted');
    return { changes: 0 };
  }

  for (const c of changes) log(`${c.field}: "${c.from}" -> "${c.to}"`, 'diff', 'wanted');
  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) return { changes: changes.length, dryRun: true };

  try {
    await client.updateResumeFields(resumeId, updates);
    log(`Updated ${Object.keys(updates).join(', ')}`, 'success', 'wanted');
    return { changes: changes.length, updated: changes.length };
  } catch (e) {
    log(`Failed to update contact: ${e.message}`, 'error', 'wanted');
    return { changes: 0 };
  }
}
