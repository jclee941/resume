import { WANTED_ABOUT_LIMIT, WANTED_PROJECT_DESCRIPTION_LIMIT } from './constants.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {string} description
 * @returns {string}
 */
export function truncateWantedProjectDescription(description) {
  return description.slice(0, WANTED_PROJECT_DESCRIPTION_LIMIT).trim();
}

/**
 * @param {string} description
 * @returns {string}
 */
export function truncateWantedAbout(description) {
  return description.slice(0, WANTED_ABOUT_LIMIT).trim();
}
