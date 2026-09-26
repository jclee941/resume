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
    return initBrowser.call(this);
  }

  async checkLogin() {
    return checkLogin.call(this);
  }

  async waitForManualLogin() {
    return waitForManualLogin.call(this);
  }

  async syncProfile(sourceData, options = {}) {
    return syncProfile.call(this, sourceData, options);
  }

  async fillPersonalInfo(personal) {
    return fillPersonalInfo.call(this, personal);
  }

  async fillCareers(careers) {
    return fillCareers.call(this, careers);
  }

  async fillEducation(education) {
    return fillEducation.call(this, education);
  }

  async fillCertifications(certifications) {
    return fillCertifications.call(this, certifications);
  }

  async saveResume() {
    return saveResume.call(this);
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

  async navigateWithRetry(url) {
    return navigateWithRetry.call(this, url);
  }

  async detectAuthMaintenanceCaptcha() {
    return detectAuthMaintenanceCaptcha.call(this);
  }

  async selectActiveResumeIfNeeded() {
    return selectActiveResumeIfNeeded.call(this);
  }

  static normalizeDate(raw) {
    return normalizeDate(raw);
  }

  static parseProfileSections(snapshot) {
    return parseProfileSections(snapshot);
  }

  static validateExtractedData(data) {
    return validateExtractedData(data);
  }

  async extractProfileSnapshot() {
    return extractProfileSnapshot.call(this);
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
