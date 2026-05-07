const { escapeHtml } = require('../template-sanitizer');

function getCertificationStatus(status) {
  const normalizedStatus = String(status || '').toLowerCase();
  const isActive = normalizedStatus === 'active';
  const isExpired = normalizedStatus === 'expired';

  return {
    statusClass: isActive
      ? 'cert-status--active'
      : isExpired
        ? 'cert-status--expired'
        : 'cert-status--pending',
    statusLabel: isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : String(status || 'UNKNOWN').toUpperCase(),
  };
}

/**
 * Generate certification cards HTML from JSON data
 * @param {Array} certData - Array of certification objects
 * @param {string} dataHash - Hash of the data for cache validation
 * @returns {string} HTML string for certification cards
 */
function generateCertificationCards(certData, _dataHash) {
  // Minimal or empty
  if (!certData || certData.length === 0) return '';

  return certData
    .map((c) => {
      const { statusClass, statusLabel } = getCertificationStatus(c.status);
      const dateText = c.date ? String(c.date) : 'TBD';
      const expirationText = c.expirationDate ? String(c.expirationDate) : 'N/A';

      return `<li class="cert-item">
        <span class="cert-status ${statusClass}">[${escapeHtml(statusLabel)}]</span>
        <span class="cert-name">${escapeHtml(c.name)}</span>
        <span class="cert-issuer">${escapeHtml(c.issuer || 'Unknown Issuer')}</span>
        <span class="cert-date">${escapeHtml(dateText)} / exp ${escapeHtml(expirationText)}</span>
      </li>`;
    })
    .join('\n');
}

module.exports = { generateCertificationCards };
