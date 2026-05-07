import { checkChromeDevTools, extractCookiesViaCDP } from './cdp-cookies.js';
import { parseAutomationArgs } from './cli-args.js';
import { CHROME_DEBUG_PORT, PLATFORMS } from './constants.js';
import { header, log, printBanner } from './logging.js';
import { syncPlatforms } from './platform-runners.js';
import { buildSummaryData, sendWebhookNotification } from './reporting.js';
import { checkSession, SessionManager } from './session-status.js';
import { runVerification } from './verification.js';

async function handleCookieStatus() {
  header('Cookie Status');

  const cdpAvailable = await checkChromeDevTools();
  if (cdpAvailable) {
    log(`Chrome DevTools available on port ${CHROME_DEBUG_PORT}`, 'ok');
  } else {
    log('Chrome DevTools not available. Start Chrome with:', 'warn');
    console.log(`   google-chrome --remote-debugging-port=${CHROME_DEBUG_PORT}`);
  }

  const invalidPlatforms = [];
  for (const platform of PLATFORMS) {
    const status = checkSession(platform);
    if (status.valid) {
      log(`${platform}: Valid session (${status.cookies} cookies)`, 'ok');
    } else {
      log(`${platform}: ${status.reason}`, 'err');
      invalidPlatforms.push(platform);
    }
  }

  if (invalidPlatforms.length > 0 && cdpAvailable) {
    log(`Attempting CDP extraction for: ${invalidPlatforms.join(', ')}...`, 'run');
    const saved = await extractCookiesViaCDP(invalidPlatforms);
    log(`Extracted cookies for ${saved} platform(s)`, saved > 0 ? 'ok' : 'warn');

    for (const platform of invalidPlatforms) {
      const recheck = checkSession(platform);
      if (recheck.valid) {
        log(`${platform}: Session restored (${recheck.cookies} cookies)`, 'ok');
      }
    }
  } else if (invalidPlatforms.length > 0) {
    log('CDP unavailable, attempting session refresh...', 'run');
    for (const platform of invalidPlatforms) {
      const refreshed = await SessionManager.tryRefresh(platform);
      log(
        refreshed ? `${platform}: Session refreshed via tryRefresh()` : `${platform}: Could not refresh session`,
        refreshed ? 'ok' : 'warn',
      );
    }
  }
}

function warnIfUnauthenticated() {
  const authCount = PLATFORMS.filter((p) => checkSession(p).valid).length;
  if (authCount === 0) {
    log('WARNING: No platforms authenticated. Operations will fail.', 'err');
    log('Run: node scripts/extract-cookies-cdp.js (with Chrome open)', 'info');
    log('  Or: node scripts/auth-persistent.js wanted (interactive login)', 'info');
  }
}

export async function main(args = process.argv.slice(2)) {
  const { doExtract, doSync, doVerify } = parseAutomationArgs(args);

  printBanner();

  if (doExtract) await handleCookieStatus();

  warnIfUnauthenticated();

  if (doSync) {
    header('Platform Sync');
    const synced = await syncPlatforms(PLATFORMS);
    log(`Synced ${synced}/${PLATFORMS.length} platforms`, synced > 0 ? 'ok' : 'warn');
  }

  if (doVerify) {
    header('Verification');
    runVerification();
  }

  header('Summary');
  const summaryData = buildSummaryData(PLATFORMS);
  await sendWebhookNotification({ summaryData, doExtract, doSync, doVerify });
}
