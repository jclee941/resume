import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'rallit-session.json');

const RALLIT_URLS = {
  login: 'https://rallit.com/login',
  profile: 'https://rallit.com/hub',
  edit: 'https://rallit.com/hub/resume',
};

const RALLIT_SELECTORS = {
  name: '.user-name, .name, [class*="profile"] h2',
  headline: '.headline, .intro, [class*="intro"]',
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

export class RallitProfileSync extends BrowserProfileSync {
  constructor(options = {}) {
    super({
      platform: 'rallit',
      urls: RALLIT_URLS,
      selectors: RALLIT_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }
}

export async function syncToRallit(options = {}) {
  const sync = new RallitProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default RallitProfileSync;
