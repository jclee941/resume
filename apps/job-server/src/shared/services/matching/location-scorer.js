import { normalize, parseRequirements } from './text-utils.js';

/**
 * @typedef {{
 *   location?: string | null;
 *   title?: string | null;
 *   description?: string | null;
 *   requirements?: unknown;
 *   [key: string]: unknown;
 * }} JobLocationListing
 *
 * @typedef {{
 *   personal?: { address?: string | null };
 *   [key: string]: unknown;
 * }} ResumeLocationData
 *
 * @typedef {{
 *   score: number;
 *   reason: string;
 * }} LocationScoreResult
 */

/**
 * @param {unknown} location
 * @returns {string}
 */
export function getCity(location) {
  const normalized = normalize(location);
  if (!normalized) {
    return '';
  }
  const [first] = normalized.split(' ');
  return first || '';
}

/**
 * @param {JobLocationListing} jobListing
 * @param {ResumeLocationData} resumeData
 * @returns {LocationScoreResult}
 */
export function scoreLocation(jobListing, resumeData) {
  const jobLocation = String(jobListing.location || '');
  const resumeLocation = String(resumeData.personal?.address || '');

  const normalizedJob = normalize(jobLocation);
  const normalizedResume = normalize(resumeLocation);
  const remoteText = normalize(
    [
      jobListing.title || '',
      jobListing.description || '',
      parseRequirements(jobListing.requirements),
      jobLocation,
    ].join(' ')
  );

  if (normalizedJob && normalizedResume && normalizedJob === normalizedResume) {
    return { score: 100, reason: 'perfect_match' };
  }

  const jobCity = getCity(jobLocation);
  const resumeCity = getCity(resumeLocation);
  if (jobCity && resumeCity && jobCity === resumeCity) {
    return { score: 80, reason: 'same_city' };
  }

  if (/remote|원격|재택|hybrid|하이브리드/.test(remoteText)) {
    return { score: 70, reason: 'remote_ok' };
  }

  return { score: 30, reason: 'different_city' };
}
