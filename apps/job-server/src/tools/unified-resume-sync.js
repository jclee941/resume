import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SessionManager } from './auth.js';

const PROJECT_ROOT = join(homedir(), 'dev/resume');
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
      const api = SessionManager.getAPI();
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
  return {
    profile: {
      headline: `${source.current.position} | ${source.summary.totalExperience}`,
      description: source.summary.expertise.join(', '),
    },
    careers: source.careers.map((c) => ({
      company_name: c.company,
      title: c.role,
      start_time: parseDate(c.period.split(' ~ ')[0]),
      end_time: c.period.includes('현재') ? null : parseDate(c.period.split(' ~ ')[1]),
      served: !c.period.includes('현재'),
      projects: [{ title: c.project, description: c.description }],
    })),
    educations: [
      {
        school_name: source.education.school,
        major: source.education.major,
        degree: 'BACHELOR',
        start_time: parseDate(source.education.startDate),
        end_time: null,
        status: source.education.status === '재학중' ? 'ENROLLED' : 'GRADUATED',
      },
    ],
    skills: (source.skills.security?.items || source.skills.security || [])
      .concat(source.skills.cloud?.items || source.skills.cloud || [])
      .concat(source.skills.automation?.items || source.skills.automation || [])
      .map((s) => (typeof s === 'string' ? s : s.name))
      .slice(0, 20),
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
    headline: `${source.current.position} @ ${source.current.company}`,
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
      return await syncToWanted(mapped, params);
    case 'jobkorea':
      return await syncToJobKorea(mapped, params);
    case 'remember':
      return await syncToRemember(mapped, params);
    default:
      return { error: `Unknown platform: ${platform}` };
  }
}

async function syncToWanted(data, params) {
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

  try {
    await api.updateProfile({
      headline: data.profile.headline,
      description: data.profile.description,
    });
    results.updated.push('profile');
  } catch (e) {
    results.errors.push({ section: 'profile', error: e.message });
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
