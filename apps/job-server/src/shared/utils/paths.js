/**
 * Shared path resolution utility
 * Provides centralized base path resolution for job-automation
 * Supports RESUME_BASE_PATH environment variable override
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the project root directory
 * Supports RESUME_BASE_PATH env var override, defaults to ~/dev/resume
 * @returns {string} Absolute path to project root
 */
export function getResumeBasePath() {
  if (process.env.RESUME_BASE_PATH) {
    return process.env.RESUME_BASE_PATH;
  }

  // shared/utils is 5 levels deep from project root:
  // project_root/apps/job-server/src/shared/utils/paths.js
  // So resolve up 5 directories
  return resolve(__dirname, '../../../../..');
}

/**
 * Get path to master resume data file
 * @returns {string} Absolute path to resume_data.json
 */
export function getResumeMasterDataPath() {
  return resolve(getResumeBasePath(), 'packages/data/resumes/master/resume_data.json');
}

/**
 * Get path to master resume markdown file
 * @returns {string} Absolute path to resume_master.md
 */
export function getResumeMasterMarkdownPath() {
  return resolve(getResumeBasePath(), 'packages/data/resumes/master/resume_master.md');
}

/**
 * Get path to optimized resumes directory
 * @returns {string} Absolute path to resumes/companies/
 */
export function getOptimizedResumesDir() {
  return resolve(getResumeBasePath(), 'packages/data/resumes/companies');
}
