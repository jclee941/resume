import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';
import { formatYYYY_MM_DD } from '../../../src/shared/utils/date-formatters.js';

/**
 * Map an SSoT certification to a Wanted CERTIFICATE activity, preserving the
 * supported credential metadata fields (not just title/date).
 */
function mapCertificationActivity(cert) {
  return {
    title: cert.name,
    description: `${cert.issuer} | ${cert.date}`,
    start_time: formatYYYY_MM_DD(cert.date),
    activity_type: 'CERTIFICATE',
    expirationDate: cert.expirationDate || '',
    credentialId: cert.credentialId || '',
    credentialUrl: cert.credentialUrl || '',
    status: cert.status || '',
    note: cert.note || '',
  };
}

/**
 * Map an SSoT award to a Wanted AWARD activity.
 */
function mapAwardActivity(award) {
  return {
    title: award.name || '',
    description: `${award.organization || ''} | ${award.year || ''}`,
    start_time: award.year && /\./.test(award.year) ? formatYYYY_MM_DD(award.year) : null,
    activity_type: 'AWARD',
  };
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedActivities(client, ssot, profile, resumeId) {
  const ssotCerts = (ssot.certifications || []).filter((c) => c.date && c.status !== '준비중');
  const ssotAwards = ssot.awards || [];
  const wantedActivities = profile.activities || [];

  log(
    `Activities: SSOT has ${ssotCerts.length} certs + ${ssotAwards.length} awards, Wanted has ${wantedActivities.length}`,
    'info',
    'wanted'
  );

  const desired = [
    ...ssotCerts.map((cert) => ({ data: mapCertificationActivity(cert), label: cert.name })),
    ...ssotAwards
      .filter((a) => a.name)
      .map((award) => ({ data: mapAwardActivity(award), label: award.name })),
  ];

  const toAdd = [];
  const matched = new Set();

  for (const item of desired) {
    const existing = wantedActivities.find((w) => w.title && w.title.includes(item.label));
    if (existing) matched.add(existing.id);
    else toAdd.push(item);
  }

  log(`Activities: ${matched.size} matched, ${toAdd.length} to add`, 'info', 'wanted');

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const item of toAdd) console.log(`  + ${item.label} (${item.data.activity_type})`);
    return { changes: toAdd.length, added: 0, dryRun: true };
  }

  let added = 0;
  for (const item of toAdd) {
    try {
      await client.addActivity(resumeId, item.data);
      log(`Added activity: ${item.label}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.label}: ${e.message}`, 'error', 'wanted');
    }
  }
  return { changes: added, added };
}
