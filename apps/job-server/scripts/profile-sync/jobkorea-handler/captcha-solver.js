/**
 * CAPTCHA solver via configured cliproxy-compatible vision models.
 *
 * Downloads the JobKorea CAPTCHA image (BMP from /login/captcha.asp) within
 * the same Playwright context (preserves session cookies), encodes it as a
 * data URL, and asks a vision LLM to read the alphanumeric characters.
 */

import { log } from '../sync-logger.js';
import { downloadCaptchaImage } from './captcha-image.js';
import {
  callVisionModel,
  isCliproxyConfigured,
  resolveVisionModels,
} from './captcha-vision-client.js';

export {
  isCliproxyConfigured,
  normalizeCaptchaAnswer,
  resolveCliproxyApiKey,
  resolveCliproxyBase,
  resolveVisionModels,
} from './captcha-vision-client.js';

/**
 * Locate the JobKorea CAPTCHA image src on the current page.
 * Returns null if no CAPTCHA image is found.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string | null>}
 */
export async function findCaptchaImageUrl(page) {
  return await page.evaluate(() => {
    const direct = document.querySelector('img[src*="captcha"]');
    if (direct?.src) return direct.src;
    const gtxt = document.querySelector('#gtxt, input[name="gtxt"]');
    if (gtxt) {
      const container = gtxt.closest('div, td, li, p');
      if (container) {
        const img = container.querySelector('img');
        if (img?.src) return img.src;
      }
    }
    // Final fallback: known JobKorea CAPTCHA endpoint
    if (document.querySelector('#gtxt')) {
      return 'https://www.jobkorea.co.kr/login/captcha.asp';
    }
    return null;
  });
}

/**
 * Main entry: solve CAPTCHA from the current page, returning the text the user
 * should type. Tries multiple vision models in priority order.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{text: string, model: string} | null>}
 */
export async function solveJobKoreaCaptcha(page) {
  const src = await findCaptchaImageUrl(page);
  if (!src) {
    log('No CAPTCHA image found on page', 'info', 'jobkorea');
    return null;
  }
  log(`CAPTCHA image: ${src}`, 'info', 'jobkorea');

  if (!isCliproxyConfigured()) {
    log('CLIPROXY_BASE not configured — skipping automatic CAPTCHA solve', 'warn', 'jobkorea');
    return null;
  }

  const image = await downloadCaptchaImage(page, src);
  log(
    `CAPTCHA image downloaded (${image.mime}, ${image.base64.length} chars b64)`,
    'info',
    'jobkorea'
  );

  const errors = [];
  let fallbackAnswer = null;
  for (const model of resolveVisionModels()) {
    try {
      const text = await callVisionModel(image, model);
      if (text) {
        if (isStrongCaptchaAnswer(text)) {
          log(`CAPTCHA solved via ${model}: "${text}"`, 'ok', 'jobkorea');
          return { text, model };
        }
        fallbackAnswer ??= { text, model };
        log(`CAPTCHA solver "${model}" returned low-confidence answer: "${text}"`, 'warn', 'jobkorea');
        continue;
      }
      log(`CAPTCHA solver "${model}" returned weak answer: "${text}"`, 'warn', 'jobkorea');
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
      log(`CAPTCHA solver "${model}" failed: ${err.message}`, 'warn', 'jobkorea');
    }
  }
  if (fallbackAnswer) {
    log(
      `CAPTCHA solved via ${fallbackAnswer.model}: "${fallbackAnswer.text}"`,
      'ok',
      'jobkorea'
    );
    return fallbackAnswer;
  }
  log(`All CAPTCHA solvers failed: ${errors.join(' | ')}`, 'error', 'jobkorea');
  return null;
}

function isStrongCaptchaAnswer(text) {
  return /[0-9]/.test(text);
}
