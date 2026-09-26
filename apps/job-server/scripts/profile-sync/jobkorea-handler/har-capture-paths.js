import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { redactSensitiveValue } from './har-redaction-patterns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const DEFAULT_HAR_DIR = '/tmp/opencode/jobkorea-har';

function formatTimestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * @param {string} parent
 * @param {string} candidate
 * @returns {boolean}
 */
function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getDefaultHarOutputPath(date = new Date()) {
  return path.join(DEFAULT_HAR_DIR, `jobkorea-profile-sync-${formatTimestampForFile(date)}.har`);
}

/**
 * @param {string} outputPath
 * @returns {string}
 */
export function assertSafeHarOutputPath(outputPath) {
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('HAR output path is required');
  }

  const resolvedPath = path.resolve(outputPath);
  const resolvedRepo = path.resolve(REPO_ROOT);
  if (isPathInside(resolvedRepo, resolvedPath)) {
    throw new Error(`Refusing to write raw JobKorea HAR inside repository: ${resolvedPath}`);
  }

  if (!isPathInside(path.resolve(os.tmpdir()), resolvedPath)) {
    throw new Error(`Refusing to write raw JobKorea HAR outside ${os.tmpdir()}: ${resolvedPath}`);
  }

  return resolvedPath;
}

/**
 * @param {Record<string, string>} [headers={}]
 * @returns {Record<string, string>}
 */
function redactHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, redactSensitiveValue(key, value)])
  );
}

/**
 * @param {import('playwright').Request} request
 * @returns {{ method: string, origin: string, path: string, resourceType: string, headers: Record<string, string> }}
 */
export function summarizeRequest(request) {
  const url = new URL(request.url());
  return {
    method: request.method(),
    origin: url.origin,
    path: url.pathname,
    resourceType: request.resourceType(),
    headers: redactHeaders(request.headers()),
  };
}
