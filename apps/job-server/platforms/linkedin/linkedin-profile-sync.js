/**
 * LinkedIn profile sync — MANUAL-ONLY mode.
 *
 * LinkedIn has strict bot detection and rate limiting. Direct automated
 * profile writes carry high risk of account restriction. This implementation
 * provides read-only / preview functionality only.
 */
import { BrowserProfileSync } from '../browser-profile-sync.js';
import { getResumeBasePath } from '../../src/shared/utils/paths.js';
import { join } from 'path';

const PROJECT_ROOT = getResumeBasePath();
const SESSION_PATH = join(PROJECT_ROOT, 'linkedin-session.json');

const LINKEDIN_URLS = {
  login: 'https://www.linkedin.com/login',
  profile: 'https://www.linkedin.com/in/me/',
};

const LINKEDIN_SELECTORS = {
  name: '.text-heading-xlarge, h1',
  headline: '.text-body-medium, [class*="headline"]',
  email: '',
  phone: '',
  skills: '.pv-skill-category-entity__name-text, [class*="skill"]',
};

export class LinkedInProfileSync extends BrowserProfileSync {
  constructor(options = {}) {
    super({
      platform: 'linkedin',
      urls: LINKEDIN_URLS,
      selectors: LINKEDIN_SELECTORS,
      sessionPath: SESSION_PATH,
      ...options,
    });
  }

  async syncProfile(sourceData, options = {}) {
    const { dry_run = false } = options;

    if (!(await this.checkLogin())) {
      if (dry_run) {
        return { error: 'Not logged in', dry_run: true };
      }
      await this.waitForManualLogin();
    }

    const current = await this.getProfile().catch(() => ({ data: null }));

    if (dry_run) {
      return {
        dry_run: true,
        method: 'manual_required',
        message:
          'LinkedIn does not support automated profile writes due to strict bot detection. Use the preview below to update manually.',
        would_update: {
          personal: sourceData.personal,
          careers: sourceData.careers?.length ?? 0,
          education: sourceData.education,
          certifications: sourceData.certifications?.length ?? 0,
        },
        current_profile: current.data,
        manual_steps: [
          '1. Go to https://www.linkedin.com/in/me/edit/contact-info/',
          '2. Update Headline with: ' +
            `${sourceData.current?.position || sourceData.careers?.[0]?.role || ''} | ${sourceData.summary?.totalExperience || ''}`,
          '3. Update Experience section with career entries',
          '4. Update Education section',
          '5. Add Licenses & Certifications',
          '6. Update Skills section',
        ],
      };
    }

    return {
      success: false,
      manual_required: true,
      message: 'LinkedIn profile sync requires manual update. Use dry_run mode to see preview.',
      current_profile: current.data,
    };
  }
}

export async function syncToLinkedIn(options = {}) {
  const sync = new LinkedInProfileSync(options);
  try {
    await sync.init();
    return await sync.syncProfile(options.sourceData || {}, options);
  } finally {
    await sync.close();
  }
}

export default LinkedInProfileSync;
