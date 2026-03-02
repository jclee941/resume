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
import { join } from 'path';
import { getResumeMasterDataPath, getOptimizedResumesDir } from '../shared/utils/paths.js';
import { extractKeywords, normalize, unique } from './resume-customize/text-processing.js';
import { scoreCareer, scoreProject, scoreSkills } from './resume-customize/scoring.js';
import { generateATSMarkdown, generateCustomizedJSON } from './resume-customize/generators.js';

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
          const md = generateATSMarkdown(resumeData, fullJDText, keywords);
          const mdPath = join(outputDir, 'resume_customized.md');
          await writeFile(mdPath, md, 'utf-8');
          result.savedFiles.push(mdPath);
          result.markdown = md;
        }

        if (output_format === 'json' || output_format === 'both') {
          const json = generateCustomizedJSON(resumeData, fullJDText, keywords);
          const jsonPath = join(outputDir, 'resume_customized.json');
          await writeFile(jsonPath, JSON.stringify(json, null, 2), 'utf-8');
          result.savedFiles.push(jsonPath);
          result.customizedData = json;
        }
      } else {
        if (output_format === 'markdown' || output_format === 'both') {
          result.markdown = generateATSMarkdown(resumeData, fullJDText, keywords);
        }
        if (output_format === 'json' || output_format === 'both') {
          result.customizedData = generateCustomizedJSON(resumeData, fullJDText, keywords);
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
