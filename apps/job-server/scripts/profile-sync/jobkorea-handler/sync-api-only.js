import { JobKoreaAPIClient } from './api-client.js';
import { JobKoreaAuthError } from './api-errors.js';
import { log } from '../sync-logger.js';
import { buildJobKoreaFormData } from '../jobkorea-sections.js';
import { isJwtExpired } from './jwt-utils.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE_URL = 'https://www.jobkorea.co.kr';
const BROWSER_TEMPLATE_PATH = path.join(__dirname, 'browser-template.json');

export function getJobKoreaSyncMode() {
  return process.env.JOBKOREA_SYNC_MODE || 'api-only';
}

export function isApiOnlyMode() {
  return getJobKoreaSyncMode() === 'api-only';
}

function resolveLogger(options) {
  return options.logger ?? log;
}

function loadBrowserTemplate() {
  try {
    const data = readFileSync(BROWSER_TEMPLATE_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Create a pattern from a field name by replacing indices with wildcards.
 * e.g., "Career[c1].C_Name" → "Career[*].C_Name"
 */
function fieldPattern(name) {
  return name.replace(/\[[^\]]+\]/g, '[*]');
}

/**
 * Overlay target fields onto browser template fields.
 * Matches by field pattern (ignoring index differences).
 */
function overlayTemplate(templateFields, targetFields) {
  const patternMap = new Map();

  // Group template fields by pattern
  for (const f of templateFields) {
    const p = fieldPattern(f.name);
    if (!patternMap.has(p)) patternMap.set(p, []);
    patternMap.get(p).push(f);
  }

  // Group target fields by pattern
  const targetByPattern = new Map();
  for (const f of targetFields) {
    const p = fieldPattern(f.name);
    if (!targetByPattern.has(p)) targetByPattern.set(p, []);
    targetByPattern.get(p).push(f);
  }

  // Apply updates: for each pattern, update template fields with target values in order
  for (const [pattern, targetList] of targetByPattern) {
    // Skip index fields to avoid mismatched indices
    // Skip Language fields entirely: template requires Eval_Category which our SSoT doesn't provide
    if (
      pattern.endsWith('.index') ||
      pattern.endsWith('.Index_Name') ||
      pattern.startsWith('Language[')
    )
      continue;
    const templateEntries = patternMap.get(pattern) || [];
    for (let i = 0; i < Math.min(targetList.length, templateEntries.length); i++) {
      templateEntries[i].value = targetList[i].value;
    }
  }

  return templateFields;
}
/**
 * Execute JobKorea sync purely via API (no browser automation).
 *
 * @param {object} ssot - Resume SSoT data
 * @param {object} options
 * @param {string} [options.cookieString] - Session cookies
 * @param {string} [options.rNo] - Resume number
 * @param {string} [options.userAgent] - User-Agent header
 * @param {boolean} [options.dryRun=false] - Preview without saving
 * @param {Function} [options.logger] - Logger function
 */
export async function syncToJobKoreaAPI(ssot, options = {}) {
  const logger = resolveLogger(options);
  const dryRun = options.dryRun || false;

  if (!options.cookieString) {
    throw new JobKoreaAuthError('Cookie string required for API-only sync');
  }

  if (isJwtExpired(options.cookieString)) {
    logger('JWT token (jkat) expired or missing — attempting sync anyway', 'warning', 'jobkorea');
  }

  const apiClient = new JobKoreaAPIClient({
    baseUrl: DEFAULT_BASE_URL,
    cookieString: options.cookieString,
    rNo: options.rNo || process.env.JOBKOREA_RNO,
    userAgent: options.userAgent,
    logger,
  });

  logger('JobKorea API-only sync started', 'info', 'jobkorea');

  // 1. Fetch edit page tokens
  const tokens = await apiClient.fetchEditPageTokens();
  logger('Edit page tokens fetched', 'info', 'jobkorea');

  // 2. Load browser template and build our updates
  const browserTemplate = loadBrowserTemplate();
  if (!browserTemplate) {
    throw new Error('Browser template not found. Please capture a browser save request first.');
  }
  logger(`Browser template loaded: ${browserTemplate.length} fields`, 'info', 'jobkorea');

  const targetFields = buildJobKoreaFormData(ssot);
  logger(`Form data built: ${targetFields.length} fields`, 'info', 'jobkorea');

  // 3. Overlay our updates onto the browser template
  const mergedFields = overlayTemplate(browserTemplate, targetFields);
  logger(`Merged fields: ${mergedFields.length}`, 'info', 'jobkorea');

  // 4. Portfolio URL registration (via API)
  const portfolioUrl = ssot?.personal?.portfolio;
  if (portfolioUrl) {
    try {
      const portfolioResult = await apiClient.registerPortfolio(portfolioUrl);
      if (portfolioResult?.success) {
        logger(`Portfolio registered: ${portfolioUrl}`, 'success', 'jobkorea');
        if (portfolioResult.fields) {
          for (const pf of portfolioResult.fields) {
            const existing = mergedFields.find((f) => f.name === pf.name);
            if (existing) {
              existing.value = pf.value;
            } else {
              mergedFields.push(pf);
            }
          }
        }
      } else {
        logger(`Portfolio registration failed: ${portfolioUrl}`, 'warning', 'jobkorea');
      }
    } catch (e) {
      logger(`Portfolio registration error: ${e.message}`, 'warning', 'jobkorea');
    }
  }

  if (dryRun) {
    return {
      dry_run: true,
      mode: 'api-only',
      tokens_fetched: !!tokens,
      fields_prepared: mergedFields.length,
      would_save: mergedFields.slice(0, 20),
    };
  }

  // 5. Save resume via API
  try {
    const saveResult = await apiClient.saveResume(mergedFields, { tokens });
    logger(
      `Resume save result: ${saveResult?.success ? 'success' : 'failed'}`,
      saveResult?.success ? 'success' : 'error',
      'jobkorea'
    );
    return {
      success: saveResult?.success ?? false,
      mode: 'api-only',
      fields_updated: targetFields.length,
      api_response: saveResult,
    };
  } catch (e) {
    logger(`Save error: ${e.message}`, 'error', 'jobkorea');
    if (e.responseBody) {
      logger(`Response body: ${e.responseBody.substring(0, 500)}`, 'error', 'jobkorea');
    }
    if (e.statusCode) {
      logger(`Status: ${e.statusCode}`, 'error', 'jobkorea');
    }
    throw e;
  }
}
