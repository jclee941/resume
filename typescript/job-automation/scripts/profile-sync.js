#!/usr/bin/env node
/**
 * Profile Sync Script - SSOT to Job Platforms
 *
 * Syncs resume_data.json (Single Source of Truth) to external job platforms:
 * - Wanted (wanted.co.kr) - Uses WantedAPI (no browser automation needed)
 * - JobKorea (jobkorea.co.kr) - Browser-based sync
 * - Saramin (saramin.co.kr) - Browser-based sync
 *
 * Usage:
 *   node profile-sync.js                    # Sync all platforms (dry-run)
 *   node profile-sync.js --apply            # Actually apply changes
 *   node profile-sync.js wanted --apply     # Sync specific platform
 *   node profile-sync.js --diff             # Show diff only
 *
 * Requires:
 *   - Active sessions for each platform (run auth-persistent.js first)
 *   - resume_data.json in typescript/data/resumes/master/
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WantedAPI from '../src/shared/clients/wanted/index.js';
import { flattenSkills, diffSkills } from './skill-tag-map.js';
import WantedClient from '../workers/src/services/wanted-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  SSOT_PATH: path.resolve(__dirname, '../../data/resumes/master/resume_data.json'),
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
  HEADLESS: process.argv.includes('--headless'),
  APPLY: process.argv.includes('--apply'),
  DIFF_ONLY: process.argv.includes('--diff'),
};

const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    profileUrl: 'https://www.wanted.co.kr/cv/list',
    editUrl: 'https://www.wanted.co.kr/cv/edit',
    selectors: {
      name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      headline: 'textarea[name="introduction"]',
      skills: '[data-testid="skills-section"]',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      introduction: ssot.summary.profileStatement,
    }),
  },
  jobkorea: {
    name: 'JobKorea',
    profileUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    editUrl: 'https://www.jobkorea.co.kr/User/Resume/RegResume',
    selectors: {
      name: '#userName',
      email: '#userEmail',
      phone: '#userPhone',
      headline: '#selfIntroduce',
      skills: '.skill-tag-area',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current.position} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
  saramin: {
    name: 'Saramin',
    profileUrl: 'https://www.saramin.co.kr/zf_user/member/info',
    editUrl: 'https://www.saramin.co.kr/zf_user/resume/write',
    selectors: {
      name: '#name',
      email: '#email',
      phone: '#phone',
      headline: '#selfIntro',
      skills: '.skill-list',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current.position} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
};

function log(msg, type = 'info', platform = null) {
  const prefix =
    { info: 'INFO', success: 'OK', warn: 'WARN', error: 'ERR', diff: 'DIFF' }[type] || 'LOG';
  const tag = platform ? `[${platform.toUpperCase()}]` : '';
  console.log(`${new Date().toISOString()} [${prefix}] ${tag} ${msg}`);
}

function loadSSOT() {
  if (!fs.existsSync(CONFIG.SSOT_PATH)) {
    throw new Error(`SSOT not found: ${CONFIG.SSOT_PATH}`);
  }
  const data = JSON.parse(fs.readFileSync(CONFIG.SSOT_PATH, 'utf-8'));
  log(`Loaded SSOT: ${data.personal.name}`, 'success');
  return data;
}

function toE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '+82' + digits.slice(1);
  }
  if (digits.startsWith('82')) {
    return '+' + digits;
  }
  return phone;
}

function _toKoreanPhone(phone) {
  if (!phone) return '';
  let digits = phone.replace(/^\+82/, '0').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

async function getCurrentProfile(page, platform) {
  const config = PLATFORMS[platform];
  const profile = {};

  try {
    await page.goto(config.profileUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Check if logged in
    const url = page.url();
    if (url.includes('login') || url.includes('auth')) {
      log('Not logged in - session expired', 'error', platform);
      return null;
    }

    // Extract current values based on platform
    if (platform === 'wanted') {
      // Wanted uses SNS API - fetch from profile page
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('[class*="ProfileName"]');
        const headlineEl = document.querySelector('[class*="Introduction"]');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: headlineEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    } else if (platform === 'jobkorea') {
      // JobKorea profile extraction
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('.user-name, .resume-name');
        const titleEl = document.querySelector('.resume-title, .self-intro');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: titleEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    } else if (platform === 'saramin') {
      // Saramin profile extraction
      const profileData = await page.evaluate(() => {
        const nameEl = document.querySelector('.user_name, .name');
        const titleEl = document.querySelector('.intro_txt, .self-intro');
        return {
          name: nameEl?.textContent?.trim() || '',
          headline: titleEl?.textContent?.trim() || '',
        };
      });
      profile.name = profileData.name;
      profile.headline = profileData.headline;
    }

    log(`Current profile: ${JSON.stringify(profile)}`, 'info', platform);
    return profile;
  } catch (error) {
    log(`Failed to get profile: ${error.message}`, 'error', platform);
    return null;
  }
}

function computeDiff(current, target) {
  const changes = [];
  for (const [key, targetValue] of Object.entries(target)) {
    const currentValue = current[key];
    if (currentValue !== targetValue) {
      changes.push({
        field: key,
        from: currentValue || '(empty)',
        to: targetValue,
      });
    }
  }
  return changes;
}

async function applyChanges(page, platform, changes) {
  if (changes.length === 0) {
    log('No changes to apply', 'success', platform);
    return true;
  }

  const config = PLATFORMS[platform];

  try {
    // Navigate to edit page
    await page.goto(config.editUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    for (const change of changes) {
      log(`Applying: ${change.field} = ${change.to}`, 'info', platform);

      const selector = config.selectors[change.field];
      if (!selector) {
        log(`No selector for field: ${change.field}`, 'warn', platform);
        continue;
      }

      const element = await page.$(selector);
      if (!element) {
        log(`Element not found: ${selector}`, 'warn', platform);
        continue;
      }

      // Clear and fill
      await element.click({ clickCount: 3 });
      await element.fill(change.to);
      await page.waitForTimeout(500);
    }

    // Look for save button
    const saveButton = await page.$(
      'button[type="submit"], .btn-save, .save-btn, [data-testid="save"]'
    );
    if (saveButton) {
      await saveButton.click();
      await page.waitForTimeout(3000);
      log('Changes saved', 'success', platform);
    } else {
      log('Save button not found - changes may not be saved', 'warn', platform);
    }

    return true;
  } catch (error) {
    log(`Failed to apply changes: ${error.message}`, 'error', platform);
    return false;
  }
}

function loadWantedSession() {
  const sessionPath = path.join(CONFIG.SESSION_DIR, 'wanted-session.json');
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  try {
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
    if (!session.cookies) {
      return null;
    }
    // Handle both string format (from auth-sync.js) and array format (legacy)
    if (typeof session.cookies === 'string') {
      return session.cookies.length > 0 ? session.cookies : null;
    }
    if (Array.isArray(session.cookies) && session.cookies.length > 0) {
      return session.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sync skills from SSOT to Wanted resume
 * @param {WantedAPI} api - Authenticated WantedAPI instance
 * @param {Object} ssot - SSOT data from resume_data.json
 * @param {Object} profile - Current Wanted profile data
 * @returns {Object} Result with changes count, added, deleted counts
 */
