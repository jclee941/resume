import { JobKoreaAuthError, JobKoreaCaptchaError, JobKoreaSaveError } from './api-errors.js';
import { mapPortfolioToFormFields } from '../jobkorea-sections.js';

const HYBRID_MODES = new Set(['hybrid-api', 'api-dry-run']);

export function getJobKoreaSyncMode() {
  return process.env.JOBKOREA_SYNC_MODE || 'playwright';
}

export function shouldUseHybridMode() {
  return HYBRID_MODES.has(getJobKoreaSyncMode());
}

function isFallbackEligible(error) {
  return error instanceof JobKoreaAuthError || error instanceof JobKoreaCaptchaError;
}

function resolveLogger(options) {
  return options.logger ?? (() => {});
}

async function readBrowserBaseFields(page) {
  if (typeof page?.evaluate !== 'function') {
    return [];
  }
  return page.evaluate(() => $('#frm1').serializeArray());
}

async function readApiBaseFields(apiClient) {
  if (typeof apiClient?.fetchEditPageBaseFields !== 'function') {
    return [];
  }
  return apiClient.fetchEditPageBaseFields();
}

function mergeBaseFields(rawFields, browserFields) {
  const merged = new Map();
  for (const field of rawFields || []) {
    if (field?.name) {
      merged.set(field.name, field.value ?? '');
    }
  }
  for (const field of browserFields || []) {
    if (field?.name) {
      merged.set(field.name, field.value ?? '');
    }
  }
  return Array.from(merged.entries()).map(([name, value]) => ({ name, value }));
}

export async function executeHybridSave(
  apiClient,
  targetFields,
  page,
  sectionIndices,
  options = {}
) {
  const logger = resolveLogger(options);
  const dryRun = options.dryRun || getJobKoreaSyncMode() === 'api-dry-run';
  const shouldSave = options.apply !== false && !options.diffOnly && !dryRun;

  if (!shouldSave) {
    logger('Hybrid API save skipped (dry-run)', 'info', 'jobkorea');
    return { success: true, dryRun: true, usedApi: false };
  }

  let baseFields;
  try {
    const [rawBaseFields, browserBaseFields] = await Promise.all([
      readApiBaseFields(apiClient),
      readBrowserBaseFields(page),
    ]);
    baseFields = mergeBaseFields(rawBaseFields, browserBaseFields);
  } catch (error) {
    logger(`Failed to load JobKorea preservation base: ${error.message}`, 'error', 'jobkorea');
    return { success: false, error: error.message, usedApi: false };
  }

  try {
    const saveResult = await apiClient.saveResume(targetFields, { baseFields });
    logger(
      `API save response: ${JSON.stringify(saveResult.result ?? saveResult).slice(0, 500)}`,
      'info',
      'jobkorea'
    );

    if (saveResult?.success === false) {
      const errorMessage =
        saveResult?.result?.saveResult?.ErrorMessage || 'JobKorea resume save failed';
      logger(`API save failed: ${errorMessage}`, 'error', 'jobkorea');
      return { success: false, error: errorMessage, usedApi: true };
    }

    logger('Resume API save completed', 'success', 'jobkorea');
    return { success: true, usedApi: true };
  } catch (error) {
    if (isFallbackEligible(error)) {
      logger(
        `API save blocked (${error.name}); falling back to Playwright save`,
        'warn',
        'jobkorea'
      );
      if (typeof options.fallbackSave !== 'function') {
        throw error;
      }
      const fallbackResult = await options.fallbackSave(page, targetFields, sectionIndices);
      return { success: true, usedApi: false, fallbackResult };
    }

    if (error instanceof JobKoreaSaveError) {
      logger(`API save failed: ${error.message}`, 'error', 'jobkorea');
      return { success: false, error: error.message, usedApi: true };
    }

    throw error;
  }
}

export async function executeHybridPortfolio(
  apiClient,
  portfolioUrl,
  targetFields,
  page,
  ssot,
  options = {}
) {
  const logger = resolveLogger(options);
  const dryRun = options.dryRun || getJobKoreaSyncMode() === 'api-dry-run';
  if (dryRun) {
    logger('Hybrid portfolio registration skipped (dry-run)', 'info', 'jobkorea');
    return { success: true, skipped: true, dryRun: true, usedApi: false };
  }

  if (!portfolioUrl) {
    return { success: true, skipped: true, usedApi: false };
  }

  try {
    const result = await apiClient.registerPortfolio(portfolioUrl);
    if (result?.success && result.fileIdx) {
      logger(`Portfolio URL registered via API: IDX=${result.fileIdx}`, 'info', 'jobkorea');
      targetFields.push(...mapPortfolioToFormFields(ssot, result.fileIdx));
      return { success: true, usedApi: true, fileIdx: result.fileIdx };
    }

    const error = new Error('JobKorea portfolio API registration failed');
    if (process.env.JOBKOREA_PORTFOLIO_OPTIONAL === 'true') {
      logger(error.message, 'warn', 'jobkorea');
      return { success: false, optional: true, error: error.message, usedApi: true };
    }
    throw error;
  } catch (error) {
    if (isFallbackEligible(error)) {
      logger(
        `API portfolio blocked (${error.name}); falling back to Playwright portfolio registration`,
        'warn',
        'jobkorea'
      );
      if (typeof options.fallbackPortfolio !== 'function') {
        throw error;
      }
      await options.fallbackPortfolio(page, ssot, targetFields);
      return { success: true, usedApi: false };
    }

    if (process.env.JOBKOREA_PORTFOLIO_OPTIONAL === 'true') {
      logger(error.message, 'warn', 'jobkorea');
      return { success: false, optional: true, error: error.message, usedApi: true };
    }

    throw error;
  }
}
