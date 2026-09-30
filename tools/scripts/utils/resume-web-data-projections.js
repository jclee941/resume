/**
 * @typedef {{
 *   id?: string;
 *   company: string;
 *   companyUrl?: string | null;
 *   myRole?: string;
 *   role?: string;
 *   description?: string;
 *   period: string;
 *   projects?: { achievements?: string[] }[];
 *   [key: string]: unknown;
 * }} SourceCareer
 */

/**
 * @typedef {{
 *   id?: string;
 *   icon?: string;
 *   name: string;
 *   technologies?: string[] | string;
 *   description?: string;
 *   tagline?: string;
 *   period?: string;
 *   language?: string;
 *   githubUrl?: string;
 *   demoUrl?: string;
 *   dashboards?: unknown[];
 *   url?: string;
 *   repoUrl?: string;
 *   businessImpact?: unknown;
 *   displayOrder?: number;
 *   featured?: boolean;
 *   [key: string]: unknown;
 * }} SourceProject
 */

/**
 * @typedef {{
 *   title?: string;
 *   role?: string;
 *   description?: string;
 *   period?: string;
 *   tagline?: string;
 *   [key: string]: unknown;
 * }} TranslationOverride
 */

/**
 * @typedef {{ icons: string[], completePdfUrl: string }} CardConfig
 */

/**
 * @param {Record<number, unknown[]>} statsByIndex
 * @param {number} idx
 * @returns {unknown[]}
 */
function resumeStatsFor(statsByIndex, idx) {
  return [...(statsByIndex[idx] || [])];
}

/**
 * @param {SourceCareer} career
 * @param {number} idx
 * @param {Record<number, unknown[]>} statsByIndex
 * @param {CardConfig} cardConfig
 * @returns {Record<string, unknown>}
 */
function careerCardFromSource(career, idx, statsByIndex, cardConfig) {
  const entry = {
    id: career.id,
    icon: cardConfig.icons[idx] || '💼',
    title: career.company,
    role: career.myRole || career.role || '',
    description: career.description,
    period: career.period,
    stats: resumeStatsFor(statsByIndex, idx),
    highlight: idx === 0,
  };
  return withCompletePdf(entry, idx, cardConfig);
}

/**
 * @param {SourceCareer} career
 * @param {number} idx
 * @param {Record<number, unknown[]>} statsByIndex
 * @param {Record<string, TranslationOverride>} overrides
 * @param {CardConfig} cardConfig
 * @returns {Record<string, unknown>}
 */
function englishCareerCardFromSource(career, idx, statsByIndex, overrides, cardConfig) {
  const translated = overrides[career.company] || {};
  const entry = {
    id: career.id,
    icon: cardConfig.icons[idx] || '💼',
    title: translated.title || career.company,
    role: translated.role || career.myRole || career.role || '',
    description: translated.description || career.description,
    period: translated.period || career.period.replace('현재', 'Present'),
    stats: resumeStatsFor(statsByIndex, idx),
    highlight: idx === 0,
  };
  return withCompletePdf(entry, idx, cardConfig);
}

/**
 * @param {SourceProject} project
 * @returns {Record<string, unknown>}
 */
function projectCardFromSource(project) {
  return {
    id: project.id,
    icon: project.icon || '💻',
    title: project.name,
    tech: technologiesText(project),
    description: project.description,
    tagline: project.tagline || project.description,
    period: project.period,
    language: project.language,
    githubUrl: project.githubUrl,
    demoUrl: project.demoUrl,
    dashboards: Array.isArray(project.dashboards) ? project.dashboards : [],
    related_skills: project.technologies || [],
    liveUrl: project.demoUrl || project.url,
    repoUrl: project.githubUrl || project.repoUrl,
    businessImpact: project.businessImpact,
    displayOrder: typeof project.displayOrder === 'number' ? project.displayOrder : 999,
    featured: project.featured === true,
  };
}

/**
 * @param {SourceProject} project
 * @param {Record<string, TranslationOverride>} overrides
 * @returns {Record<string, unknown>}
 */
function englishProjectCardFromSource(project, overrides) {
  const translated = overrides[project.name] || {};
  return {
    ...projectCardFromSource(project),
    title: translated.title || project.name,
    description: translated.description || project.description,
    tagline: translated.tagline || project.tagline || project.description,
  };
}

/**
 * @param {SourceCareer} career
 * @returns {Record<string, unknown>}
 */
function timelineCareerFromSource(career) {
  return {
    id: career.id,
    company: career.company,
    companyUrl: career.companyUrl || null,
    period: career.period,
    role: career.role,
    myRole: career.myRole,
    description: career.description,
    achievements: (career.projects || [])
      .flatMap((project) => project.achievements || [])
      .filter((achievement) => typeof achievement === 'string' && achievement.length > 0),
  };
}

/**
 * @param {Record<string, unknown>} entry
 * @param {number} idx
 * @param {CardConfig} cardConfig
 * @returns {Record<string, unknown>}
 */
function withCompletePdf(entry, idx, cardConfig) {
  if (idx !== 0) return entry;
  return {
    ...entry,
    completePdfUrl: cardConfig.completePdfUrl,
  };
}

/**
 * @param {SourceProject} project
 * @returns {string | undefined}
 */
function technologiesText(project) {
  return Array.isArray(project.technologies)
    ? project.technologies.join(', ')
    : project.technologies;
}

module.exports = {
  careerCardFromSource,
  englishCareerCardFromSource,
  englishProjectCardFromSource,
  projectCardFromSource,
  timelineCareerFromSource,
};