async function syncWantedSkills(api, ssot, profile) {
  const ssotSkills = flattenSkills(ssot.skills);
  const wantedSkills = profile.skills || [];

  const diff = diffSkills(ssotSkills, wantedSkills);

  log(
    `Skills: ${diff.unchanged.length} unchanged, ${diff.toAdd.length} to add, ${diff.toDelete.length} to delete`,
    'info',
    'wanted'
  );

  if (diff.unmapped.length > 0) {
    log(`Unmapped skills (no tagTypeId): ${diff.unmapped.join(', ')}`, 'warn', 'wanted');
  }

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    // Dry run - just show diff
    for (const skill of diff.toAdd) {
      console.log(`  + ${skill.name} (tagTypeId: ${skill.tagTypeId})`);
    }
    for (const skill of diff.toDelete) {
      console.log(`  - ${skill.name} (id: ${skill.id})`);
    }
    return {
      changes: diff.toAdd.length + diff.toDelete.length,
      added: 0,
      deleted: 0,
      dryRun: true,
    };
  }

  // Get resumeId from resumes API
  const resumes = await api.getResumeList();
  const resumeId = resumes?.[0]?.key;
  if (!resumeId) {
    log('Could not get resumeId for skills sync', 'error', 'wanted');
    return { changes: 0, added: 0, deleted: 0 };
  }

  // Add missing skills
  let added = 0;
  for (const skill of diff.toAdd) {
    try {
      await api.resumeSkills.add(resumeId, { tag_type_id: skill.tagTypeId });
      log(`Added skill: ${skill.name}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }

  // Delete extra skills
  let deleted = 0;
  for (const skill of diff.toDelete) {
    try {
      await api.resumeSkills.delete(resumeId, skill.id);
      log(`Deleted skill: ${skill.name}`, 'success', 'wanted');
      deleted++;
    } catch (e) {
      log(`Failed to delete ${skill.name}: ${e.message}`, 'error', 'wanted');
    }
  }

  return { changes: added + deleted, added, deleted };
}

/**
 * Parse period string to start/end dates
 * @param {string} period - e.g., "2024.03 ~ 2025.02" or "2025.03 ~ 현재"
 * @returns {{startsAt: string, endsAt: string|null}}
 */
function parsePeriod(period) {
  const parts = period.split('~').map((p) => p.trim());
  const startsAt = parts[0].replace('.', '-') + '-01';
  let endsAt = null;
  if (parts[1] && parts[1] !== '현재') {
    endsAt = parts[1].replace('.', '-') + '-01';
  }
  return { startsAt, endsAt };
}

/**
 * Job category ID mapping for Wanted Korea
 * Maps Korean role names to Wanted job category IDs
 * @see typescript/job-automation/src/tools/get-categories.js
 */
const JOB_CATEGORY_MAPPING = {
  // Security roles → 672 (보안 엔지니어)
  '보안운영 담당': 672,
  '보안 엔지니어': 672,
  보안엔지니어: 672,
  정보보안: 672,

  // DevOps/Infra roles → 674 (DevOps / 시스템 관리자)
  '인프라 엔지니어': 674,
  '인프라 담당': 674,
  DevOps: 674,
  SRE: 674,
  'SRE Engineer': 674,
  '클라우드 엔지니어': 674,

  // System/Network Admin → 665 (시스템,네트워크 관리자)
  '시스템 엔지니어': 665,
  '네트워크 엔지니어': 665,
  'IT지원/OA운영': 665,
  'IT 운영': 665,

  // Backend → 872 (서버 개발자)
  'Backend Developer': 872,
  '백엔드 개발자': 872,
  '서버 개발자': 872,
};

// Default category if role not found
const DEFAULT_JOB_CATEGORY = 674; // DevOps / 시스템 관리자

/**
 * Map SSOT career to Wanted career format
 * @param {Object} career - SSOT career object
 * @returns {Object} Wanted career format
 */
function mapCareerToWanted(career) {
  const { startsAt, endsAt } = parsePeriod(career.period);

  // Lookup job_category_id from mapping
  const jobCategoryId = JOB_CATEGORY_MAPPING[career.role] || DEFAULT_JOB_CATEGORY;
  if (!JOB_CATEGORY_MAPPING[career.role]) {
    console.log(
      chalk.yellow(
        `⚠️  Unknown role "${career.role}" - using default category ${DEFAULT_JOB_CATEGORY}`
      )
    );
  }

  return {
    company: {
      name: career.company,
      type: 'CUSTOM',
    },
    job_role: career.role,
    job_category_id: jobCategoryId,
    start_time: startsAt,
    end_time: endsAt,
    served: endsAt === null,
    employment_type: 'FULLTIME',
    projects: [
      {
        title: career.project,
        description: career.description,
      },
    ],
  };
}

/**
 * Diff and sync careers from SSOT to Wanted
 * @param {WantedClient} client - Authenticated WantedClient
 * @param {Object} ssot - SSOT data
 * @param {Object} profile - Current Wanted profile
 * @param {string} resumeId - Wanted resume ID
 */
async function syncWantedCareers(client, ssot, profile, resumeId) {
  const ssotCareers = ssot.careers || [];

  const resumeDetail = await client.getResumeDetail(resumeId);
  const wantedCareers = resumeDetail?.careers || [];

  log(
    `Careers: SSOT has ${ssotCareers.length}, Wanted has ${wantedCareers.length}`,
    'info',
    'wanted'
  );

  const toUpdate = [];
  const toAdd = [];
  const matched = new Set();

  for (const ssotCareer of ssotCareers) {
    const ssotCompanyNormalized = ssotCareer.company.replace(/\(주\)/g, '').trim();

    const wantedCareer = wantedCareers.find((w) => {
      const companyName = w.company?.name || '';
      return companyName.includes(ssotCompanyNormalized);
    });

    const mapped = mapCareerToWanted(ssotCareer);

    if (wantedCareer) {
      matched.add(wantedCareer.id);
      toUpdate.push({
        id: wantedCareer.id,
        data: mapped,
        ssot: ssotCareer,
      });
    } else {
      toAdd.push({ data: mapped, ssot: ssotCareer });
    }
  }

  log(`Careers: ${toUpdate.length} to override, ${toAdd.length} to add`, 'info', 'wanted');

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const item of toUpdate) {
      console.log(`  ~ ${item.ssot.company}: ${item.ssot.role}`);
    }
    for (const item of toAdd) {
      console.log(`  + ${item.ssot.company}: ${item.ssot.role}`);
    }
    return {
      changes: toUpdate.length + toAdd.length,
      updated: 0,
      added: 0,
      dryRun: true,
    };
  }

  let updated = 0;
  for (const item of toUpdate) {
    try {
      await client.updateCareer(resumeId, item.id, item.data);
      log(`Updated career: ${item.ssot.company}`, 'success', 'wanted');
      updated++;
    } catch (e) {
      log(`Failed to update ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }

  let added = 0;
  for (const item of toAdd) {
    try {
      await client.addCareer(resumeId, item.data);
      log(`Added career: ${item.ssot.company}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.ssot.company}: ${e.message}`, 'error', 'wanted');
    }
  }

  return { changes: updated + added, updated, added };
}

/**
 * Diff and sync education from SSOT to Wanted
 * @param {WantedClient} client - Authenticated WantedClient
 * @param {Object} ssot - SSOT data
 * @param {Object} profile - Current Wanted profile
 * @param {string} resumeId - Wanted resume ID
 */
async function syncWantedEducations(client, ssot, profile, resumeId) {
  const ssotEducation = ssot.education;
  const wantedEducations = profile.educations || [];

  log(`Education: SSOT has 1, Wanted has ${wantedEducations.length}`, 'info', 'wanted');

  // Find matching education by school name
  const wantedEdu = wantedEducations.find((w) => w.name && w.name.includes(ssotEducation.school));

  const ssotData = {
    school_name: ssotEducation.school,
    major: ssotEducation.major,
    start_time: ssotEducation.startDate.replace('.', '-') + '-01',
    end_time: null, // 재학중
    degree: '학사',
  };

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    if (wantedEdu) {
      console.log(`  = ${ssotEducation.school} (already exists)`);
    } else {
      console.log(`  + ${ssotEducation.school}: ${ssotEducation.major}`);
    }
    return { changes: wantedEdu ? 0 : 1, updated: 0, added: 0, dryRun: true };
  }

  if (wantedEdu) {
    return { changes: 0, updated: 0, added: 0 };
  } else {
    // Add new
    try {
      await client.addEducation(resumeId, ssotData);
      log(`Added education: ${ssotEducation.school}`, 'success', 'wanted');
      return { changes: 1, updated: 0, added: 1 };
    } catch (e) {
      log(`Failed to add education: ${e.message}`, 'error', 'wanted');
      return { changes: 0, updated: 0, added: 0 };
    }
  }
}

