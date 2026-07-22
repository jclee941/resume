import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

/**
 * JobKorea resume photo upload selectors — CONFIRMED via live read-only DOM
 * probe of the resume edit page on 2026-07-22 (see jobkorea-handler/_photo-probe.mjs).
 *
 * The resume edit page has NO static photo <input type=file> — the only static
 * file input is the portfolio one (#uploadPortfolioFile, name=File_Co_Name),
 * which the old `#frm1 input[type=file]` fallback wrongly matched. The real
 * flow is a popup:
 *
 *   1. div.picture holds the trigger: button.buttonChangePicture ("사진변경",
 *      shown when a photo already exists) or a.buttonAddFile ("사진등록",
 *      shown when none exists). Clicking the visible one opens a popup at
 *      https://www.jobkorea.co.kr/User/MyPage/Photo?re_url=<edit-url>&callback=photoChangeCallback
 *   2. In the popup, the file input is #up_file (name="up_file").
 *   3. The popup form is #form1, posting multipart/form-data to
 *      https://file2.jobkorea.co.kr/Net/UserPhoto/Upload.
 *   4. The popup submit button is #btn_modify ("등록하기").
 *
 * Residual assumption: no separate crop/confirm step was observed beyond
 * #btn_modify. If JobKorea later adds a crop UI, this flow needs updating.
 */
const PHOTO_TRIGGER_SELECTORS = ['button.buttonChangePicture', 'a.buttonAddFile'];
const POPUP_FILE_INPUT = '#up_file';
const POPUP_FILE_INPUT_FALLBACK = 'input[name="up_file"]';
const POPUP_SUBMIT = '#btn_modify';
const POPUP_SUBMIT_TEXT_FALLBACK = '등록하기';
const POPUP_EVENT_TIMEOUT_MS = 15000;
const POPUP_SUBMIT_TIMEOUT_MS = 10000;
const POPUP_POST_SUBMIT_WAIT_MS = 2500;

/**
 * Find the visible photo-upload trigger on the resume edit page, trying
 * PHOTO_TRIGGER_SELECTORS in order and returning the first that resolves
 * to a visible element.
 * @param {import('playwright').Page} page
 * @returns {Promise<import('playwright').Locator|null>}
 */
async function findVisiblePhotoTrigger(page) {
  for (const selector of PHOTO_TRIGGER_SELECTORS) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible().catch(() => false);
    if (visible) return locator;
  }
  return null;
}

/**
 * Upload the profile photo via the JobKorea photo-change popup: click the
 * visible trigger (button.buttonChangePicture / a.buttonAddFile), capture the
 * popup window, set the file on #up_file, and submit via #btn_modify.
 * @param {import('playwright').Page} page
 * @param {string} photoPath
 * @returns {Promise<boolean>} true if the popup flow completed, false otherwise
 */
async function defaultUploadPhoto(page, photoPath) {
  const trigger = await findVisiblePhotoTrigger(page);
  if (!trigger) return false;

  let popup;
  try {
    [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: POPUP_EVENT_TIMEOUT_MS }),
      trigger.click(),
    ]);
  } catch {
    return false;
  }
  if (!popup) return false;

  try {
    await popup.waitForLoadState('domcontentloaded', { timeout: POPUP_EVENT_TIMEOUT_MS });

    try {
      await popup.setInputFiles(POPUP_FILE_INPUT, photoPath);
    } catch {
      await popup.setInputFiles(POPUP_FILE_INPUT_FALLBACK, photoPath);
    }

    try {
      await popup.click(POPUP_SUBMIT, { timeout: POPUP_SUBMIT_TIMEOUT_MS });
    } catch {
      await popup
        .getByText(POPUP_SUBMIT_TEXT_FALLBACK, { exact: true })
        .click({ timeout: POPUP_SUBMIT_TIMEOUT_MS });
    }

    await popup.waitForTimeout(POPUP_POST_SUBMIT_WAIT_MS);
    return true;
  } catch {
    await popup.close().catch(() => {});
    return false;
  }
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
