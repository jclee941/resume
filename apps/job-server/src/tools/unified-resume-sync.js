import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SessionManager } from './auth.js';
import { getTagTypeId, flattenSkills } from '../../scripts/skill-tag-map.js';
import {
  JOB_CATEGORY_MAPPING,
  DEFAULT_JOB_CATEGORY,
} from '../../scripts/profile-sync/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..', '..', '..');
const RESUME_DATA_PATH = join(PROJECT_ROOT, 'packages/data/resumes/master/resume_data.json');
export const unifiedResumeSyncTool = {
  name: 'unified_resume_sync',
  description: `Sync resume_data.json to multiple job platforms.

**Supported Platforms:**
- wanted: API-based sync (full CRUD)
- jobkorea: Browser automation (profile update)
- remember: Browser automation (profile update)

**Actions:**
- status: Check sync status for all platforms
- sync: Sync to specified platform(s)
- diff: Compare local data with platform profile
- preview: Preview changes without applying`,

  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'sync', 'diff', 'preview'],
      },
      platforms: {
        type: 'array',
        items: { type: 'string', enum: ['wanted', 'jobkorea', 'remember'] },
        description: 'Target platforms (default: all)',
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview changes without applying',
      },
      resume_id: {
        type: 'string',
        description: 'Wanted resume ID (required for wanted sync)',
      },
    },
    required: ['action'],
  },

  async execute(params) {
    const { action, platforms = ['wanted', 'jobkorea', 'remember'], dry_run = false } = params;

    if (!existsSync(RESUME_DATA_PATH)) {
      return { success: false, error: `Source not found: ${RESUME_DATA_PATH}` };
    }

    const sourceData = JSON.parse(readFileSync(RESUME_DATA_PATH, 'utf-8'));

    switch (action) {
      case 'status':
        return await checkAllPlatformStatus(platforms);

      case 'diff':
        return await diffAllPlatforms(sourceData, platforms, params);

      case 'preview':
        return previewChanges(sourceData, platforms);

      case 'sync':
        return await syncAllPlatforms(sourceData, platforms, {
          ...params,
          dry_run,
        });

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  },
};

async function checkAllPlatformStatus(platforms) {
  const results = {};

  for (const platform of platforms) {
    results[platform] = await checkPlatformStatus(platform);
  }

  return {
    success: true,
    source: RESUME_DATA_PATH,
    platforms: results,
  };
}