/**
 * Diff and sync certifications as activities to Wanted
 * @param {WantedClient} client - Authenticated WantedClient
 * @param {Object} ssot - SSOT data
 * @param {Object} profile - Current Wanted profile
 * @param {string} resumeId - Wanted resume ID
 */
async function syncWantedActivities(client, ssot, profile, resumeId) {
  const ssotCerts = ssot.certifications || [];
  const wantedActivities = profile.activities || [];

  log(
    `Activities: SSOT has ${ssotCerts.length} certs, Wanted has ${wantedActivities.length}`,
    'info',
    'wanted'
  );

  const toAdd = [];
  const matched = new Set();

  for (const cert of ssotCerts) {
    // Find matching activity by title
    const existing = wantedActivities.find((w) => w.title && w.title.includes(cert.name));

    if (existing) {
      matched.add(existing.id);
    } else {
      toAdd.push({
        data: {
          title: cert.name,
          description: `${cert.issuer} | ${cert.date}`,
          start_time: cert.date.replace('.', '-') + '-01',
          activity_type: 'CERTIFICATE',
        },
        cert,
      });
    }
  }

  log(`Activities: ${matched.size} matched, ${toAdd.length} to add`, 'info', 'wanted');

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    for (const item of toAdd) {
      console.log(`  + ${item.cert.name} (${item.cert.issuer})`);
    }
    return { changes: toAdd.length, added: 0, dryRun: true };
  }

  let added = 0;
  for (const item of toAdd) {
    try {
      await client.addActivity(resumeId, item.data);
      log(`Added activity: ${item.cert.name}`, 'success', 'wanted');
      added++;
    } catch (e) {
      log(`Failed to add ${item.cert.name}: ${e.message}`, 'error', 'wanted');
    }
  }

  return { changes: added, added };
}

