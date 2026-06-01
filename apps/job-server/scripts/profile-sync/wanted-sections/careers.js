import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { normalizeCompanyName } from '@resume/shared/normalize';
import { syncCareerProjects } from './career-projects.js';
import { mapCareerToWanted } from './field-mappings.js';

function planCareerSync(ssotCareers, wantedCareers) {
  const toUpdate = [];
  const toAdd = [];
  const matched = new Set();

  for (const ssotCareer of ssotCareers) {
    const ssotCompanyNormalized = normalizeCompanyName(ssotCareer.company);
    const wantedCareer = wantedCareers.find((w) =>
      (w.company?.name || '').includes(ssotCompanyNormalized)
    );
    const mapped = mapCareerToWanted(ssotCareer);
    if (wantedCareer) {
      matched.add(wantedCareer.id);
      toUpdate.push({
        id: wantedCareer.id,
        data: mapped,
        ssot: ssotCareer,
        existingProjects: wantedCareer.projects || [],
      });
    } else {
      toAdd.push({ data: mapped, ssot: ssotCareer });
    }
  }

  return { toUpdate, toAdd, toDelete: wantedCareers.filter((w) => !matched.has(w.id)) };
}

function reportCareerDiff(toUpdate, toAdd, toDelete) {
  for (const item of toUpdate) console.log(`  ~ ${item.ssot.company}: ${item.ssot.role}`);
  for (const item of toAdd) console.log(`  + ${item.ssot.company}: ${item.ssot.role}`);
  for (const career of toDelete)
    console.log(
      `  - ${career.company?.name || 'Unknown'}: ${career.job_role || 'Unknown'} (id: ${career.id})`
    );
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedCareers(client, ssot, profile, resumeId) {
  const ssotCareers = ssot.careers || [];
  const resumeDetail = await client.getResumeDetail(resumeId);
  const wantedCareers = resumeDetail?.careers || [];

  log(
    `Careers: SSOT has ${ssotCareers.length}, Wanted has ${wantedCareers.length}`,
    'info',
    'wanted'
  );

  const { toUpdate, toAdd, toDelete } = planCareerSync(ssotCareers, wantedCareers);
  log(
    `Careers: ${toUpdate.length} to override, ${toAdd.length} to add, ${toDelete.length} to delete`,
    'info',
    'wanted'
  );

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    reportCareerDiff(toUpdate, toAdd, toDelete);
    return {
      changes: toUpdate.length + toAdd.length + toDelete.length,
      updated: 0,
      added: 0,
      deleted: 0,
      dryRun: true,
    };
  }

  const updated = await updateCareers(client, resumeId, toUpdate);
  const added = await addCareers(client, resumeId, toAdd);
  const deleted = await deleteCareers(client, resumeId, toDelete);
  return { changes: updated + added + deleted, updated, added, deleted };
}

async function updateCareers(client, resumeId, toUpdate) {
  let updated = 0;
  for (const item of toUpdate) {
    try {
      await client.updateCareer(resumeId, item.id, item.data);
      await syncCareerProjects(client, resumeId, item.id, item.ssot, item.existingProjects);
      log(`Updated career: ${item.ssot.company}`, 'success', 'wanted');
      updated++;
    } catch (e) {
      log(`Failed to update ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }
  return updated;
}

async function addCareers(client, resumeId, toAdd) {
  let added = 0;
  for (const item of toAdd) {
    try {
      const result = await client.addCareer(resumeId, item.data);
      const newCareerId = result?.data?.id || result?.id;
      if (newCareerId) await syncCareerProjects(client, resumeId, newCareerId, item.ssot, []);
      log(`Added career: ${item.ssot.company}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }
  return added;
}

async function deleteCareers(client, resumeId, toDelete) {
  let deleted = 0;
  for (const career of toDelete) {
    try {
      await client.deleteCareer(resumeId, career.id);
      log(`Deleted career: ${career.company?.name || 'Unknown'}`, 'success', 'wanted');
      deleted++;
    } catch (e) {
      log(
        `Failed to delete career ${career.company?.name || 'Unknown'}: ${e.message}`,
        'error',
        'wanted'
      );
    }
  }
  return deleted;
}
