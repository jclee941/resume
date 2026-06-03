import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { normalizePhone } from '@resume/shared/phone';

function collectContactUpdates(ssot, resumeDetail) {
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

  // Profile links: map the SSoT contact URLs that Wanted supports.
  const LINK_FIELDS = [
    ['linkedin', ssot.contact?.linkedin],
    ['website', ssot.contact?.website],
    ['blog', ssot.contact?.velog],
    ['github', ssot.contact?.github || ssot.personal?.github],
  ];
  for (const [field, value] of LINK_FIELDS) {
    if (value && value !== resumeDetail?.[field]) {
      updates[field] = value;
      changes.push({ field, from: resumeDetail?.[field], to: value });
    }
  }

  return { updates, changes };
}

/** @param {Object} client @param {Object} ssot @param {Object} resumeDetail @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedContactInfo(client, ssot, resumeDetail, resumeId) {
  const { updates, changes } = collectContactUpdates(ssot, resumeDetail);

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