// normalizePhone: alias for toE164 (defined at top of file)
function normalizePhone(phone) {
  return toE164(phone);
}

async function syncWantedAbout(client, ssot, resumeDetail, resumeId) {
  const ssotAbout = ssot.summary?.profileStatement || '';
  const wantedAbout = resumeDetail?.about || '';

  if (ssotAbout === wantedAbout) {
    log('About: no changes', 'info', 'wanted');
    return { changes: 0 };
  }

  log(
    `About: "${wantedAbout.slice(0, 30)}..." -> "${ssotAbout.slice(0, 30)}..."`,
    'diff',
    'wanted'
  );

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    return { changes: 1, dryRun: true };
  }

  try {
    await client.updateResumeFields(resumeId, { about: ssotAbout });
    log('Updated about field', 'success', 'wanted');
    return { changes: 1, updated: 1 };
  } catch (e) {
    log(`Failed to update about: ${e.message}`, 'error', 'wanted');
    return { changes: 0 };
  }
}

async function syncWantedContactInfo(client, ssot, resumeDetail, resumeId) {
  const updates = {};
  const changes = [];

  if (ssot.personal?.email && ssot.personal.email !== resumeDetail?.email) {
    updates.email = ssot.personal.email;
    changes.push({
      field: 'email',
      from: resumeDetail?.email,
      to: ssot.personal.email,
    });
  }

  const normalizedPhone = normalizePhone(ssot.personal?.phone);
  if (normalizedPhone && normalizedPhone !== resumeDetail?.mobile) {
    updates.mobile = normalizedPhone;
    changes.push({
      field: 'mobile',
      from: resumeDetail?.mobile,
      to: normalizedPhone,
    });
  }

  if (changes.length === 0) {
    log('Contact: no changes', 'info', 'wanted');
    return { changes: 0 };
  }

  for (const c of changes) {
    log(`${c.field}: "${c.from}" -> "${c.to}"`, 'diff', 'wanted');
  }

  if (!CONFIG.APPLY || CONFIG.DIFF_ONLY) {
    return { changes: changes.length, dryRun: true };
  }

  try {
    await client.updateResumeFields(resumeId, updates);
    log(`Updated ${Object.keys(updates).join(', ')}`, 'success', 'wanted');
    return { changes: changes.length, updated: changes.length };
  } catch (e) {
    log(`Failed to update contact: ${e.message}`, 'error', 'wanted');
    return { changes: 0 };
  }
}

