import { readFile } from 'fs/promises';
import { getResumeMasterDataPath } from '../shared/utils/paths.js';

const STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'has',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text) {
  const tokens = normalize(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));

  return [...new Set(tokens)].slice(0, 80);
}

function collectResumeSearchCorpus(resumeData) {
  const skills = Object.values(resumeData.skills || {}).flatMap((group) =>
    (group.items || []).map((item) => item.name)
  );

  const experiences = (resumeData.careers || []).map((career) => ({
    company: career.company,
    project: career.project,
    period: career.period,
    role: career.role,
    description: career.description,
  }));

  const projects = (resumeData.projects || []).map((project) => ({
    name: project.name,
    period: project.period,
    role: project.role,
    description: project.description,
    technologies: project.technologies || [],
  }));

  return { skills, experiences, projects };
}

function scoreMatch(text, keywords) {
  const normalized = normalize(text);
  return keywords.reduce((acc, keyword) => (normalized.includes(keyword) ? acc + 1 : acc), 0);
}

export const resumeGeneratorTool = {
  name: 'wanted_resume_generator',
  description:
    'Generate a tailored resume JSON based on job description by matching resume_data.json skills and experience.',

  inputSchema: {
    type: 'object',
    properties: {
      job_description: {
        type: 'string',
        description: 'Raw job description text to tailor resume against',
      },
      role_focus: {
        type: 'string',
        description: 'Optional role focus label to include in output summary',
      },
    },
    required: ['job_description'],
  },

  async execute(params) {
    try {
      const jobDescription = params.job_description || '';
      const keywords = extractKeywords(jobDescription);

      const resumeDataRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeDataRaw);

      const { skills, experiences, projects } = collectResumeSearchCorpus(resumeData);

      const matchedSkills = skills
        .map((skill) => ({ skill, score: scoreMatch(skill, keywords) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((item) => item.skill);

      const topExperiences = experiences
        .map((experience) => ({
          ...experience,
          score: scoreMatch(
            [experience.company, experience.project, experience.role, experience.description].join(
              ' '
            ),
            keywords
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ score: _score, ...experience }) => experience);

      const topProjects = projects
        .map((project) => ({
          ...project,
          score: scoreMatch(
            [
              project.name,
              project.role,
              project.description,
              (project.technologies || []).join(' '),
            ].join(' '),
            keywords
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ score: _score, ...project }) => project);

      const matchedKeywordSet = new Set();
      [
        ...matchedSkills,
        ...topExperiences.map((item) => item.description),
        ...topProjects.map((item) => item.description),
      ]
        .join(' ')
        .split(/\s+/)
        .forEach((token) => {
          const normalized = normalize(token);
          if (normalized && keywords.includes(normalized)) {
            matchedKeywordSet.add(normalized);
          }
        });

      const matchedKeywords = [...matchedKeywordSet];
      const gapKeywords = keywords
        .filter((keyword) => !matchedKeywordSet.has(keyword))
        .slice(0, 15);

      return {
        success: true,
        tailored_resume: {
          target_summary: {
            role_focus: params.role_focus || 'Tailored for provided job description',
            profile_statement: resumeData.summary?.profileStatement || '',
            total_experience: resumeData.summary?.totalExperience || '',
          },
          highlighted_skills: matchedSkills,
          relevant_experiences: topExperiences,
          relevant_projects: topProjects,
          certifications: (resumeData.certifications || []).map((cert) => ({
            name: cert.name,
            status: cert.status,
            issuer: cert.issuer,
          })),
          contact: resumeData.contact || {},
          keyword_analysis: {
            extracted_keywords: keywords,
            matched_keywords: matchedKeywords,
            gap_keywords: gapKeywords,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default resumeGeneratorTool;
