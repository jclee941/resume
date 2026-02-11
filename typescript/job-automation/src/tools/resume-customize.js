/**
 * MCP Tool: Resume Customization per Job Description
 *
 * Analyzes a job description, extracts keywords, scores resume sections
 * by relevance, reorders experience/skills/projects, and generates
 * an ATS-friendly customized resume.
 *
 * @module resume-customize
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { getResumeMasterDataPath, getOptimizedResumesDir } from '../shared/utils/paths.js';

const STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'are',
  'is',
  'was',
  'been',
  'can',
  'about',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  'able',
  'must',
  'also',
  'including',
  'such',
  'using',
  'within',
  'across',
  'related',
  'based',
  'experience',
  'preferred',
  'required',
  'minimum',
  'plus',
  'strong',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
  '우대',
  '필수',
  '이상',
  '등',
  '담당',
  '관련',
  '보유',
  '가능',
  '지원',
  '채용',
  '모집',
]);

const KR_STOPWORDS = new Set([
  '합니다',
  '입니다',
  '있는',
  '하는',
  '되는',
  '위한',
  '통한',
  '대한',
  '기반',
  '환경',
  '시스템',
  '서비스',
  '프로젝트',
  '개발',
  '운영',
]);

/**
 * Normalize text for keyword extraction.
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into filterable keyword array.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !KR_STOPWORDS.has(t));
}

/**
 * Deduplicate array preserving order.
 * @param {string[]} arr
 * @returns {string[]}
 */
function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Extract keywords from raw job description text.
 * @param {string} jobDescription - Full JD text
 * @returns {{ keywords: string[], sections: { requirements: string[], preferred: string[], responsibilities: string[] } }}
 */
function extractKeywords(jobDescription) {
  const text = String(jobDescription || '');

  const requirementsMatch = text.match(
    /(?:자격\s*요건|requirements?|필수\s*조건|qualifications?)[\s:：\n]*([\s\S]*?)(?=(?:우대|preferred|responsibilities|담당|$))/i
  );
  const preferredMatch = text.match(
    /(?:우대\s*사항|우대\s*조건|preferred|nice\s*to\s*have|bonus)[\s:：\n]*([\s\S]*?)(?=(?:담당|responsibilities|복리|benefits|$))/i
  );
  const responsibilitiesMatch = text.match(
    /(?:담당\s*업무|responsibilities|주요\s*업무|what\s*you.ll\s*do)[\s:：\n]*([\s\S]*?)(?=(?:자격|requirements|필수|qualifications|$))/i
  );

  const sections = {
    requirements: requirementsMatch ? tokenize(requirementsMatch[1]) : [],
    preferred: preferredMatch ? tokenize(preferredMatch[1]) : [],
    responsibilities: responsibilitiesMatch ? tokenize(responsibilitiesMatch[1]) : [],
  };

  const allKeywords = unique([
    ...tokenize(text),
    ...sections.requirements,
    ...sections.preferred,
    ...sections.responsibilities,
  ]);

  return { keywords: allKeywords, sections };
}

/**
 * Score a text block against keywords.
 * @param {string} text
 * @param {string[]} keywords
 * @returns {{ score: number, matched: string[] }}
 */
function scoreText(text, keywords) {
  const normalized = normalize(text);
  const matched = keywords.filter((kw) => normalized.includes(kw));
  return { score: matched.length, matched: unique(matched) };
}

/**
 * Score a career entry against keywords.
 * @param {object} career
 * @param {string[]} keywords
 * @returns {{ career: object, score: number, matched: string[] }}
 */
function scoreCareer(career, keywords) {
  const text = [
    career.project || '',
    career.role || '',
    career.description || '',
    career.company || '',
  ].join(' ');
  const { score, matched } = scoreText(text, keywords);
  return { career, score, matched };
}

/**
 * Score a project entry against keywords.
 * @param {object} project
 * @param {string[]} keywords
 * @returns {{ project: object, score: number, matched: string[] }}
 */