async function syncWantedViaAPI(ssot) {
  log('Starting sync for Wanted (via API)', 'info', 'wanted');

  const cookieString = loadWantedSession();
  if (!cookieString) {
    log('No saved session - run auth-persistent.js wanted first', 'error', 'wanted');
    return { success: false, changes: [] };
  }

  try {
    const api = new WantedAPI(cookieString);

    const profile = await api.getSnsProfile();
    if (!profile || !profile.user?.name) {
      log('Failed to get profile - session may be expired', 'error', 'wanted');
      return { success: false, changes: [] };
    }

    const current = {
      name: profile.user?.name || '',
      introduction: profile.user?.description || '',
    };

    const target = PLATFORMS.wanted.mapData(ssot);

    const changes = computeDiff(current, target);

    if (changes.length > 0) {
      log(`Found ${changes.length} profile change(s):`, 'diff', 'wanted');
      for (const change of changes) {
        console.log(`  ${change.field}: "${change.from}" -> "${change.to}"`);
      }
    }

    // Profile updates (require --apply, no internal dry-run)
    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      const updateData = {};
      for (const change of changes) {
        if (change.field === 'introduction') {
          updateData.description = change.to;
        } else if (change.field === 'name') {
          updateData.name = change.to;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await api.updateProfile(updateData);
        log('Profile updated via API', 'success', 'wanted');
      }
    }

    // Resume syncs - these have internal dry-run logic, so run in both modes
    const resumes = await api.getResumeList();
    const resumeId = resumes?.[0]?.key;

    if (resumeId) {
      const client = new WantedClient(cookieString);

      const skillsResult = await syncWantedSkills(api, ssot, profile);
      if (skillsResult.changes > 0) {
        changes.push({
          field: 'skills',
          from: `${skillsResult.deleted} skills`,
          to: `+${skillsResult.added} skills`,
        });
      }

      const careersResult = await syncWantedCareers(client, ssot, profile, resumeId);
      if (careersResult.added > 0 || careersResult.updated > 0) {
        changes.push({
          field: 'careers',
          from: `${careersResult.updated} updated`,
          to: `+${careersResult.added} added`,
        });
      }

      const educationsResult = await syncWantedEducations(client, ssot, profile, resumeId);
      if (educationsResult.added > 0 || educationsResult.updated > 0) {
        changes.push({
          field: 'educations',
          from: `${educationsResult.updated} updated`,
          to: `+${educationsResult.added} added`,
        });
      }

      const activitiesResult = await syncWantedActivities(client, ssot, profile, resumeId);
      if (activitiesResult.added > 0 || activitiesResult.updated > 0) {
        changes.push({
          field: 'activities',
          from: `${activitiesResult.updated} updated`,
          to: `+${activitiesResult.added} added`,
        });
      }

      const resumeDetail = await client.getResumeDetail(resumeId);

      const aboutResult = await syncWantedAbout(client, ssot, resumeDetail?.resume, resumeId);
      if (aboutResult.updated > 0) {
        changes.push({ field: 'about', from: 'old', to: 'updated' });
      }

      const contactResult = await syncWantedContactInfo(
        client,
        ssot,
        resumeDetail?.resume,
        resumeId
      );
      if (contactResult.updated > 0) {
        changes.push({ field: 'contact', from: 'old', to: 'updated' });
      }
    } else {
      log('No resumeId found - skipping career/education/activity sync', 'warn', 'wanted');
    }

    const dryRun = !CONFIG.APPLY || CONFIG.DIFF_ONLY;
    return { success: true, changes, dryRun };
  } catch (error) {
    log(`Sync failed: ${error.message}`, 'error', 'wanted');
    return { success: false, changes: [], error: error.message };
  }
}

