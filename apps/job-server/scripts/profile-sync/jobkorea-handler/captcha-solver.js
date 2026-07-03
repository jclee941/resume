/**
 * CAPTCHA solver via configured cliproxy-compatible vision models.
 *
 * Downloads the JobKorea CAPTCHA image (BMP from /login/captcha.asp) within
 * the same Playwright context (preserves session cookies), encodes it as a
 * data URL, and asks a vision LLM to read the alphanumeric characters.
 */

import { log } from '../sync-logger.js';

const VISION_MODELS = [
  'gpt-5.4',
  'gpt-5.5',
  'gemini-3.5-flash-low',
  'gemini-3-flash',
  'gpt-5.4-mini',
  'gemini-3.1-flash-lite',
];

const WEAK_CAPTCHA_TOKENS = new Set([
  'answer',
  'captcha',
  'captchas',
  'characters',
  'image',
  'images',
  'letter',
  'letters',
  'number',
  'numbers',
  'text',
  'word',
  'words',
]);

/**
 * Resolve the ordered list of vision model ids to try, allowing a
 * comma-separated JOBKOREA_CAPTCHA_MODELS env override.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function resolveVisionModels(env = process.env) {
  const override = env.JOBKOREA_CAPTCHA_MODELS?.trim();
  if (override) {
    const parsed = override
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return [...VISION_MODELS];
}

/**
 * Resolve and validate the cliproxy base URL from the provided environment.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @returns {string}
 */
export function resolveCliproxyBase(env = process.env) {
  const rawBase = env.CLIPROXY_BASE?.trim();
  if (!rawBase) {
    throw new Error('CLIPROXY_BASE is required for JobKorea CAPTCHA solving');
  }
  if (!/^https?:\/\//.test(rawBase)) {
    throw new Error('CLIPROXY_BASE must start with http:// or https://');
  }
  try {
    new URL(rawBase);
  } catch {
    throw new Error('CLIPROXY_BASE must be a valid URL');
  }
  return rawBase.replace(/\/+$/, '');
}

/**
 * Resolve and validate the cliproxy API key from the provided environment.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @returns {string}
 */
export function resolveCliproxyApiKey(env = process.env) {
  const apiKey = env.CLIPROXY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('CLIPROXY_API_KEY is required for JobKorea CAPTCHA solving');
  }
  return apiKey;
}

/**
 * Read CAPTCHA image bytes through the page's fetch (so cookies attach),
 * convert to base64 + mime, return data URL parts.
 *
 * @param {import('playwright').Page} page
 * @param {string} captchaSrc - absolute URL of the CAPTCHA image
 * @returns {Promise<{base64: string, mime: string}>}
 */
async function downloadCaptchaImage(page, captchaSrc) {
  const raw = await page.evaluate(async (src) => {
    const res = await fetch(src, { credentials: 'include' });
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
    const mimeMatch = dataUrl.match(/^data:([^;]+);/);
    return {
      base64: dataUrl.split(',')[1],
      mime: mimeMatch ? mimeMatch[1] : 'image/bmp',
    };
  }, captchaSrc);

  // BMP → PNG conversion via Python PIL improves vision model accuracy
  // (most LLMs handle PNG much better than BMP).
  if (raw.mime.includes('bmp')) {
    try {
      const fs = await import('fs');
      const { execSync } = await import('child_process');
      const tmpBmp = `/tmp/jk-captcha-${Date.now()}.bmp`;
      const tmpPng = tmpBmp.replace(/\.bmp$/, '.png');
      fs.writeFileSync(tmpBmp, Buffer.from(raw.base64, 'base64'));
      execSync(`python3 -c "from PIL import Image; Image.open('${tmpBmp}').save('${tmpPng}')"`, {
        stdio: 'ignore',
      });
      const pngBuf = fs.readFileSync(tmpPng);
      try {
        fs.unlinkSync(tmpBmp);
        fs.unlinkSync(tmpPng);
      } catch {}
      return { base64: pngBuf.toString('base64'), mime: 'image/png' };
    } catch {
      // PIL not installed or conversion failed — fall back to original BMP
    }
  }
  return raw;
}

/**
 * Check whether cliproxy is configured for automatic CAPTCHA solving.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function isCliproxyConfigured(env = process.env) {
  return !!env.CLIPROXY_BASE?.trim() && !!env.CLIPROXY_API_KEY?.trim();
}

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
 * Send the CAPTCHA image to a cliproxy vision model and parse the answer.
 *
 * @param {{base64: string, mime: string}} image
 * @param {string} model
 * @returns {Promise<string>}
 */
async function callVisionModel(image, model) {
  const cliproxyBase = resolveCliproxyBase();
  const cliproxyKey = resolveCliproxyApiKey();

  const reqBody = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'The image contains a short distorted string of letters and digits. ' +
              'Transcribe exactly the characters you see in the image, preserving upper/lower case. ' +
              'It is usually 5 to 8 characters long and contains no real words. ' +
              'Do NOT guess, do NOT output any word that is not literally drawn in the image. ' +
              'Reply with ONLY those characters — no spaces, no punctuation, no explanation. ' +
              'The answer must not be a normal word like image, captcha, letters, or text. ' +
              'If the characters are illegible, reply with exactly: ZZZZZZ.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${image.mime};base64,${image.base64}`, detail: 'high' },
          },
        ],
      },
    ],
    max_tokens: 32,
    temperature: 0,
  };

  const res = await fetch(`${cliproxyBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cliproxyKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`cliproxy ${model} HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  return normalizeCaptchaAnswer(raw);
}

export function normalizeCaptchaAnswer(raw) {
  const tokens = String(raw)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const candidates = tokens.filter(isPlausibleCaptchaAnswer);
  return candidates.length ? candidates[candidates.length - 1] : '';
}

function isPlausibleCaptchaAnswer(token) {
  if (token === 'ZZZZZZ') return false;
  if (token.length < 4 || token.length > 8) return false;
  if (WEAK_CAPTCHA_TOKENS.has(token.toLowerCase())) return false;
  return /^[A-Za-z0-9]+$/.test(token);
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
  for (const model of resolveVisionModels()) {
    try {
      const text = await callVisionModel(image, model);
      if (text) {
        log(`CAPTCHA solved via ${model}: "${text}"`, 'ok', 'jobkorea');
        return { text, model };
      }
      log(`CAPTCHA solver "${model}" returned weak answer: "${text}"`, 'warn', 'jobkorea');
    } catch (err) {
      errors.push(`${model}: ${err.message}`);
      log(`CAPTCHA solver "${model}" failed: ${err.message}`, 'warn', 'jobkorea');
    }
  }
  log(`All CAPTCHA solvers failed: ${errors.join(' | ')}`, 'error', 'jobkorea');
  return null;
}
