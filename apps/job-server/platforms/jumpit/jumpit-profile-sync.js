import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'jumpit-session.json');

const JUMPIT_URLS = {
  login: 'https://www.jumpit.co.kr/auth/login',
  profile: 'https://www.jumpit.co.kr/mypage/profile',
  edit: 'https://www.jumpit.co.kr/mypage/profile/edit',
};

const JUMPIT_SELECTORS = {
  name: '.user-name, .name, [class*="profile"] h2',
  headline: '.headline, .intro, [class*="intro"]',
  email: '.email, [class*="email"]',
  phone: '.phone, [class*="phone"]',
  nameInput: 'input[name*="name"], input[placeholder*="이름"]',
  emailInput: 'input[name*="email"], input[type="email"]',
  phoneInput: 'input[name*="phone"], input[name*="mobile"]',
  companyInput: 'input[name*="company"], input[placeholder*="회사"]',
  titleInput: 'input[name*="title"], input[placeholder*="직책"]',
  schoolInput: 'input[name*="school"], input[placeholder*="학교"]',
  majorInput: 'input[name*="major"], input[placeholder*="전공"]',
  certInput: 'input[name*="cert"], input[placeholder*="자격증"]',
  skills: '.skill-tag, [class*="skill-item"]',
};

export class JumpitProfileSync extends BrowserProfileSync {
  constructor(options = {}) {
    super({
      platform: 'jumpit',
      urls: JUMPIT_URLS,
      selectors: JUMPIT_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }
}

export async function syncToJumpit(options = {}) {
  const sync = new JumpitProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default JumpitProfileSync;