function scoreProject(project, keywords) {
  const text = [
    project.name || '',
    project.description || '',
    project.role || '',
    ...(project.technologies || []),
    project.os || '',
  ].join(' ');
  const { score, matched } = scoreText(text, keywords);
  return { project, score, matched };
}

/**
 * Score and sort skills by relevance.
 * @param {object} skills - resume_data.skills object
 * @param {string[]} keywords
 * @returns {{ matched: Array<{name: string, level: string, score: number}>, unmatched: Array<{name: string, level: string}>, categories: object }}
 */
function scoreSkills(skills, keywords) {
  const matched = [];
  const unmatched = [];
  const categories = {};

  for (const [catKey, category] of Object.entries(skills || {})) {
    const catMatched = [];
    const catUnmatched = [];

    for (const item of category.items || []) {
      const { score } = scoreText(item.name, keywords);
      if (score > 0) {
        matched.push({ ...item, score, category: catKey });
        catMatched.push(item);
      } else {
        unmatched.push({ ...item, category: catKey });
        catUnmatched.push(item);
      }
    }

    categories[catKey] = {
      title: category.title,
      matchedCount: catMatched.length,
      totalCount: (category.items || []).length,
      relevance: catMatched.length / Math.max((category.items || []).length, 1),
    };
  }

  matched.sort((a, b) => b.score - a.score);
  return { matched, unmatched, categories };
}

/**
 * Generate ATS-friendly markdown resume.
 * @param {object} resumeData - Full resume_data.json
 * @param {object} customization - Scored/reordered data
 * @returns {string}
 */
