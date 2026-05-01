/**
 * @fileoverview Platform validation for crawl orchestration.
 */

import { SUPPORTED_PLATFORMS } from './constants.js';

/**
 * Validate platform identifiers.
 *
 * @param {string[]} platforms
 * @param {{ emit: (event: string, payload: object) => void }} eventTarget
 * @returns {string[]}
 */
export function validatePlatforms(platforms, eventTarget) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw new Error('At least one platform must be specified');
  }

  const valid = [];
  const invalid = [];

  for (const p of platforms) {
    const key = p.toLowerCase().trim();
    if (SUPPORTED_PLATFORMS.includes(key)) {
      valid.push(key);
    } else {
      invalid.push(p);
    }
  }

  if (invalid.length > 0) {
    eventTarget.emit('warning', {
      message: `Unknown platforms ignored: ${invalid.join(', ')}`,
      platforms: invalid,
    });
  }

  if (valid.length === 0) {
    throw new Error(`No valid platforms provided. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`);
  }

  return valid;
}
