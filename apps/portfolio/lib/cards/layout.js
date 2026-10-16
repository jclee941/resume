const { escapeHtml } = require('../template-sanitizer');
const { defaultOwnerIdentity } = require('../owner-identity');

const CONTACT_LABELS = {
  ko: { email: '이메일', newTab: ' (새 탭에서 열림)' },
  en: { email: 'Email', newTab: ' (opens in new tab)' },
  ja: { email: 'メール', newTab: '（新しいタブで開きます）' },
};

/**
 * @typedef {Object} HeroData
 * @property {string} titleEn
 * @property {string} subtitle
 * @property {string} [email]
 */

/**
 * @typedef {Object} InfraItem
 * @property {string} icon
 * @property {string} title
 * @property {string} description
 * @property {string} status
 * @property {string} [url]
 */

/**
 * @typedef {Object} ContactData
 * @property {string} [velog]
 * @property {string} [githubBot]
 * @property {string} github
 * @property {string} linkedin
 * @property {string} email
 * @property {string} website
 */

/**
 * Generate hero section HTML from data
 * ✅ FIXED: Added aria-label to email link for accessibility
 * @param {HeroData} heroData - Hero section data
 * @returns {string} HTML string for hero section
 */
function generateHeroContent(heroData) {
  const email = heroData.email || defaultOwnerIdentity().email;
  return `
    <h1 class="hero-name">${escapeHtml(heroData.titleEn)}</h1>
    <h2 class="hero-subtitle">${escapeHtml(heroData.subtitle)}</h2>
    <div class="hero-contact">
       <a href="mailto:${escapeHtml(email)}" class="hero-link" aria-label="Email">${escapeHtml(email)}</a>
    </div>
  `;
}

/**
 * Generate infrastructure cards HTML from data
 * @param {InfraItem[]} infraData - Array of infrastructure objects with {icon, title, description, status, url?}
 * @returns {string} HTML string for infrastructure cards
 */
function generateInfrastructureCards(infraData) {
  if (!infraData || infraData.length === 0) return '';

  return infraData
    .map((item) => {
      const statusClass =
        item.status === 'running' ? 'infra-status--running' : 'infra-status--stopped';
      const statusLabel = item.status === 'running' ? 'RUNNING' : 'STOPPED';
      const titleContent = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="infra-link" aria-label="Open ${escapeHtml(item.title)} (opens in new tab)">${escapeHtml(item.icon)} ${escapeHtml(item.title)} <span class="arrow">↗</span></a>`
        : `<span>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</span>`;

      return `
        <li class="infra-card">
          <div class="infra-header">
            <span class="infra-title">${titleContent}</span>
            <span class="infra-status ${statusClass}">[${statusLabel}]</span>
          </div>
          <p class="infra-desc">${escapeHtml(item.description)}</p>
        </li>`;
    })
    .join('\n');
}

/**
 * Visible handle of a profile URL: its last path segment ("octocat", "@name").
 * @param {string | undefined} url
 * @returns {string}
 */
function contactHandle(url) {
  if (!url || !URL.canParse(url)) return '';
  return new URL(url).pathname.split('/').filter(Boolean).pop() || '';
}

/**
 * Generate contact grid HTML from data
 * @param {ContactData} contactData - Contact information object
 * @param {'ko' | 'en' | 'ja'} [locale='ko'] - Locale for contact labels.
 * @returns {string} HTML string with accessible footer links
 */
function generateContactGrid(contactData, locale = 'ko') {
  const labels = CONTACT_LABELS[locale];
  const email = String(contactData.email || '')
    .replace(/^mailto:/i, '')
    .split('?')[0];
  const velog = contactData.velog || 'https://velog.io/@qws941';
  /**
   * @param {string} href
   * @param {string} name
   */
  const link = (href, name) => {
    const handle = escapeHtml(contactHandle(href));
    const value = handle ? `<span class="contact-item__value">${handle}</span>` : '';
    const accessibleName = handle ? `${name} ${handle}` : name;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="contact-item" aria-label="${accessibleName}${labels.newTab}"><span class="contact-item__label">${name}</span> ${value}</a>`;
  };
  return `
        ${link(contactData.github, 'GitHub')}
        ${contactData.githubBot ? link(contactData.githubBot, 'GitHub Bot') : ''}
        ${link(contactData.linkedin, 'LinkedIn')}
        ${link(velog, 'Velog')}
        <a class="contact-item contact-item--email" href="mailto:${escapeHtml(email)}" data-contact-email="${escapeHtml(email)}"><span class="contact-item__label">${labels.email}</span> <span class="contact-item__value">${escapeHtml(email)}</span></a>
        <span class="contact-copy-status" role="status" aria-live="polite" aria-atomic="true"></span>
  `;
}

module.exports = {
  generateHeroContent,
  generateInfrastructureCards,
  generateContactGrid,
};