async function checkPlatformStatus(platform) {
  switch (platform) {
    case 'wanted': {
      const api = await SessionManager.getAPI();
      if (!api) return { authenticated: false, error: 'Not logged in' };
      try {
        const resumes = await api.getResumes();
        return {
          authenticated: true,
          resumes: resumes.map((r) => ({ id: r.id, title: r.title })),
        };
      } catch (e) {
        return { authenticated: false, error: e.message };
      }
    }

    case 'jobkorea':
    case 'remember':
      return {
        authenticated: false,
        method: 'browser_automation',
        note: 'Requires manual login via browser',
      };

    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

async function diffAllPlatforms(sourceData, platforms, params) {
  const results = {};

  for (const platform of platforms) {
    results[platform] = await diffPlatform(sourceData, platform, params);
  }

  return { success: true, diff: results };
}

async function diffPlatform(sourceData, platform, params) {
  switch (platform) {
    case 'wanted': {
      const api = await SessionManager.getAPI();
      if (!api) return { error: 'Not authenticated' };
      if (!params.resume_id) return { error: 'resume_id required' };

      try {
        const remote = await api.getResumeDetail(params.resume_id);
        return compareWantedData(sourceData, remote);
      } catch (e) {
        return { error: e.message };
      }
    }

    case 'jobkorea':
    case 'remember':
      return { note: 'Diff requires browser session - use preview instead' };

    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

function compareWantedData(source, remote) {
  const diff = { careers: [], educations: [], skills: [] };

  const localCareers = source.careers || [];
  const remoteCareers = remote.careers || [];

  if (localCareers.length !== remoteCareers.length) {
    diff.careers.push({
      type: 'count_mismatch',
      local: localCareers.length,
      remote: remoteCareers.length,
    });
  }

  for (let i = 0; i < localCareers.length; i++) {
    const local = localCareers[i];
    const remoteMatch = remoteCareers.find((r) =>
      r.company?.name?.includes(local.company?.replace(/[()주]/g, ''))
    );

    if (!remoteMatch) {
      diff.careers.push({ type: 'missing_remote', local });
    }
  }

  return diff;
}

function previewChanges(sourceData, platforms) {
  const preview = {};

  for (const platform of platforms) {
    preview[platform] = mapToplatformFormat(sourceData, platform);
  }

  return { success: true, preview };
}

function mapToplatformFormat(source, platform) {
  switch (platform) {
    case 'wanted':
      return mapToWantedFormat(source);
    case 'jobkorea':
      return mapToJobKoreaFormat(source);
    case 'remember':
      return mapToRememberFormat(source);
    default:
      return { error: 'Unknown platform' };
  }
}

function mapToWantedFormat(source) {
  const currentPosition = source.current?.position || source.careers?.[0]?.role || '';
  const totalExperience = source.summary?.totalExperience || '';
  const expertise = source.summary?.expertise || [];

  return {
    profile: {
      headline: currentPosition ? `${currentPosition} | ${totalExperience}` : totalExperience,
      description: expertise.join(', '),
    },
    careers: (source.careers || []).map((c) => {
      const [startStr, endStr] = (c.period || '').split(/~| - /).map((s) => s.trim());
      const start_time = parseDate(startStr);
      const end_time = endStr === '현재' || !endStr ? null : parseDate(endStr);
      const jobCategoryId = JOB_CATEGORY_MAPPING[c.role] || DEFAULT_JOB_CATEGORY;

      return {
        company: { name: c.company, type: 'CUSTOM' },
        job_role: c.role,
        job_category_id: jobCategoryId,
        start_time,
        end_time,
        served: end_time === null,
        employment_type: 'FULLTIME',
      };
    }),
    educations: [
      {
        school_name: source.education?.school,
        major: source.education?.major,
        degree: '학사',
        start_time: parseDate(source.education?.startDate),
        end_time:
          source.education?.status === '재학중' ? null : parseDate(source.education?.endDate),
        description:
          source.education?.status === '재학중'
            ? `재학중 (${source.education?.startDate || ''} ~ )`
            : null,
      },
    ],
    skills: flattenSkills(source.skills).slice(0, 20),
  };
}

function mapToJobKoreaFormat(source) {
  return {
    name: source.personal.name,
    email: source.personal.email,
    phone: source.personal.phone,
    careers: source.careers.map((c) => ({
      company: c.company,
      position: c.role,
      period: c.period,
      description: c.description,
    })),
    education: {
      school: source.education.school,
      major: source.education.major,
      status: source.education.status,
    },
    certifications: source.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  };
}

function mapToRememberFormat(source) {
  return {
    name: source.personal.name,
    headline: `${source.current?.position || source.careers?.[0]?.role || ''} @ ${source.current?.company || source.careers?.[0]?.company || ''}`,
    experience: source.summary.totalExperience,
    careers: source.careers.map((c) => ({
      company: c.company,
      title: c.role,
      period: c.period,
      project: c.project,
    })),
    skills: source.summary.expertise,
  };
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === '현재') return null;
  const [year, month] = dateStr.split('.');
  return `${year}-${month.padStart(2, '0')}-01`;
}

async function syncAllPlatforms(sourceData, platforms, params) {
  const results = {};

  for (const platform of platforms) {
    results[platform] = await syncPlatform(sourceData, platform, params);
  }

  return {
    success: true,
    dry_run: params.dry_run,
    results,
  };
}

async function syncPlatform(sourceData, platform, params) {
  const mapped = mapToplatformFormat(sourceData, platform);

  switch (platform) {
    case 'wanted':
      return await syncToWanted(mapped, params, sourceData);
    case 'jobkorea':
      return await syncToJobKorea(mapped, params);
    case 'remember':
      return await syncToRemember(mapped, params);
    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

async function syncToWanted(data, params, sourceData = {}) {
  if (!params.resume_id) {
    return { error: 'resume_id required for Wanted sync' };
  }

  const api = await SessionManager.getAPI();
  if (!api) {
    return { error: 'Not authenticated. Use wanted_auth first.' };
  }

  if (params.dry_run) {
    return { dry_run: true, would_sync: data };
  }

  const results = { updated: [], errors: [] };

  // Sync profile (existing)
  try {
    await api.updateProfile({
      headline: data.profile.headline,
      description: data.profile.description,
    });
    results.updated.push('profile');
  } catch (e) {
    results.errors.push({ section: 'profile', error: e.message });
  }

  // Fetch resume detail once for careers/educations/skills matching
  let resumeDetail;
  try {
    resumeDetail = await api.getResumeDetail(params.resume_id);
  } catch (e) {
    results.errors.push({ section: 'resume_detail', error: e.message });
    return results;
  }

  // Sync careers
  try {
    const remoteCareers = resumeDetail.careers || [];
    const localCareers = data.careers || [];
    const ssotCareers = sourceData.careers || [];

    const matchedIds = new Set();
    for (let i = 0; i < localCareers.length; i++) {
      const career = localCareers[i];
      const ssotCareer = ssotCareers[i] || {};
      const companyName = career.company?.name || career.company || '';
      const normalizedName = companyName.replace(/\(주\)/g, '').trim();
      const matchedCareer = remoteCareers.find((rc) =>
        (rc.company?.name || '').includes(normalizedName)
      );

      if (matchedCareer) {
        matchedIds.add(matchedCareer.id);
        await api.resumeCareer.update(params.resume_id, matchedCareer.id, career);
        // Sync projects (career PATCH ignores projects field)
        for (const p of matchedCareer.projects || []) {
          await api.resumeCareer.deleteProject(params.resume_id, matchedCareer.id, p.id);
        }
        if (ssotCareer.project && ssotCareer.description) {
          await api.resumeCareer.addProject(params.resume_id, matchedCareer.id, {
            title: ssotCareer.project,
            description: ssotCareer.description,
          });
        }
      } else {
        const result = await api.resumeCareer.add(params.resume_id, career);
        const newId = result?.data?.id || result?.id;
        if (newId && ssotCareer.project && ssotCareer.description) {
          await api.resumeCareer.addProject(params.resume_id, newId, {
            title: ssotCareer.project,
            description: ssotCareer.description,
          });
        }
      }
    }

    // Delete stale remote careers not in SSoT
    const toDelete = remoteCareers.filter((rc) => !matchedIds.has(rc.id));
    for (const career of toDelete) {
      await api.resumeCareer.delete(params.resume_id, career.id);
    }
    results.updated.push('careers');
  } catch (e) {
    results.errors.push({ section: 'careers', error: e.message });
  }

  // Sync educations
  try {
    const remoteEducations = resumeDetail.educations || [];
    const localEducations = data.educations || [];

    for (const edu of localEducations) {
      const matchedEdu = remoteEducations.find((re) => re.school_name === edu.school_name);

      if (matchedEdu) {
        await api.resumeEducation.update(params.resume_id, matchedEdu.id, edu);
      } else {
        await api.resumeEducation.add(params.resume_id, edu);
      }
    }
    results.updated.push('educations');
  } catch (e) {
    results.errors.push({ section: 'educations', error: e.message });
  }

  // Sync skills (additive only - no deletions)
  try {
    const remoteSkills = resumeDetail.skills || [];
    const localSkills = data.skills || [];

    for (const skillName of localSkills) {
      const skillExists = remoteSkills.some((rs) => rs.name === skillName || rs.text === skillName);

      if (!skillExists) {
        const tagTypeId = getTagTypeId(skillName);
        if (!tagTypeId) {
          console.warn(`[skills] Skipping "${skillName}" - no matching Wanted tag_type_id`);
          continue;
        }
        await api.resumeSkills.add(params.resume_id, { tag_type_id: tagTypeId, text: skillName });
      }
    }
    results.updated.push('skills');
  } catch (e) {
    results.errors.push({ section: 'skills', error: e.message });
  }

  try {
    const localActivities = (sourceData.certifications || [])
      .filter((c) => c.date && c.status !== '준비중')
      .map((cert) => ({
        title: cert.name,
        description: `${cert.issuer} | ${cert.date}`,
        activity_type: 'CERTIFICATE',
        start_time: parseDate(cert.date),
      }));
    const remoteActivities = (resumeDetail.activities || []).filter(
      (activity) => activity.activity_type === 'CERTIFICATE'
    );

    const matchedActivityIds = new Set();
    for (const activity of localActivities) {
      const matchedActivity = remoteActivities.find((ra) => ra.title === activity.title);
      if (matchedActivity) {
        matchedActivityIds.add(matchedActivity.id);
        await api.resumeActivity.update(params.resume_id, matchedActivity.id, activity);
      } else {
        await api.resumeActivity.add(params.resume_id, activity);
      }
    }

    const toDeleteActivities = remoteActivities.filter((ra) => !matchedActivityIds.has(ra.id));
    for (const activity of toDeleteActivities) {
      await api.resumeActivity.delete(params.resume_id, activity.id);
    }
    results.updated.push('activities');
  } catch (e) {
    results.errors.push({ section: 'activities', error: e.message });
  }

  // Sync language certificates
  try {
    const localLanguages = (sourceData.languages || []).map((lang) => ({
      language_name: lang.name,
      level: lang.level === 'Native' ? 5 : lang.level === 'Professional working proficiency' ? 4 : 3,
    }));
    const remoteLanguageCerts = resumeDetail.language_certs || [];

    const matchedLangIds = new Set();
    for (const lang of localLanguages) {
      const matchedLang = remoteLanguageCerts.find((rl) => rl.language_name === lang.language_name);
      if (matchedLang) {
        matchedLangIds.add(matchedLang.id);
        await api.resumeLanguageCert.update(params.resume_id, matchedLang.id, lang);
      } else {
        await api.resumeLanguageCert.add(params.resume_id, lang);
      }
    }

    const toDeleteLangs = remoteLanguageCerts.filter((rl) => !matchedLangIds.has(rl.id));
    for (const lang of toDeleteLangs) {
      await api.resumeLanguageCert.delete(params.resume_id, lang.id);
    }
    results.updated.push('language_certs');
  } catch (e) {
    results.errors.push({ section: 'language_certs', error: e.message });
  }

  try {
    const profileStatement = sourceData.summary?.profileStatement;
    if (typeof profileStatement === 'string' && profileStatement !== (resumeDetail.about || '')) {
      await api.resume.save(params.resume_id, { about: profileStatement });
    }
    results.updated.push('about');
  } catch (e) {
    results.errors.push({ section: 'about', error: e.message });
  }

  try {
    const personal = sourceData.personal || {};
    const contactPayload = {};
    if (personal.email && personal.email !== resumeDetail.email) {
      contactPayload.email = personal.email;
    }
    if (personal.phone && personal.phone !== resumeDetail.mobile) {
      contactPayload.mobile = personal.phone;
    }

    if (Object.keys(contactPayload).length > 0) {
      await api.resume.save(params.resume_id, contactPayload);
    }
    results.updated.push('contact');
  } catch (e) {
    results.errors.push({ section: 'contact', error: e.message });
  }

  return results;
}

async function syncToJobKorea(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to jobkorea.co.kr/User/Resume',
        '2. Fill personal info form',
        '3. Add/update career entries',
        '4. Add certifications',
        '5. Save resume',
      ],
    };
  }

  return {
    error: 'JobKorea sync requires browser automation',
    hint: 'Run with --browser flag or use dashboard UI',
    data_prepared: data,
  };
}

async function syncToRemember(data, params) {
  if (params.dry_run) {
    return {
      dry_run: true,
      method: 'browser_automation',
      would_sync: data,
      steps: [
        '1. Navigate to career.rememberapp.co.kr',
        '2. Login via mobile app QR',
        '3. Update profile headline',
        '4. Add/update career entries',
        '5. Save changes',
      ],
    };
  }

  return {
    error: 'Remember sync requires browser automation',
    hint: 'Run with --browser flag or use dashboard UI',
    data_prepared: data,
  };
}

export default unifiedResumeSyncTool;
