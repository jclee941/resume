import { createDashboardAtsDryRunClient } from './ats-dry-run-client.js';

export const DEFAULT_APPLICATION_PLATFORMS = ['wanted', 'linkedin', 'remember'];
export const ATS_DRY_RUN_PLATFORMS = ['greenhouse', 'lever', 'ashby'];

const SEARCH_ONLY_PLATFORMS = ['cliproxy'];
const DIRECT_APPLICATION_PLATFORMS = [
  ...DEFAULT_APPLICATION_PLATFORMS,
  'jobkorea',
  'saramin',
  ...SEARCH_ONLY_PLATFORMS,
];
const ALL_APPLICATION_PLATFORMS = [...DIRECT_APPLICATION_PLATFORMS, ...ATS_DRY_RUN_PLATFORMS];

export function normalizeApplicationPlatforms(platforms, { atsStub = false, dryRun = false } = {}) {
  const requested = selectRequestedPlatforms(platforms);
  const supported = atsStub && dryRun ? ALL_APPLICATION_PLATFORMS : DIRECT_APPLICATION_PLATFORMS;
  return requested.filter((platform) => supported.includes(platform));
}

function selectRequestedPlatforms(platforms) {
  if (platforms === undefined) return DEFAULT_APPLICATION_PLATFORMS;
  if (!Array.isArray(platforms)) return [];
  return platforms.length ? platforms : DEFAULT_APPLICATION_PLATFORMS;
}

export function supportedApplicationPlatforms({ atsStub = false, dryRun = false } = {}) {
  return atsStub && dryRun ? ALL_APPLICATION_PLATFORMS : DIRECT_APPLICATION_PLATFORMS;
}

export function isAtsDryRunPlatform(platform) {
  return ATS_DRY_RUN_PLATFORMS.includes(platform);
}

export function createAtsDryRunClient(platform, options = {}) {
  if (!isAtsDryRunPlatform(platform)) return null;
  return createDashboardAtsDryRunClient(platform, options);
}

function titleCase(value) {
  return String(value || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function submitToAtsDryRunOnly(platform) {
  return {
    success: false,
    error: `${titleCase(platform)} ATS submissions are dry-run only in dashboard workflow.`,
    platform,
    dryRunOnly: true,
  };
}
