const { TEMPLATE_CACHE } = require('../config');
const { escapeHtml } = require('../template-sanitizer');
const logger = require('../../logger');

const CATEGORY_ORDER = [
  'observability',
  'security',
  'cloud',
  'devops',
  'automation',
  'database',
  'programming',
  'compliance',
];

function normalizeSkills(skillData) {
  if (Array.isArray(skillData)) return skillData;
  if (skillData.items) return skillData.items;
  return [];
}

function renderSkillItem(skill) {
  if (typeof skill === 'string') return escapeHtml(skill);
  return escapeHtml(String(skill && skill.name ? skill.name : 'Unknown'));
}

function generateSkillsList(skillsData, dataHash) {
  if (TEMPLATE_CACHE.dataHash === dataHash && TEMPLATE_CACHE.skillsHtml) {
    logger.log('✓ Using cached skills HTML');
    return TEMPLATE_CACHE.skillsHtml;
  }

  const html = CATEGORY_ORDER.map((key) => {
    const skillData = skillsData[key];
    if (!skillData) return '';

    const skills = normalizeSkills(skillData);
    if (skills.length === 0) return '';

    const label = escapeHtml(String(skillData.title || key).replace(/\s*&\s*/g, ' & '));

    return `<li class="htop-row">
        <span class="htop-label">${label}<span class="htop-count" aria-label="${skills.length} items">${skills.length}</span></span>
        <span class="htop-items">${skills.map(renderSkillItem).join(', ')}</span>
      </li>`;
  }).join('\n');

  TEMPLATE_CACHE.skillsHtml = html;
  return html;
}

module.exports = { generateSkillsList };
