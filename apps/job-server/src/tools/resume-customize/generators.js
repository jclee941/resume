/**
 * Output generators for resume customization.
 */

import { scoreCareer, scoreProject, scoreSkills } from './scoring.js';
import { normalize, unique } from './text-processing.js';

/**
 * @typedef {Object} ResumePersonal
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {string} [github]
 */

/**
 * @typedef {Object} ResumeSummary
 * @property {string} [totalExperience]
 * @property {string} [profileStatement]
 * @property {string[]} [tailoredHighlights]
 */

/**
 * @typedef {Object} ResumeCareer
 * @property {string} [role]
 * @property {string} [company]
 * @property {string} [period]
 * @property {string} [duration]
 * @property {string} [project]
 * @property {string} [description]
 * @property {number} [relevanceScore]
 * @property {string[]} [matchedKeywords]
 */

/**
 * @typedef {Object} ResumeProject
 * @property {string} [name]
 * @property {string} [client]
 * @property {string} [period]
 * @property {string} [role]
 * @property {string} [description]
 * @property {string[]} [technologies]
 * @property {string} [os]
 * @property {number} [relevanceScore]
 * @property {string[]} [matchedKeywords]
 */

/**
 * @typedef {Object} ResumeCertification
 * @property {string} name
 * @property {string} issuer
 * @property {string} date
 * @property {string} [status]
 */

/**
 * @typedef {Object} ResumeEducation
 * @property {string} school
 * @property {string} major
 * @property {string} startDate
 * @property {string} status
 */

/**
 * @typedef {Object} ResumeLanguage
 * @property {string} language
 * @property {string} [level]
 * @property {string} [fluency]
 */

/**
 * @typedef {Object} ResumeCustomizationData
 * @property {ResumePersonal} personal
 * @property {ResumeSummary} summary
 * @property {ResumeCareer[]} [careers]
 * @property {ResumeProject[]} [projects]
 * @property {Record<string, import('./scoring.js').SkillCategory>} skills
 * @property {ResumeCertification[]} [certifications]
 * @property {ResumeEducation} [education]
 * @property {ResumeLanguage[]} [languages]
 */

/**
 * @typedef {Object} RankedCareer
 * @property {ResumeCareer} career
 * @property {number} score
 * @property {string[]} matched
 */

/**
 * @typedef {Object} RankedProject
 * @property {ResumeProject} project
 * @property {number} score
 * @property {string[]} matched
 */

/**
 * @typedef {Object} CustomizationResult
 * @property {RankedCareer[]} rankedCareers
 * @property {RankedProject[]} rankedProjects
 * @property {ReturnType<typeof scoreSkills>} skillAnalysis
 * @property {{ topMatchedKeywords: string[] }} matchMeta
 */

/**
 * @param {ResumeCustomizationData} resumeData
 * @param {string[]} keywords
 * @returns {CustomizationResult}
 */
function buildCustomization(resumeData, keywords) {
  const rankedCareers = (resumeData.careers || [])
    .map((career) => scoreCareer(career, keywords))
    .sort((a, b) => b.score - a.score);

  const rankedProjects = (resumeData.projects || [])
    .map((project) => scoreProject(project, keywords))
    .sort((a, b) => b.score - a.score);

  const skillAnalysis = scoreSkills(resumeData.skills, keywords);

  const allMatched = unique([
    ...rankedCareers.flatMap((c) => c.matched),
    ...rankedProjects.flatMap((p) => p.matched),
    ...skillAnalysis.matched.map((s) => normalize(s.name)),
  ]);

  const matchMeta = {
    topMatchedKeywords: allMatched.slice(0, 20),
  };

  return { rankedCareers, rankedProjects, skillAnalysis, matchMeta };
}

/**
 * Generate ATS-friendly markdown resume.
 * @param {ResumeCustomizationData} resumeData
 * @param {string} _jobDescription
 * @param {string[]} keywords
 * @returns {string}
 */
