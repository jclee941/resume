import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'programmers-session.json');

const PROGRAMMERS_URLS = {
  login: 'https://career.programmers.co.kr/account/sign_in',
  profile: 'https://career.programmers.co.kr/job_profiles',
  edit: 'https://career.programmers.co.kr/job_profiles/edit',
};

const PROGRAMMERS_SELECTORS = {
  name: '.user-name, .name, .profile-name',
  headline: '.headline, .intro, .profile-intro',
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

export class ProgrammersProfileSync extends BrowserProfileSync {
  constructor(options = {}) {
    super({
      platform: 'programmers',
      urls: PROGRAMMERS_URLS,
      selectors: PROGRAMMERS_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }
}

export async function syncToProgrammers(options = {}) {
  const sync = new ProgrammersProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default ProgrammersProfileSync;