async function syncPlatformViaBrowser(platformKey, ssot) {
  const config = PLATFORMS[platformKey];

  const userDataDir = path.join(CONFIG.USER_DATA_DIR, platformKey);
  if (!fs.existsSync(userDataDir)) {
    log(`No saved session - run auth-persistent.js ${platformKey} first`, 'error', platformKey);
    return { success: false, changes: [] };
  }

  log(`Starting sync for ${config.name}`, 'info', platformKey);

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: CONFIG.HEADLESS,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = browser.pages()[0] || (await browser.newPage());

  try {
    const current = await getCurrentProfile(page, platformKey);
    if (!current) {
      await browser.close();
      return { success: false, changes: [] };
    }

    const target = config.mapData(ssot);
    const changes = computeDiff(current, target);

    if (changes.length === 0) {
      log('Profile is up to date', 'success', platformKey);
      await browser.close();
      return { success: true, changes: [] };
    }

    log(`Found ${changes.length} change(s):`, 'diff', platformKey);
    for (const change of changes) {
      console.log(`  ${change.field}: "${change.from}" -> "${change.to}"`);
    }

    if (CONFIG.APPLY && !CONFIG.DIFF_ONLY) {
      const applied = await applyChanges(page, platformKey, changes);
      await browser.close();
      return { success: applied, changes };
    }

    await browser.close();
    return { success: true, changes, dryRun: true };
  } catch (error) {
    log(`Sync failed: ${error.message}`, 'error', platformKey);
    await browser.close();
    return { success: false, changes: [], error: error.message };
  }
}

