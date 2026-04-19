import { readFile } from 'node:fs/promises';

import { generateCoverLetter } from '../../src/shared/services/resume/cover-letter-generator.js';

import { log, summarizeError } from './logging.js';

const RESUME_DATA_PATH = new URL(
  '../../../../packages/data/resumes/master/resume_data.json',
  import.meta.url
);

let _resumeData = null;

export async function getResumeData() {
  if (!_resumeData) {
    _resumeData = JSON.parse(await readFile(RESUME_DATA_PATH, 'utf8'));
  }

  return _resumeData;
}

export async function generateCoverLetterForJob(job) {
  try {
    const resumeData = await getResumeData();
    const jobPosting = {
      position: job.title || job.position,
      company: { name: job.company },
      requirements: job.requirements || job.skills || [],
      description: job.description || '',
      detail: job.detail || '',
    };
    const result = await generateCoverLetter(resumeData, jobPosting, { language: 'ko' });
    log('cover letter generated', {
      id: job.id,
      company: job.company,
      fallback: result.fallback,
      length: result.coverLetter?.length,
    });
    return result.coverLetter;
  } catch (error) {
    log('cover letter generation failed', { id: job.id, error: summarizeError(error) });
    return null;
  }
}
