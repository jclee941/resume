import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

async function getSkillsDiff(ssot, profile) {
  const { flattenSkills, diffSkills } = await import('../../skill-tag-map.js');
  const ssotSkills = flattenSkills(ssot.skills);
  const wantedSkills = profile.skills || [];
  return diffSkills(ssotSkills, wantedSkills);
}

function reportSkillDiff(diff) {
  for (const skill of diff.toAdd) console.log(`  + ${skill.name} (tagTypeId: ${skill.tagTypeId})`);
  for (const skill of diff.toDelete) console.log(`  - ${skill.name} (id: ${skill.id})`);
}

/** @param {Object} api @param {Object} ssot @param {Object} profile @returns {Promise<Object>} */
export async function syncWantedSkills(api, ssot, profile) {
  const diff = await getSkillsDiff(ssot, profile);

  log(`Skills: ${diff.unchanged.length} unchanged, ${diff.toAdd.length} to add, ${diff.toDelete.length} to delete`, 'info', 'wanted');
  if (diff.unmapped.length > 0) {
    log(`Unmapped skills (no tagTypeId): ${diff.unmapped.join(', ')}`, 'warn', 'wanted');
  }

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    reportSkillDiff(diff);
    return { changes: diff.toAdd.length + diff.toDelete.length, added: 0, deleted: 0, dryRun: true };
  }

  const resumes = await api.getResumeList();
  const resumeId = resumes?.[0]?.key;
  if (!resumeId) {
    log('Could not get resumeId for skills sync', 'error', 'wanted');
    return { changes: 0, added: 0, deleted: 0 };
  }

  const added = await addSkills(api, resumeId, diff.toAdd);
  const deleted = await deleteSkills(api, resumeId, diff.toDelete);
  return { changes: added + deleted, added, deleted };
}

async function addSkills(api, resumeId, skills) {
  let added = 0;
  for (const skill of skills) {
    try {
      await api.resumeSkills.add(resumeId, { tag_type_id: skill.tagTypeId });
      log(`Added skill: ${skill.name}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }
  return added;
}

async function deleteSkills(api, resumeId, skills) {
  let deleted = 0;
  for (const skill of skills) {
    try {
      await api.resumeSkills.delete(resumeId, skill.id);
      log(`Deleted skill: ${skill.name}`, 'success', 'wanted');
      deleted++;
    } catch (e) {
      log(`Failed to delete ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }
  return deleted;
}