function generateATSMarkdown(resumeData, customization) {
  const { personal, summary, education, certifications } = resumeData;
  const { rankedCareers, rankedProjects, skillAnalysis, matchMeta } = customization;

  const lines = [];

  // Header
  lines.push(`# ${personal.name}`);
  lines.push(`${personal.email} | ${personal.phone} | ${personal.github || ''}`);
  lines.push('');

  // Summary (tailored)
  lines.push('## Summary');
  lines.push(`${summary.totalExperience} ${summary.profileStatement}`);
  if (matchMeta.topMatchedKeywords.length > 0) {
    lines.push(`Core competencies: ${matchMeta.topMatchedKeywords.slice(0, 10).join(', ')}`);
  }
  lines.push('');

  // Skills (matched first)
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

  // Experience (ranked by relevance)
  lines.push('## Professional Experience');
  for (const { career, score, matched } of rankedCareers) {
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

  // Projects (ranked by relevance)
  lines.push('## Key Projects');
  for (const { project, score, matched } of rankedProjects.slice(0, 5)) {
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

  // Certifications
  const activeCerts = (certifications || []).filter((c) => c.status === 'active');
  if (activeCerts.length > 0) {
    lines.push('## Certifications');
    for (const cert of activeCerts) {
      lines.push(`- **${cert.name}** - ${cert.issuer} (${cert.date})`);
    }
    lines.push('');
  }

  // Education
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
 * Generate customized resume JSON (structured data).
 * @param {object} resumeData
 * @param {object} customization
 * @returns {object}
 */
function generateCustomizedJSON(resumeData, customization) {
  const { rankedCareers, rankedProjects, skillAnalysis, matchMeta } = customization;

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

export const resumeCustomizeTool = {
  name: 'customize_resume',
  description:
    'Customize resume for a specific job description. Extracts keywords from the JD, ' +
    'scores and reorders experience/skills/projects by relevance, and generates ' +
    'ATS-friendly output in markdown and structured JSON formats.',

  inputSchema: {
    type: 'object',
    properties: {
      job_description: {
        type: 'string',
        description: 'Full job description text (raw text from job posting)',
      },
      job_title: {
        type: 'string',
        description: 'Job title (optional, improves keyword weighting)',
      },
      company_name: {
        type: 'string',
        description: 'Company name (optional, used in output filename)',
      },
      output_format: {
        type: 'string',
        enum: ['markdown', 'json', 'both'],
        description: 'Output format: markdown (ATS-friendly), json (structured), or both (default)',
      },
      save_to_file: {
        type: 'boolean',
        description: 'Whether to save output to file (default: true)',
      },
    },
    required: ['job_description'],
  },

  async execute(params) {
    try {
      const {
        job_description,
        job_title = '',
        company_name = 'unknown',
        output_format = 'both',
        save_to_file = true,
      } = params;

      const resumeRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeRaw);

      const fullJDText = [job_title, job_description].filter(Boolean).join(' ');
      const { keywords, sections } = extractKeywords(fullJDText);

      if (keywords.length === 0) {
        return {
          success: false,
          error: 'No meaningful keywords extracted from job description. Provide more text.',
        };
      }

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
        totalKeywords: keywords.length,
        matchedKeywords: allMatched.length,
        coveragePercent: Math.round((allMatched.length / keywords.length) * 100),
        topMatchedKeywords: allMatched.slice(0, 20),
        gapKeywords: keywords.filter((kw) => !allMatched.includes(kw)).slice(0, 15),
        requirementCoverage: sections.requirements.length
          ? Math.round(
              (sections.requirements.filter((r) => allMatched.includes(r)).length /
                sections.requirements.length) *
                100
            )
          : null,
      };

      const customization = { rankedCareers, rankedProjects, skillAnalysis, matchMeta };

      const result = {
        success: true,
        matchAnalysis: {
          overallCoverage: matchMeta.coveragePercent,
          requirementCoverage: matchMeta.requirementCoverage,
          matchedSkillCount: skillAnalysis.matched.length,
          topRelevantExperience: rankedCareers.slice(0, 3).map((c) => ({
            project: c.career.project,
            company: c.career.company,
            score: c.score,
          })),
          keywordGaps: matchMeta.gapKeywords,
        },
        savedFiles: [],
      };

      if (save_to_file) {
        const safeName = company_name.replace(/[^\w가-힣-]/g, '_');
        const outputDir = join(getOptimizedResumesDir(), safeName);
        await mkdir(outputDir, { recursive: true });

        if (output_format === 'markdown' || output_format === 'both') {
          const md = generateATSMarkdown(resumeData, customization);
          const mdPath = join(outputDir, `resume_customized.md`);
          await writeFile(mdPath, md, 'utf-8');
          result.savedFiles.push(mdPath);
          result.markdown = md;
        }

        if (output_format === 'json' || output_format === 'both') {
          const json = generateCustomizedJSON(resumeData, customization);
          const jsonPath = join(outputDir, `resume_customized.json`);
          await writeFile(jsonPath, JSON.stringify(json, null, 2), 'utf-8');
          result.savedFiles.push(jsonPath);
          result.customizedData = json;
        }
      } else {
        if (output_format === 'markdown' || output_format === 'both') {
          result.markdown = generateATSMarkdown(resumeData, customization);
        }
        if (output_format === 'json' || output_format === 'both') {
          result.customizedData = generateCustomizedJSON(resumeData, customization);
        }
      }

      result.recommendations = [];
      if (matchMeta.coveragePercent < 50) {
        result.recommendations.push(
          'Low keyword coverage. Consider adding relevant skills or rephrasing experience bullets.'
        );
      }
      if (matchMeta.gapKeywords.length > 5) {
        result.recommendations.push(
          `Missing keywords to address: ${matchMeta.gapKeywords.slice(0, 8).join(', ')}`
        );
      }
      if (skillAnalysis.matched.length < 3) {
        result.recommendations.push(
          'Few skill matches. Highlight transferable skills from existing projects.'
        );
      }
      if (rankedCareers.length > 0 && rankedCareers[0].score > 0) {
        result.recommendations.push(
          `Strongest match: "${rankedCareers[0].career.project}" at ${rankedCareers[0].career.company}. Lead with this experience.`
        );
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export default resumeCustomizeTool;