async function syncPlatform(platformKey, ssot) {
  const config = PLATFORMS[platformKey];
  if (!config) {
    log(`Unknown platform: ${platformKey}`, 'error');
    return { success: false, changes: [] };
  }

  if (platformKey === 'wanted') {
    return syncWantedViaAPI(ssot);
  }

  return syncPlatformViaBrowser(platformKey, ssot);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Profile Sync - SSOT to Job Platforms');
  console.log('='.repeat(60));

  // Parse args
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const targetPlatforms = args.length > 0 ? args : Object.keys(PLATFORMS);

  log(`Mode: ${CONFIG.APPLY ? 'APPLY' : 'DRY-RUN'}`);
  log(`Platforms: ${targetPlatforms.join(', ')}`);
  log(`Headless: ${CONFIG.HEADLESS}`);
  console.log('-'.repeat(60));

  // Load SSOT
  const ssot = loadSSOT();

  // Sync each platform
  const results = {};
  for (const platform of targetPlatforms) {
    if (!PLATFORMS[platform]) {
      log(`Skipping unknown platform: ${platform}`, 'warn');
      continue;
    }

    console.log('\n' + '='.repeat(40));
    results[platform] = await syncPlatform(platform, ssot);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const [platform, result] of Object.entries(results)) {
    const status = result.success ? 'OK' : 'FAIL';
    const changes = result.changes?.length || 0;
    const mode = result.dryRun ? '(dry-run)' : '';
    console.log(`  ${platform.padEnd(12)} ${status.padEnd(6)} ${changes} changes ${mode}`);
  }

  if (!CONFIG.APPLY) {
    console.log('\nRun with --apply to actually update profiles');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
