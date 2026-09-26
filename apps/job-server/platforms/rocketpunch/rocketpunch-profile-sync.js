import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'rocketpunch-session.json');

const ROCKETPUNCH_URLS = {
  login: 'https://www.rocketpunch.com/@login',
  profile: 'https://www.rocketpunch.com/@me',
  edit: 'https://www.rocketpunch.com/@me/edit',
};

const ROCKETPUNCH_SELECTORS = {
  name: '.user-name, .name, .profile-header h2',
  headline: '.headline, .intro, .profile-header p',
  email: '.email',
  phone: '.phone',
  nameInput: 'input[name*="name"], input[placeholder*="이름"]',
  emailInput: 'input[name*="email"], input[type="email"]',
  phoneInput: 'input[name*="phone"], input[name*="mobile"]',
  companyInput: 'input[name*="company"], input[placeholder*="회사"]',
  titleInput: 'input[name*="title"], input[placeholder*="직책"]',
  schoolInput: 'input[name*="school"], input[placeholder*="학교"]',
  majorInput: 'input[name*="major"], input[placeholder*="전공"]',
  certInput: 'input[name*="cert"], input[placeholder*="자격증"]',
  skills: '.skill-tag, .skill-item',
};

/**
 * @typedef {Object} RocketPunchProfileSyncOptions
 * @property {boolean} [headless]
 * @property {number} [timeout]
 * @property {string} [sessionPath]
 * @property {Record<string, string>} [urls]
 * @property {Record<string, string>} [selectors]
 * @property {string} [platform]
 */

/**
 * @typedef {RocketPunchProfileSyncOptions & {
 *   sourceData?: import('../browser-profile-sync-runner.js').ProfileSyncSourceData;
 *   dry_run?: boolean;
 * }} RocketPunchSyncOptions
 */

export class RocketPunchProfileSync extends BrowserProfileSync {
  /**
   * @param {RocketPunchProfileSyncOptions} [options]
   */
  constructor(options = {}) {
    super({
      platform: 'rocketpunch',
      urls: ROCKETPUNCH_URLS,
      selectors: ROCKETPUNCH_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }
}

/**
 * @param {RocketPunchSyncOptions} [options]
 */
export async function syncToRocketPunch(options = {}) {
  const sync = new RocketPunchProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default RocketPunchProfileSync;
