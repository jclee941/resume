import { existsSync, readFileSync } from 'fs';
import { getResumeMasterDataPath } from '../../src/shared/utils/paths.js';
import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { BaseProfileSync } from '../base-profile-sync.js';
import { initBrowser, checkLogin, waitForManualLogin } from './profile-sync/session.js';
import {
  fillPersonalInfo,
  fillCareers,
  fillEducation,
  fillCertifications,
  saveResume,
} from './profile-sync/form-fillers.js';
import {
  normalizeDate,
  parseProfileSections,
  validateExtractedData,
  extractProfileSnapshot,
} from './profile-sync/profile-helpers.js';
import {
  humanDelay,
  randomMouseMovement,
  humanScroll,
  navigateWithRetry,
  detectAuthMaintenanceCaptcha,
  selectActiveResumeIfNeeded,
  getProfile,
} from './profile-sync/navigation.js';
import { syncProfile } from './profile-sync/sync-runner.js';

export class SaraminProfileSync extends BaseProfileSync {
  constructor(options = {}) {
    super(options);
    this.baseCrawler = new BaseCrawler('saramin-profile-sync', {
      baseUrl: 'https://www.saramin.co.kr',
      rateLimit: 1000,
      maxRetries: 3,
      timeout: this.timeout,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
      },
    });
  }

  async init() {
    return /** @type {typeof initBrowser & { call(thisArg: unknown): Promise<import('./profile-sync/session.js').SaraminSessionHost> }} */ (
      initBrowser
    ).call(this);
  }

  async checkLogin() {
    return checkLogin.call(/** @type {{ page: import('playwright').Page }} */ (this));
  }

  async waitForManualLogin() {
    return waitForManualLogin.call(/** @type {{ page: import('playwright').Page }} */ (this));
  }

  /**
   * @param {import('./profile-sync/sync-runner.js').SyncSourceData} sourceData
   * @param {import('./profile-sync/sync-runner.js').SyncProfileOptions} [options]
   */
  async syncProfile(sourceData, options = {}) {
    return syncProfile.call(
      /** @type {import('./profile-sync/sync-runner.js').SaraminSyncContext} */ (this),
      sourceData,
      options
    );
  }

  /**
   * @param {{ name: string, email: string, phone: string }} personal
   */
  async fillPersonalInfo(personal) {
    return fillPersonalInfo.call(
      /** @type {{ page: import('playwright').Page }} */ (this),
      personal
    );
  }

  /**
   * @param {Array<{ company: string, role: string }>} careers
   */
  async fillCareers(careers) {
    return fillCareers.call(/** @type {{ page: import('playwright').Page }} */ (this), careers);
  }

  /**
   * @param {{ school: string, major: string, status?: string | null }} education
   */
  async fillEducation(education) {
    return fillEducation.call(/** @type {{ page: import('playwright').Page }} */ (this), education);
  }

  /**
   * @param {Array<{ name: string, issuer?: string | null, date?: string | null }>} certifications
   */
  async fillCertifications(certifications) {
    return fillCertifications.call(
      /** @type {{ page: import('playwright').Page }} */ (this),
      certifications
    );
  }

  async saveResume() {
    return saveResume.call(/** @type {{ page: import('playwright').Page }} */ (this));
  }

  async humanDelay(min = 1000, max = 3000) {
    return humanDelay.call(this, min, max);
  }

  async randomMouseMovement() {
    return randomMouseMovement.call(this);
  }

  async humanScroll() {
    return humanScroll.call(this);
  }

  /**
   * @param {string} url
   */
  async navigateWithRetry(url) {
    return navigateWithRetry.call(this, url);
  }

  async detectAuthMaintenanceCaptcha() {
    return detectAuthMaintenanceCaptcha.call(this);
  }

  async selectActiveResumeIfNeeded() {
    return selectActiveResumeIfNeeded.call(this);
  }

  /**
   * @param {string | null | undefined} raw
   */
  static normalizeDate(raw) {
    return normalizeDate(raw);
  }

  /**
   * @param {import('./profile-sync/profile-helpers.js').ProfileSnapshot | { fullText?: string, name?: string | null } | null | undefined} snapshot
   */
  static parseProfileSections(snapshot) {
    return parseProfileSections(snapshot);
  }

  /**
   * @param {import('./profile-sync/profile-helpers.js').ParsedProfileData} data
   */
  static validateExtractedData(data) {
    return validateExtractedData(data);
  }

  async extractProfileSnapshot() {
    return extractProfileSnapshot.call(/** @type {{ page: import('playwright').Page }} */ (this));
  }

  async getProfile() {
    return getProfile.call(this);
  }

  async close() {
    this.baseCrawler?.destroy?.();
    await super.close();
  }
}

export async function syncToSaramin(options = {}) {
  const resumeDataPath = getResumeMasterDataPath();
  if (!existsSync(resumeDataPath)) {
    return { error: `Source not found: ${resumeDataPath}` };
  }

  const sourceData = JSON.parse(readFileSync(resumeDataPath, 'utf-8'));
  const sync = new SaraminProfileSync(options);

  try {
    await sync.init();
    return await sync.syncProfile(sourceData, options);
  } finally {
    await sync.close();
  }
}

export default SaraminProfileSync;
