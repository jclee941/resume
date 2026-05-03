/**
 * CAPTCHA solver via cliproxy.jclee.me vision models.
 *
 * Downloads the JobKorea CAPTCHA image (BMP from /login/captcha.asp) within
 * the same Playwright context (preserves session cookies), encodes it as a
 * data URL, and asks a vision LLM to read the alphanumeric characters.
 */

import { log } from '../utils.js';

const CLIPROXY_BASE = process.env.CLIPROXY_BASE || 'https://cliproxy.jclee.me/v1';
const CLIPROXY_KEY = process.env.CLIPROXY_API_KEY;
// Vision-capable models in priority order. Pure-vision models (Gemini Flash,
// Claude Sonnet) tend to handle BMP CAPTCHA better than reasoning models
// (which leak chain-of-thought into the answer).
const VISION_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-3.1-pro-preview',
  'claude-sonnet-4-20250514',
  'claude-opus-4-6',
  'minimax-m2.5',
  'gpt-5.4-mini',
];

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
      execSync(`python3 -c "from PIL import Image; Image.open('${tmpBmp}').save('${tmpPng}')"`, { stdio: 'ignore' });
      const pngBuf = fs.readFileSync(tmpPng);
      try { fs.unlinkSync(tmpBmp); fs.unlinkSync(tmpPng); } catch {}
      return { base64: pngBuf.toString('base64'), mime: 'image/png' };
    } catch {
      // PIL not installed or conversion failed — fall back to original BMP
    }
  }
  return raw;
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
  if (!CLIPROXY_KEY) throw new Error('CLIPROXY_API_KEY is not set');

  const reqBody = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              'This is a CAPTCHA image from a Korean website (JobKorea). ' +
              'Read the visible alphanumeric characters (no other content). ' +
              'Reply with ONLY the characters, exact case, no punctuation, no spaces, no explanation. ' +
              'If you cannot read the characters, reply with the single word: UNREADABLE.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:${image.mime};base64,${image.base64}` },
          },
        ],
      },
    ],
    max_tokens: 32,
    temperature: 0,
  };

  const res = await fetch(`${CLIPROXY_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLIPROXY_KEY}`,
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
  // Reasoning models may prepend thoughts. Extract the last alphanumeric token of length 3-12.
  const tokens = String(raw)
    .split(/[^A-Za-z0-9]+/)
    .filter((t) => t.length >= 3 && t.length <= 12 && t !== 'UNREADABLE');
  const cleaned = tokens.length ? tokens[tokens.length - 1] : '';
  return cleaned;
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

  const image = await downloadCaptchaImage(page, src);
  log(`CAPTCHA image downloaded (${image.mime}, ${image.base64.length} chars b64)`, 'info', 'jobkorea');

  const errors = [];
  for (const model of VISION_MODELS) {
    try {
      const text = await callVisionModel(image, model);
      if (text && text !== 'UNREADABLE' && text.length >= 3 && text.length <= 12) {
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
