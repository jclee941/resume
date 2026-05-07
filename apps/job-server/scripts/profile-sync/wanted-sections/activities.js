import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

function mapCertificationActivity(cert) {
  return {
    title: cert.name,
    description: `${cert.issuer} | ${cert.date}`,
    start_time: `${cert.date.replace('.', '-')}-01`,
    activity_type: 'CERTIFICATE',
  };
}

/** @param {Object} client @param {Object} ssot @param {Object} profile @param {string} resumeId @returns {Promise<Object>} */
export async function syncWantedActivities(client, ssot, profile, resumeId) {
  const ssotCerts = (ssot.certifications || []).filter((c) => c.date && c.status !== '준비중');
  const wantedActivities = profile.activities || [];

  log(`Activities: SSOT has ${ssotCerts.length} certs, Wanted has ${wantedActivities.length}`, 'info', 'wanted');

  const toAdd = [];
  const matched = new Set();

  for (const cert of ssotCerts) {
    const existing = wantedActivities.find((w) => w.title && w.title.includes(cert.name));
    if (existing) matched.add(existing.id);
    else toAdd.push({ data: mapCertificationActivity(cert), cert });
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
