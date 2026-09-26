import { getRandomUA } from '../ua.js';

export const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1680, height: 1050 },
  { width: 1600, height: 900 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1280, height: 720 },
  { width: 1170, height: 2532, isMobile: true, deviceScaleFactor: 3 },
  { width: 1080, height: 2400, isMobile: true, deviceScaleFactor: 2.75 },
  { width: 390, height: 844, isMobile: true, deviceScaleFactor: 3 },
  { width: 412, height: 915, isMobile: true, deviceScaleFactor: 2.625 },
];

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * @returns {{ width: number, height: number, isMobile?: boolean, deviceScaleFactor?: number }}
 */
export function getRandomViewport() {
  return VIEWPORTS[randomInt(0, VIEWPORTS.length - 1)];
}

/**
 * Generate a consistent fingerprint for a browser session.
 * @returns {{ ua: string, viewport: { width: number, height: number }, acceptLanguage: string, platform: string, hardwareConcurrency: number, deviceMemory: number, screenResolution: { width: number, height: number }, colorDepth: number }}
 */
export function generateFingerprint() {
  const ua = getRandomUA();
  const viewport = getRandomViewport();

  // Derive platform from UA OS string for fingerprint consistency
  let platform = 'Win32';
  if (ua.includes('Macintosh')) {
    platform = 'MacIntel';
  } else if (ua.includes('Linux')) {
    platform = 'Linux x86_64';
  }

  const concurrencyOptions = [4, 8, 12, 16];
  const memoryOptions = [4, 8, 16];

  return {
    ua,
    viewport,
    acceptLanguage: 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    platform,
    hardwareConcurrency: concurrencyOptions[randomInt(0, concurrencyOptions.length - 1)],
    deviceMemory: memoryOptions[randomInt(0, memoryOptions.length - 1)],
    screenResolution: { width: viewport.width, height: viewport.height },
    colorDepth: 24,
  };
}

/**
 * Human-like delay using page.waitForTimeout.
 * @param {{ waitForTimeout(delay: number): Promise<unknown> }} page
 * @param {number} [min] - Minimum delay in ms
 * @param {number} [max] - Maximum delay in ms
 * @returns {Promise<void>}
 */
export async function humanDelay(page, min = 500, max = 2000) {
  const delay = randomInt(min, max);
  await page.waitForTimeout(delay);
}
