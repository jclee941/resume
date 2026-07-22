import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from '../constants.js';
import { log } from '../sync-logger.js';

/**
 * JobKorea resume photo upload selectors — CONFIRMED via a LIVE run of the
 * popup flow on 2026-07-22 (see jobkorea-handler/_photo-probe.mjs for the
 * earlier read-only DOM probe).
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
 *   3. Setting the file triggers a Jcrop crop UI (`.jcrop-holder` and its
 *      `.jcrop-hline` / `.jcrop-vline` / `.jcrop-tracker` handles) with the
 *      instruction "파일 선택 후 마우스를 드래그하여 사진 크기를 편집하세요." JobKorea
 *      auto-selects a crop region once Jcrop initializes, so no manual drag
 *      is required. Requirement text: "권장 사진 사이즈는 150X210픽셀이며, gif, jpg,
 *      jpeg, png 이미지 파일만 등록 가능합니다." — the source image must be at least
 *      150x210px and gif/jpg/jpeg/png; only gif/jpg/jpeg/png are accepted.
 *   4. The popup form is #form1, posting multipart/form-data to
 *      https://file2.jobkorea.co.kr/Net/UserPhoto/Upload.
 *   5. The popup submit button is #btn_modify ("등록하기"). On ACCEPTANCE,
 *      JobKorea posts to /Net/UserPhoto/Modify and CLOSES the popup (firing
 *      callback photoChangeCallback) — that popup close is the only reliable
 *      success signal. On REJECTION (e.g. source smaller than 150x210), it
 *      shows a JS alert dialog ("새로운 이미지를 업로드해주세요.") and the popup STAYS
 *      OPEN with the photo unchanged — a rejection must be treated as failure
 *      even though the click itself succeeds.
 *
 * GUARD — never clobber an existing photo. The user may upload their profile
 * photo MANUALLY on JobKorea, and the sync must never silently roll that back
 * by re-uploading the repo's photo. Two env flags control this module:
 *   - JOBKOREA_SYNC_PHOTO=true    opts in to running the photo step at all.
 *   - JOBKOREA_PHOTO_OVERWRITE=true  is REQUIRED to replace an existing photo.
 *     Without it, if a photo is already present (div.picture.dropped, a
 *     populated div.picture .image img[src], or input.dev-photo value=True)
 *     appendPhotoUpload logs and returns without touching the page.
 */
const PHOTO_TRIGGER_SELECTORS = ['button.buttonChangePicture', 'a.buttonAddFile'];
const EXISTING_PHOTO_SELECTORS = {
  dropped: 'div.picture.dropped',
  image: 'div.picture .image img',
  hiddenFlag: 'input.dev-photo, input[class*=dev-photo]',
};
const POPUP_FILE_INPUT = '#up_file';
const POPUP_FILE_INPUT_FALLBACK = 'input[name="up_file"]';
const CROP_HOLDER = '.jcrop-holder';
const POPUP_SUBMIT = '#btn_modify';
const POPUP_SUBMIT_TEXT_FALLBACK = '등록하기';
const POPUP_EVENT_TIMEOUT_MS = 15000;
const POPUP_SUBMIT_TIMEOUT_MS = 10000;
const CROP_INIT_TIMEOUT_MS = 6000;
const POPUP_CLOSE_TIMEOUT_MS = 6000;

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
 * popup window, set the file on #up_file, wait for the Jcrop crop UI to
 * initialize, and submit via #btn_modify. Success is determined by the
 * popup closing (JobKorea posts to /Net/UserPhoto/Modify and closes on
 * acceptance); rejection (e.g. source smaller than 150x210px) surfaces as a
 * JS alert dialog and leaves the popup open, which is treated as failure.
 * @param {import('playwright').Page} page
 * @param {string} photoPath
 * @returns {Promise<boolean>} true only if the popup closed with no rejection dialog
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

  let rejectionMessage = null;
  popup.on('dialog', async (dialog) => {
    rejectionMessage = dialog.message();
    await dialog.dismiss().catch(() => {});
  });

  try {
    await popup.waitForLoadState('domcontentloaded', { timeout: POPUP_EVENT_TIMEOUT_MS });

    try {
      await popup.setInputFiles(POPUP_FILE_INPUT, photoPath);
    } catch {
      await popup.setInputFiles(POPUP_FILE_INPUT_FALLBACK, photoPath);
    }

    await popup.waitForSelector(CROP_HOLDER, { timeout: CROP_INIT_TIMEOUT_MS }).catch(() => {});

    try {
      await popup.click(POPUP_SUBMIT, { timeout: POPUP_SUBMIT_TIMEOUT_MS });
    } catch {
      await popup
        .getByText(POPUP_SUBMIT_TEXT_FALLBACK, { exact: true })
        .click({ timeout: POPUP_SUBMIT_TIMEOUT_MS });
    }

    const closed = await popup
      .waitForEvent('close', { timeout: POPUP_CLOSE_TIMEOUT_MS })
      .then(() => true)
      .catch(() => false);

    if (rejectionMessage) return false;
    if (!closed) {
      await popup.close().catch(() => {});
      return false;
    }
    return true;
  } catch {
    await popup.close().catch(() => {});
    return false;
  }
}

/**
 * Detect whether a profile photo is already set on the resume edit page, so
 * appendPhotoUpload can avoid clobbering a manually-uploaded photo. Considers
 * a photo existing if the picture widget carries the "dropped" class, its
 * <img> has a non-empty src, or the hidden dev-photo flag reads "True". On
 * any evaluation error, returns false — a broken probe must not block a
 * legitimate first-time upload.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function defaultHasExistingPhoto(page) {
  try {
    return await page.evaluate((selectors) => {
      if (document.querySelector(selectors.dropped)) return true;
      const img = document.querySelector(selectors.image);
      if (img && img.getAttribute('src')) return true;
      const hiddenFlag = document.querySelector(selectors.hiddenFlag);
      if (hiddenFlag && hiddenFlag.value === 'True') return true;
      return false;
    }, EXISTING_PHOTO_SELECTORS);
  } catch {
    return false;
  }
}

function buildPhotoUploadError(photoPath, timestamp) {
  const error = new Error(
    'JobKorea profile photo upload failed — the change-photo popup did not close ' +
      'cleanly. Check the image meets JobKorea requirements (min 150x210px; ' +
      `gif/jpg/jpeg/png only) and that the 사진변경 popup flow is reachable (path=${photoPath}, timestamp=${timestamp})`
  );
  error.failLoud = true;
  return error;
}

/**
 * Upload the SSOT profile photo to the JobKorea resume edit page. Guarded by
 * two env flags: JOBKOREA_SYNC_PHOTO=true opts in to running this step at
 * all (checked by the caller), and JOBKOREA_PHOTO_OVERWRITE=true is required
 * to replace a photo that already exists — without it, an existing (e.g.
 * manually-uploaded) photo is left untouched and the step is skipped.
 * @param {import('playwright').Page} page
 * @param {object} [options]
 * @param {string} [options.photoPath]
 * @param {(page: import('playwright').Page, photoPath: string) => Promise<boolean>} [options.uploadPhoto]
 * @param {(page: import('playwright').Page) => Promise<boolean>} [options.hasExistingPhoto]
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

  const hasExistingPhoto = options.hasExistingPhoto ?? defaultHasExistingPhoto;
  if (process.env.JOBKOREA_PHOTO_OVERWRITE !== 'true' && (await hasExistingPhoto(page))) {
    logger(
      'JobKorea profile photo already set — keeping it (set JOBKOREA_PHOTO_OVERWRITE=true to replace)',
      'info',
      'jobkorea'
    );
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
