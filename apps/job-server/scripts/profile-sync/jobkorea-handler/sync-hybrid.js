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

  try {
    // Extract current form state from Playwright page to use as base for smart merge
    const baseFields =
      typeof page?.evaluate === 'function'
        ? await page.evaluate(() => $('#frm1').serializeArray())
        : [];
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
  if (!portfolioUrl) {
    return { success: true, skipped: true, usedApi: false };
  }

  const logger = resolveLogger(options);

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
