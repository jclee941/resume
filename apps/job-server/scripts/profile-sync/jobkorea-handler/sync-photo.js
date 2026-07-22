import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

/**
 * Candidate selectors for the JobKorea resume photo <input type="file">.
 * BEST-EFFORT pending live DOM/HAR verification against a real session — mirrors
 * the same caveat already used for skills mapping in jobkorea-sections.js.
 * See docs/architecture/RESUME_SYNC_AUDIT_2026-04-29.md.
 */
const PHOTO_INPUT_SELECTORS = [
  'input[type=file][name*=photo i]',
  'input[type=file][name*=Photo]',
  'input[type=file][id*=photo i]',
  '.resume-photo input[type=file]',
  '#frm1 input[type=file]',
];

// BEST-EFFORT confirm/upload button clicked after setInputFiles, if present.
const PHOTO_CONFIRM_BUTTON_SELECTOR =
  '.resume-photo .btnUpload, .resume-photo button[type=button], button[name*=photo i]';

/**
 * Upload the profile photo via Playwright setInputFiles against a best-effort
 * candidate selector list, trying each until one resolves on the page.
 * @param {import('playwright').Page} page
 * @param {string} photoPath
 * @returns {Promise<boolean>} true if an input was found and populated, false otherwise
 */
async function defaultUploadPhoto(page, photoPath) {
  for (const selector of PHOTO_INPUT_SELECTORS) {
    const input = await page.$(selector);
    if (!input) continue;
    await page.setInputFiles(selector, photoPath);
    const confirmButton = await page.$(PHOTO_CONFIRM_BUTTON_SELECTOR);
    if (confirmButton) {
      await confirmButton.click();
    }
    return true;
  }
  return false;
}

function buildPhotoUploadError(photoPath, timestamp) {
  const error = new Error(
    'JobKorea profile photo upload failed — no matching file input found; verify ' +
      `resume edit page photo selector via HAR capture (path=${photoPath}, timestamp=${timestamp})`
  );
  error.failLoud = true;
  return error;
}

/**
 * Upload the SSOT profile photo to the JobKorea resume edit page.
 * @param {import('playwright').Page} page
 * @param {object} [options]
 * @param {string} [options.photoPath]
 * @param {(page: import('playwright').Page, photoPath: string) => Promise<boolean>} [options.uploadPhoto]
 * @param {(msg: string, type?: string, platform?: string|null) => void} [options.logger]
 * @param {() => string} [options.getTimestamp]
 * @returns {Promise<void>}
 */
export async function appendPhotoUpload(page, options = {}) {
  const logger = options.logger ?? log;
  const photoPath =
    options.photoPath ??
    process.env.JOBKOREA_PHOTO_PATH ??
    path.join(CONFIG.SESSION_DIR, 'ProfileView.jpg');

  if (!fs.existsSync(photoPath)) {
    logger(`JobKorea profile photo skipped — file not found (path=${photoPath})`, 'warn', 'jobkorea');
    return;
  }

  const uploadPhoto = options.uploadPhoto ?? defaultUploadPhoto;
  const timestamp =
    typeof options.getTimestamp === 'function' ? options.getTimestamp() : new Date().toISOString();

  const uploaded = await uploadPhoto(page, photoPath);
  if (uploaded) {
    logger(`JobKorea profile photo uploaded (path=${photoPath})`, 'info', 'jobkorea');
    return;
  }

  const error = buildPhotoUploadError(photoPath, timestamp);
  if (process.env.JOBKOREA_PHOTO_OPTIONAL === 'true') {
    logger(error.message, 'warn', 'jobkorea');
    return;
  }

  throw error;
}
