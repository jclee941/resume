import { existsSync, readFileSync } from 'fs';
import { getResumeMasterDataPath } from '../../src/shared/utils/paths.js';
import { BaseCrawler } from '../../src/crawlers/base-crawler.js';
import { SARAMIN_URLS } from './profile-sync/constants.js';
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

export class SaraminProfileSync {
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.page = null;
    this.timeout = options.timeout || 30000;
    this.debug = options.debug ?? false;
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

  log(...args) {
    if (this.debug) {
      console.debug('[SaraminProfileSync]', ...args);
    }
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
    const { dry_run = false } = options;
    const results = { updated: [], skipped: [], errors: [] };

    if (!(await this.checkLogin())) {
      if (dry_run) {
        return { error: 'Not logged in', dry_run: true };
      }
      await this.waitForManualLogin();
    }

    await this.page.goto(SARAMIN_URLS.resumeEdit, {
      waitUntil: 'load',
    });

    const resumeLinks = await this.page
      .$$eval('a[href*="/zf_user/"], a[href*="resume"]', (links) => links.map((l) => l.href))
      .catch(() => []);

    if (resumeLinks.length === 0) {
      return { error: 'No resumes found. Please create one manually first.' };
    }

    if (dry_run) {
      return {
        dry_run: true,
        resume_url: SARAMIN_URLS.resumeEdit,
        would_update: {
          personal: sourceData.personal,
          careers: sourceData.careers.length,
          certifications: sourceData.certifications.length,
        },
      };
    }

    try {
      await this.fillPersonalInfo(sourceData.personal);
      results.updated.push('personal');
    } catch (e) {
      results.errors.push({ section: 'personal', error: e.message });
    }

    try {
      await this.fillCareers(sourceData.careers);
      results.updated.push('careers');
    } catch (e) {
      results.errors.push({ section: 'careers', error: e.message });
    }

    try {
      await this.fillEducation(sourceData.education);
      results.updated.push('education');
    } catch (e) {
      results.errors.push({ section: 'education', error: e.message });
    }

    try {
      await this.fillCertifications(sourceData.certifications);
      results.updated.push('certifications');
    } catch (e) {
      results.errors.push({ section: 'certifications', error: e.message });
    }

    await this.saveResume();

    return results;
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
    if (this.browser) {
      await this.browser.close();
    }
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
