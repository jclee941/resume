/**
 * MCP Tool: Optimize Resume for Job
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import getJobDetailTool from './get-job-detail.js';
import { analyzeJobPosting } from '../shared/services/matching/ai-matcher.js';
import { optimizeResume } from '../shared/services/resume/optimizer.js';
import { getResumeMasterMarkdownPath, getOptimizedResumesDir } from '../shared/utils/paths.js';

const MASTER_RESUME_PATH = getResumeMasterMarkdownPath();

export const optimizeResumeTool = {
  name: 'wanted_optimize_resume',
  description: 'Generate a personalized resume optimized for a specific job posting on Wanted.',
  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'number',
        description: 'The job ID from Wanted (e.g., 304000)',
      },
      output_path: {
        type: 'string',
        description: 'Optional custom output path',
      },
    },
    required: ['job_id'],
  },

  async execute(params) {
    try {
      console.log(`🔍 Fetching job detail for ID: ${params.job_id}...`);
      const jobResult = await getJobDetailTool.execute({
        job_id: params.job_id,
      });
      if (!jobResult.success) {
        return {
          success: false,
          error: `Failed to fetch job detail: ${jobResult.error}`,
        };
      }

      const job = jobResult.job;
      console.log(`🏢 Company: ${job.company.name}`);
      console.log(`💼 Position: ${job.position}`);

      console.log('🤖 Analyzing job posting...');
      const jobAnalysis = await analyzeJobPosting(job);
      if (!jobAnalysis) {
        return {
          success: false,
          error: 'Failed to analyze job posting with AI',
        };
      }

      console.log('📖 Reading master resume...');
      const masterResume = await readFile(MASTER_RESUME_PATH, 'utf-8');

      console.log('✨ Optimizing resume for the job...');
      const optimizedResume = await optimizeResume(masterResume, jobAnalysis);

      // Save the optimized resume
      const companyName = job.company.name.replace(/[^\w가-힣]/g, '_');
      const outputDir = join(getOptimizedResumesDir(), companyName);
      const filename = `resume_optimized_${params.job_id}.md`;
      const outputPath = params.output_path || join(outputDir, filename);

      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, optimizedResume, 'utf-8');

      console.log(`✅ Optimized resume saved to: ${outputPath}`);

      return {
        success: true,
        outputPath,
        company: job.company.name,
        position: job.position,
        matchHighlights: jobAnalysis.required_skills,
      };
    } catch (error) {
      console.error('❌ Resume optimization failed:', error);
      return { success: false, error: error.message };
    }
  },
};

export default optimizeResumeTool;
