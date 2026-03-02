import * as fsPromises from 'fs/promises';
import getJobDetailTool from './get-job-detail.js';
import jobMatcherTool from './job-matcher.js';
import { generateCoverLetter } from '../shared/services/resume/cover-letter-generator.js';
import { getResumeMasterDataPath } from '../shared/utils/paths.js';

function buildMatcherInput(job) {
  return {
    title: job.position || '',
    company: job.company?.name || '',
    requirements: job.requirements || '',
    description: [job.detail || '', job.preferred || '', job.benefits || '', job.intro || '']
      .filter(Boolean)
      .join('\n'),
    location: job.location || '',
    culture: [job.intro || '', job.detail || ''].join('\n'),
    benefits: job.benefits || '',
    experience: job.experience || '',
  };
}

export const coverLetterTool = {
  name: 'wanted_cover_letter',
  description:
    'Generate an AI-powered cover letter for a Wanted job posting using resume_data.json and return match score.',
  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'number',
        description: 'The job ID from Wanted (e.g., 304000)',
      },
      language: {
        type: 'string',
        enum: ['ko', 'en'],
        description: 'Cover letter language (ko or en). Default: en',
      },
      style: {
        type: 'string',
        description: 'Writing style (professional, concise, detailed). Default: professional',
      },
    },
    required: ['job_id'],
  },

  async execute(params) {
    try {
      const language = params.language === 'ko' ? 'ko' : 'en';
      const style = params.style || 'professional';
      const readFile =
        typeof params.__readFile === 'function' ? params.__readFile : fsPromises.readFile;

      const jobResult = await getJobDetailTool.execute({
        job_id: params.job_id,
      });

      if (!jobResult.success) {
        return {
          success: false,
          error: `Failed to fetch job detail: ${jobResult.error}`,
        };
      }

      const resumeDataRaw = await readFile(getResumeMasterDataPath(), 'utf-8');
      const resumeData = JSON.parse(resumeDataRaw);
      const job = jobResult.job;

      const matchResult = await jobMatcherTool.execute(buildMatcherInput(job));
      const matchScore = matchResult.success ? matchResult.match.score : 0;

      const generated = await generateCoverLetter(resumeData, job, {
        language,
        style,
        matchScore,
      });

      return {
        success: true,
        coverLetter: generated.coverLetter,
        matchScore,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default coverLetterTool;
