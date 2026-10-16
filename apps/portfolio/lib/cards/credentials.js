const { escapeHtml } = require('../template-sanitizer');
const { glueKoreanPhrases } = require('./text-breaks');

const TRAILING_PARENTHETICAL = /^(.*?)(\s*)([(（][^()（）]+[)）])$/u;
// Longer parentheticals are translated institution names: they get a full-width row of their
// own instead of wrapping beside the date.
const OWN_ROW_PARENTHETICAL = 16;

// Certifications are presented as ACQUIRED credentials. We intentionally do
// NOT surface expiry state or expiration dates — holding the cert is the
// signal; an expired renewal date adds noise and a negative impression.
// Only 'in-progress' (준비중 / pursuing) is distinguished from acquired.
const STATUS_LABELS = {
  ko: { active: '취득', pending: '준비 중' },
  en: { active: 'ACQUIRED', pending: 'IN PROGRESS' },
  ja: { active: '取得済み', pending: '準備中' },
};

/**
 * @param {string|null|undefined} status
 * @param {'ko'|'en'|'ja'} [locale='en']
 * @returns {{ statusClass: string, statusLabel: string }}
 */
function getCertificationStatus(status, locale = 'en') {
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
  const labels = STATUS_LABELS[locale] || STATUS_LABELS.en;
  return {
    statusClass: isPending ? 'cert-status--pending' : 'cert-status--active',
    statusLabel: isPending ? labels.pending : labels.active,
  };
}

// Strip any parenthetical expiry note from a date string, keeping only the
// acquisition date. e.g. '2020.08 (2023.08 만료)' -> '2020.08'
/**
 * @param {string|null|undefined} date
 * @returns {string}
 */
function acquisitionDate(date) {
  if (!date) return '';
  return String(date)
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/**
 * @param {string} text
 * @returns {{ main: string, gap: string, paren: string }}
 */
function splitParenthetical(text) {
  const match = TRAILING_PARENTHETICAL.exec(text);
  if (!match || !match[1]) return { main: text, gap: '', paren: '' };
  return { main: match[1], gap: match[2], paren: match[3] };
}

/**
 * @param {{ main: string, gap: string, paren: string }} part
 * @returns {string}
 */
function inlineHtml(part) {
  const paren = part.paren
    ? `${part.gap}<span class="cert-paren">${escapeHtml(part.paren)}</span>`
    : '';
  return glueKoreanPhrases(escapeHtml(part.main)) + paren;
}

/**
 * Generate certification cards HTML from JSON data.
 * Shows acquired credentials only (no expiry badge / no expiration date).
 * @param {Array<import('../../../../packages/types/src/resume.js').ResumeCertification>} certData - Array of certification objects
 * @param {string} _dataHash - Hash of the data for cache validation
 * @param {'ko'|'en'|'ja'} [locale='en'] - Locale for the status badge text
 * @returns {string} HTML string for certification cards
 */
function generateCertificationCards(certData, _dataHash, locale = 'en') {
  if (!certData || certData.length === 0) return '';

  return certData
    .map((c) => {
      const { statusClass, statusLabel } = getCertificationStatus(c.status, locale);
      const dateText = acquisitionDate(c.date);
      const dateHtml = dateText ? `<span class="cert-date">${escapeHtml(dateText)}</span>` : '';
      const issuer = splitParenthetical(String(c.issuer || 'Unknown Issuer'));
      const ownRow = issuer.paren.length > OWN_ROW_PARENTHETICAL;
      const lang = /^[(（][\x20-\x7e]+[)）]$/.test(issuer.paren) ? ' lang="en"' : '';
      const altHtml = ownRow
        ? `<span class="cert-issuer-alt"${lang}>${escapeHtml(issuer.paren)}</span>`
        : '';
      const issuerHtml = ownRow ? glueKoreanPhrases(escapeHtml(issuer.main)) : inlineHtml(issuer);
      return `<li class="cert-item${ownRow ? ' cert-item--issuer-alt' : ''}">
        <span class="cert-status ${statusClass}">[${escapeHtml(statusLabel)}]</span>
        <span class="cert-name">${inlineHtml(splitParenthetical(String(c.name)))}</span>
        <span class="cert-issuer">${issuerHtml}</span>
        ${dateHtml}
        ${altHtml}
      </li>`;
    })
    .join('\n');
}

module.exports = { generateCertificationCards };
