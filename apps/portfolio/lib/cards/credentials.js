const { escapeHtml } = require('../template-sanitizer');

// Certifications are presented as ACQUIRED credentials. We intentionally do
// NOT surface expiry state or expiration dates — holding the cert is the
// signal; an expired renewal date adds noise and a negative impression.
// Only 'in-progress' (준비중 / pursuing) is distinguished from acquired.
function getCertificationStatus(status) {
  const normalized = String(status || '').toLowerCase();
  // Pending labels across locales: KO 준비중, JA 準備中, EN Preparing/pursuing.
  // Matching only KO previously caused not-yet-earned certs (e.g. CKS) to render
  // as [ACQUIRED] on /en/ and /ja/ — a false credential claim.
  const PENDING = new Set([
    '준비중',
    '準備中',
    'pending',
    'in-progress',
    'in progress',
    'preparing',
    'pursuing',
  ]);
  const isPending = PENDING.has(normalized);
  return {
    statusClass: isPending ? 'cert-status--pending' : 'cert-status--active',
    statusLabel: isPending ? 'IN PROGRESS' : 'ACQUIRED',
  };
}

// Strip any parenthetical expiry note from a date string, keeping only the
// acquisition date. e.g. '2020.08 (2023.08 만료)' -> '2020.08'
function acquisitionDate(date) {
  if (!date) return '';
  return String(date)
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/**
 * Generate certification cards HTML from JSON data.
 * Shows acquired credentials only (no expiry badge / no expiration date).
 * @param {Array} certData - Array of certification objects
 * @param {string} _dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for certification cards
 */
function generateCertificationCards(certData, _dataHash) {
  if (!certData || certData.length === 0) return '';

  return certData
    .map((c) => {
      const { statusClass, statusLabel } = getCertificationStatus(c.status);
      const dateText = acquisitionDate(c.date);
      const dateHtml = dateText ? `<span class="cert-date">${escapeHtml(dateText)}</span>` : '';
      return `<li class="cert-item">
        <span class="cert-status ${statusClass}">[${escapeHtml(statusLabel)}]</span>
        <span class="cert-name">${escapeHtml(c.name)}</span>
        <span class="cert-issuer">${escapeHtml(c.issuer || 'Unknown Issuer')}</span>
        ${dateHtml}
      </li>`;
    })
    .join('\n');
}

module.exports = { generateCertificationCards };
