import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'indeed-session.json');

const INDEED_URLS = {
  login: 'https://secure.indeed.com/account/login',
  profile: 'https://profile.indeed.com/',
  edit: 'https://profile.indeed.com/resume',
};

const INDEED_SELECTORS = {
  name: '.user-name, .name, [data-testid*="name"]',
  headline: '.headline, .intro',
  email: '.email',
  phone: '.phone',
  nameInput: 'input[name*="name"], input[placeholder*="Name"]',
  emailInput: 'input[name*="email"], input[type="email"]',
  phoneInput: 'input[name*="phone"], input[name*="mobile"]',
  companyInput: 'input[name*="company"], input[placeholder*="Company"]',
  titleInput: 'input[name*="title"], input[placeholder*="Job title"]',
  schoolInput: 'input[name*="school"], input[placeholder*="School"]',
  majorInput: 'input[name*="major"], input[placeholder*="Degree"]',
  certInput: 'input[name*="cert"], input[placeholder*="Certification"]',
  skills: '.skill-tag, .skill-item',
};

export class IndeedProfileSync extends BrowserProfileSync {
  constructor(options = {}) {
    super({
      platform: 'indeed',
      urls: INDEED_URLS,
      selectors: INDEED_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }
}

export async function syncToIndeed(options = {}) {
  const sync = new IndeedProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default IndeedProfileSync;
