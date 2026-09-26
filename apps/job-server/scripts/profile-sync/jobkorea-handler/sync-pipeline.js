import { JobKoreaAPIClient } from './api-client.js';
import { buildCookieString } from '../../jobkorea-session/cookie-utils.js';
import { executeHybridPortfolio } from './sync-hybrid.js';
import { appendPortfolioFields } from './sync-portfolio.js';
import { appendPhotoUpload } from './sync-photo.js';

export async function prepareJobKoreaApiClient(handler, cookies, options, logger) {
  const apiCookieString = handler.loadSessionCookieString?.() || buildCookieString(cookies);
  return (
    options.apiClient ??
    options.apiClientFactory?.({
      cookieString: apiCookieString,
      logger,
    }) ??
    new JobKoreaAPIClient({
      cookieString: apiCookieString,
      logger,
    })
  );
}

export async function handleJobKoreaPortfolioAndPhoto({
  apiClient,
  hybridMode,
  dryRun,
  targetFields,
  page,
  ssot,
  options,
  logger,
}) {
  if (hybridMode) {
    await executeHybridPortfolio(apiClient, ssot?.personal?.portfolio, targetFields, page, ssot, {
      logger,
      dryRun,
      fallbackPortfolio: (fallbackPage, fallbackSsot, fallbackFields) =>
        appendPortfolioFields(fallbackPage, fallbackSsot, fallbackFields, {
          registerPortfolioUrl: options.registerPortfolioUrl,
          logger,
          getTimestamp: options.getTimestamp,
        }),
    });
  } else if (dryRun) {
    logger('Portfolio registration skipped (dry-run)', 'info', 'jobkorea');
  } else {
    await appendPortfolioFields(page, ssot, targetFields, {
      registerPortfolioUrl: options.registerPortfolioUrl,
      logger,
      getTimestamp: options.getTimestamp,
    });
  }

  if (process.env.JOBKOREA_SYNC_PHOTO === 'true') {
    await appendPhotoUpload(page, { logger });
  }
}
