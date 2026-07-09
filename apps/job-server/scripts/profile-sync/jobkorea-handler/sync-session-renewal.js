import { fileURLToPath } from 'url';
import path from 'path';
import { loadJobKoreaSession } from './session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadSavedJobKoreaCookies(handler, options = {}) {
  const sessionOptions = {
    saveResolvedFallback: options.allowFallbackSave !== false,
  };
  if (typeof handler.loadSession === 'function') {
    return handler.loadSession(sessionOptions);
  }
  return loadJobKoreaSession(sessionOptions);
}

export async function renewSavedJobKoreaSession(options, logger) {
  if (typeof options.renewSession === 'function') {
    await options.renewSession();
    return;
  }

  const { execFileSync } = await import('child_process');
  const renewScript = path.resolve(__dirname, '../../renew-jobkorea-session.js');
  execFileSync(process.execPath, [renewScript], {
    env: {
      ...process.env,
      HEADLESS: 'true',
    },
    stdio: 'inherit',
    timeout: 600000,
  });
  logger('JobKorea session auto-renewal completed', 'success', 'jobkorea');
}

export async function loadOrRenewJobKoreaCookies(handler, options, logger, renewalOptions = {}) {
  const cookies = loadSavedJobKoreaCookies(handler, {
    allowFallbackSave: renewalOptions.allowFallbackSave,
  });
  if (cookies) {
    return cookies;
  }

  if (renewalOptions.allowRenewal === false) {
    throw new Error('No fresh JobKorea session available for dry-run');
  }

  logger('No fresh JobKorea session - auto-renewing via Puppeteer...', 'warn', 'jobkorea');
  try {
    await renewSavedJobKoreaSession(options, logger);
  } catch (renewError) {
    throw new Error(`Session auto-renewal failed: ${renewError.message}`);
  }

  const renewedCookies = loadSavedJobKoreaCookies(handler, {
    allowFallbackSave: renewalOptions.allowFallbackSave,
  });
  if (!renewedCookies) {
    throw new Error('Session auto-renewal did not produce saved JobKorea cookies');
  }

  return renewedCookies;
}