export function generateATSMarkdown(resumeData, _jobDescription, keywords) {
  const { personal, summary, education, certifications } = resumeData;
  const { rankedCareers, rankedProjects, skillAnalysis, matchMeta } = buildCustomization(
    resumeData,
    keywords
  );

  const lines = [];

  lines.push(`# ${personal.name}`);
  lines.push(`${personal.email} | ${personal.phone} | ${personal.github || ''}`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`${summary.totalExperience} ${summary.profileStatement}`);
  if (matchMeta.topMatchedKeywords.length > 0) {
    lines.push(`Core competencies: ${matchMeta.topMatchedKeywords.slice(0, 10).join(', ')}`);
  }
  lines.push('');

  lines.push('## Technical Skills');
  if (skillAnalysis.matched.length > 0) {
    const matchedNames = skillAnalysis.matched.map((s) => s.name);
    lines.push(`**Key Skills:** ${matchedNames.join(', ')}`);
  }
  if (skillAnalysis.unmatched.length > 0) {
    const unmatchedNames = skillAnalysis.unmatched.slice(0, 10).map((s) => s.name);
    lines.push(`**Additional:** ${unmatchedNames.join(', ')}`);
  }
  lines.push('');

  lines.push('## Professional Experience');
  for (const { career, score: _score, matched } of rankedCareers) {
    lines.push(`### ${career.role} | ${career.company}`);
    lines.push(`${career.period} (${career.duration})`);
    lines.push(`*${career.project}*`);
    if (career.description) {
      const descLines = career.description.split('\n');
      for (const line of descLines) {
        lines.push(line);
      }
    }
    if (matched.length > 0) {
      lines.push(`Keywords: ${matched.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## Key Projects');
  for (const { project, score: _score2, matched: _matched } of rankedProjects.slice(0, 5)) {
    const techs = (project.technologies || []).join(', ');
    lines.push(`### ${project.name} | ${project.client || ''}`);
    lines.push(`${project.period} | ${project.role}`);
    if (project.description) {
      const descLines = project.description.split('\n');
      for (const line of descLines) {
        lines.push(line);
      }
    }
    if (techs) lines.push(`Technologies: ${techs}`);
    lines.push('');
  }

  const activeCerts = (certifications || []).filter((c) => c.status === 'active');
  if (activeCerts.length > 0) {
    lines.push('## Certifications');
    for (const cert of activeCerts) {
      lines.push(`- **${cert.name}** - ${cert.issuer} (${cert.date})`);
    }
    lines.push('');
  }

  if (education) {
    lines.push('## Education');
    lines.push(
      `**${education.school}** - ${education.major} (${education.startDate} ~ ${education.status})`
    );
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * @typedef {Object} CustomizedJSONResult
 * @property {ResumePersonal} personal
 * @property {ResumeSummary & { tailoredHighlights: string[] }} summary
 * @property {Array<ResumeCareer & { relevanceScore: number, matchedKeywords: string[] }>} careers
 * @property {Array<ResumeProject & { relevanceScore: number, matchedKeywords: string[] }>} projects
 * @property {{
 *   matched: Array<{ name: string, level?: string }>,
 *   additional: Array<{ name: string, level?: string }>,
 *   categoryRelevance: Record<string, import('./scoring.js').CategorySummary>,
 * }} skills
 * @property {ResumeCertification[] | undefined} certifications
 * @property {ResumeEducation | undefined} education
 * @property {ResumeLanguage[] | undefined} languages
 */

/**
 * Generate customized resume JSON.
 * @param {ResumeCustomizationData} resumeData
 * @param {string} _jobDescription
 * @param {string[]} keywords
 * @returns {CustomizedJSONResult}
 */
export function generateCustomizedJSON(resumeData, _jobDescription, keywords) {
  const { rankedCareers, rankedProjects, skillAnalysis, matchMeta } = buildCustomization(
    resumeData,
    keywords
  );

  return {
    personal: resumeData.personal,
    summary: {
      ...resumeData.summary,
      tailoredHighlights: matchMeta.topMatchedKeywords.slice(0, 10),
    },
    careers: rankedCareers.map(({ career, score, matched }) => ({
      ...career,
      relevanceScore: score,
      matchedKeywords: matched,
    })),
    projects: rankedProjects.map(({ project, score, matched }) => ({
      ...project,
      relevanceScore: score,
      matchedKeywords: matched,
    })),
    skills: {
      matched: skillAnalysis.matched.map((s) => ({ name: s.name, level: s.level })),
      additional: skillAnalysis.unmatched
        .slice(0, 15)
        .map((s) => ({ name: s.name, level: s.level })),
      categoryRelevance: skillAnalysis.categories,
    },
    certifications: resumeData.certifications,
    education: resumeData.education,
    languages: resumeData.languages,
  };
}
