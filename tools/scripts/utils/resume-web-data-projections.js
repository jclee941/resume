const RESUME_CARD_ICONS = ['🏦', '🏗️', '📈', '☁️', '🎓', '📞', '✈️'];

function resumeStatsFor(statsByIndex, idx) {
  return [...(statsByIndex[idx] || [])];
}

function careerCardFromSource(career, idx, statsByIndex) {
  const entry = {
    id: career.id,
    icon: RESUME_CARD_ICONS[idx] || '💼',
    title: career.company,
    role: career.myRole || career.role || '',
    description: career.description,
    period: career.period,
    stats: resumeStatsFor(statsByIndex, idx),
    highlight: idx === 0,
  };
  return withCompletePdf(entry, idx);
}

function englishCareerCardFromSource(career, idx, statsByIndex, overrides) {
  const translated = overrides[career.company] || {};
  const entry = {
    id: career.id,
    icon: RESUME_CARD_ICONS[idx] || '💼',
    title: translated.title || career.company,
    role: translated.role || career.myRole || career.role || '',
    description: translated.description || career.description,
    period: translated.period || career.period.replace('현재', 'Present'),
    stats: resumeStatsFor(statsByIndex, idx),
    highlight: idx === 0,
  };
  return withCompletePdf(entry, idx);
}

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

function englishProjectCardFromSource(project, overrides) {
  const translated = overrides[project.name] || {};
  return {
    ...projectCardFromSource(project),
    title: translated.title || project.name,
    description: translated.description || project.description,
    tagline: translated.tagline || project.tagline || project.description,
  };
}

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

function withCompletePdf(entry, idx) {
  if (idx !== 0) return entry;
  return {
    ...entry,
    completePdfUrl:
      'https://raw.githubusercontent.com/jclee941/resume/master/packages/data/resumes/technical/nextrade/exports/Nextrade_Full_Documentation.pdf',
  };
}

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
