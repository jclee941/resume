import { createDashboardAtsDryRunClient } from './ats-dry-run-client.js';

export const DEFAULT_APPLICATION_PLATFORMS = ['wanted', 'linkedin', 'remember'];
export const ATS_DRY_RUN_PLATFORMS = ['greenhouse', 'lever', 'ashby'];

const DIRECT_APPLICATION_PLATFORMS = [...DEFAULT_APPLICATION_PLATFORMS, 'jobkorea', 'saramin'];
const ALL_APPLICATION_PLATFORMS = [...DIRECT_APPLICATION_PLATFORMS, ...ATS_DRY_RUN_PLATFORMS];

/**
 * @param {unknown} [platform]
 * @returns {string}
 */
export function normalizeApplicationPlatform(platform) {
  return typeof platform === 'string' ? platform.trim().toLowerCase() : '';
}

/**
 * @param {unknown} [platforms]
 * @param {{ atsStub?: boolean, dryRun?: boolean }} [options]
 * @returns {string[]}
 */
export function normalizeApplicationPlatforms(platforms, { atsStub = false, dryRun = false } = {}) {
  const requested = selectRequestedPlatforms(platforms)
    .map((platform) => normalizeApplicationPlatform(platform))
    .filter(Boolean);
  const supported = atsStub && dryRun ? ALL_APPLICATION_PLATFORMS : DIRECT_APPLICATION_PLATFORMS;
  return requested.filter((platform) => supported.includes(platform));
}

/**
 * @param {unknown} [platforms]
 * @returns {string[]}
 */
function selectRequestedPlatforms(platforms) {
  if (platforms === undefined) return DEFAULT_APPLICATION_PLATFORMS;
  if (!Array.isArray(platforms)) return [];
  return platforms.length ? /** @type {string[]} */ (platforms) : DEFAULT_APPLICATION_PLATFORMS;
}

/**
 * @param {{ atsStub?: boolean, dryRun?: boolean }} [options]
 * @returns {string[]}
 */
export function supportedApplicationPlatforms({ atsStub = false, dryRun = false } = {}) {
  return atsStub && dryRun ? ALL_APPLICATION_PLATFORMS : DIRECT_APPLICATION_PLATFORMS;
}

/**
 * @param {unknown} platform
 * @returns {boolean}
 */
export function isAtsDryRunPlatform(platform) {
  return ATS_DRY_RUN_PLATFORMS.includes(/** @type {string} */ (platform));
}

/**
 * @param {string} platform
 * @param {import('./ats-dry-run-client.js').AtsDryRunOptions} [options]
 * @returns {ReturnType<typeof createDashboardAtsDryRunClient>}
 */
export function createAtsDryRunClient(platform, options = {}) {
  if (!isAtsDryRunPlatform(platform)) return null;
  return createDashboardAtsDryRunClient(platform, options);
}

/**
 * @param {unknown} [value]
 * @returns {string}
 */
function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * @param {string} platform
 * @returns {{ success: false, error: string, platform: string, dryRunOnly: true }}
 */
export function submitToAtsDryRunOnly(platform) {
  return {
    success: false,
    error: `${titleCase(platform)} ATS submissions are dry-run only in dashboard workflow.`,
    platform,
    dryRunOnly: true,
  };
}
