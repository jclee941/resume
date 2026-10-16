const { escapeHtml } = require('../template-sanitizer');
const { buildSkillRadarData } = require('../skill-radar-data');
const { renderIconSvg } = require('../icons');

const CJK_SKILL_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
// Domains above this size span both rows of the two-row phone carousel.
const TALL_DOMAIN_SKILLS = 10;

/** @type {Record<string, string>} */
const DOMAIN_ICONS = {
  automation: 'automation',
  backendApi: 'server',
  cicdAutomation: 'sync',
  cloud: 'cloud',
  cloudEdge: 'cloud',
  compliance: 'check',
  database: 'database',
  devops: 'git',
  infrastructureAsCode: 'code',
  observability: 'chart',
  programming: 'code',
  security: 'shield',
  securityAutomation: 'shield',
};

/**
 * @param {number} count
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function skillCountText(count, locale) {
  if (locale === 'en') return `${count} skill${count !== 1 ? 's' : ''}`;
  if (locale === 'ja') return `${count}件のスキル`;
  return `${count}개 기술`;
}

/**
 * @param {string} domainKey
 * @param {import('../skill-radar-data').RadarCategory} domain
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function renderDomainCard(domainKey, domain, locale) {
  const key = escapeHtml(domainKey);
  const headingId = `skill-domain-${key}`;
  const tall = domain.skills.length > TALL_DOMAIN_SKILLS ? ' skill-domain-card--tall' : '';
  const items = domain.skills
    .map((skill) => {
      const name = escapeHtml(skill.name);
      const cjk = CJK_SKILL_PATTERN.test(skill.name) ? ' skill-item--cjk' : '';
      return `<li class="skill-item${cjk}" data-skill="${name}">${name}</li>`;
    })
    .join('');
  return (
    `<article class="skill-domain-card${tall}" data-domain="${key}" aria-labelledby="${headingId}">` +
    '<div class="skill-domain-card__header">' +
    `<div class="skill-domain-card__icon" aria-hidden="true">${renderIconSvg(DOMAIN_ICONS[domainKey] || 'layers')}</div>` +
    `<h3 class="skill-domain-card__title" id="${headingId}">${escapeHtml(domain.title)}</h3>` +
    `<span class="skill-domain-card__count">${escapeHtml(skillCountText(domain.skills.length, locale))}</span>` +
    '</div>' +
    `<ul class="skill-list" aria-labelledby="${headingId}">${items}</ul>` +
    '</article>'
  );
}

/**
 * Server-rendered skill domain cards: the settled markup the client only hydrates.
 * @param {Record<string, import('../skill-radar-data').SSoTSkillCategory> | null | undefined} skills
 * @param {'ko' | 'en' | 'ja'} locale
 * @returns {string}
 */
function generateSkillDomainCards(skills, locale) {
  return Object.entries(buildSkillRadarData(skills))
    .map(([domainKey, domain]) => renderDomainCard(domainKey, domain, locale))
    .join('');
}

module.exports = { generateSkillDomainCards, skillCountText };
