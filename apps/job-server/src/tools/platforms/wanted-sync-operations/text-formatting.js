import { WANTED_ABOUT_LIMIT, WANTED_PROJECT_DESCRIPTION_LIMIT } from './constants.js';

export function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function truncateWantedProjectDescription(description) {
  return description.slice(0, WANTED_PROJECT_DESCRIPTION_LIMIT).trim();
}

export function truncateWantedAbout(description) {
  return description.slice(0, WANTED_ABOUT_LIMIT).trim();
}
