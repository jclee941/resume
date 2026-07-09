import {
  registerPortfolioUrl as defaultRegisterPortfolioUrl,
  mapPortfolioToFormFields,
} from '../jobkorea-sections.js';
import { log } from '../sync-logger.js';

function buildPortfolioRegistrationError(portfolioUrl, timestamp) {
  const error = new Error(
    'JobKorea portfolio URL registration failed — check browser session and verify ' +
      `/User/Resume/AddUserFileDB endpoint is accessible (url=${portfolioUrl}, timestamp=${timestamp})`
  );
  error.failLoud = true;
  return error;
}

export async function appendPortfolioFields(page, ssot, targetFields, options = {}) {
  const portfolioUrl = ssot?.personal?.portfolio;
  if (!portfolioUrl) {
    return;
  }

  const registerPortfolioUrl = options.registerPortfolioUrl ?? defaultRegisterPortfolioUrl;
  const logger = options.logger ?? log;
  const timestamp =
    typeof options.getTimestamp === 'function' ? options.getTimestamp() : new Date().toISOString();
  const fileIdx = await registerPortfolioUrl(page, portfolioUrl);
  if (fileIdx) {
    logger(`Portfolio URL registered: IDX=${fileIdx}`, 'info', 'jobkorea');
    targetFields.push(...mapPortfolioToFormFields(ssot, fileIdx));
    return;
  }

  const error = buildPortfolioRegistrationError(portfolioUrl, timestamp);
  if (process.env.JOBKOREA_PORTFOLIO_OPTIONAL === 'true') {
    logger(error.message, 'warn', 'jobkorea');
    return;
  }

  throw error;
}
