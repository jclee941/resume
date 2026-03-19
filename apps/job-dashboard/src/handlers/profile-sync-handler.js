import { BaseHandler } from './base-handler.js';
import { WantedClient } from '../services/wanted-client.js';
import { normalizeError } from '../../../job-server/src/shared/errors/index.js';
import { sendTelegramNotification } from '../services/notification/telegram.js';

const JOB_CATEGORY_MAPPING = {
  '보안운영 담당': 672,
  '보안 엔지니어': 672,
  보안엔지니어: 672,
  정보보안: 672,
  정보보호팀: 672,
  '인프라 엔지니어': 674,
  '인프라 담당': 674,
  DevOps: 674,
  SRE: 674,
  'SRE Engineer': 674,
  '클라우드 엔지니어': 674,
  '시스템 엔지니어': 665,
  '네트워크 엔지니어': 665,
  'IT지원/OA운영': 665,
  'IT 운영': 665,
};

const DEFAULT_JOB_CATEGORY = 674;

function parsePeriod(period = '') {
  const parts = String(period)
    .split('~')
    .map((part) => part.trim())
    .filter(Boolean);
  const start = parts[0] ? `${parts[0].replace('.', '-')}-01` : null;
  const end = parts[1] && parts[1] !== '현재' ? `${parts[1].replace('.', '-')}-01` : null;
  return { start, end };
}

function normalizePhone(phone = '') {
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `+82${digits.slice(1)}`;
  if (digits.startsWith('82')) return `+${digits}`;
  return phone;
}

function mapCareerToWanted(career) {
  const { start, end } = parsePeriod(career.period);
  return {
    company: { name: career.company, type: 'CUSTOM' },
    job_role: career.role,
    job_category_id: JOB_CATEGORY_MAPPING[career.role] || DEFAULT_JOB_CATEGORY,
    start_time: start,
    end_time: end,
    served: end === null,
    employment_type: 'FULLTIME',
  };
}

function mapEducationToWanted(education) {
  return {
    school_name: education.school,
    major: education.major,
    start_time: education.startDate ? `${education.startDate.replace('.', '-')}-01` : null,
    end_time: null,
    degree: '학사',
  };
}

function mapCertificationToWanted(certification) {
  return {
    title: certification.name,
    description: `${certification.issuer || ''} | ${certification.date || ''}`.trim(),
    start_time: certification.date ? `${certification.date.replace('.', '-')}-01` : null,
    activity_type: 'CERTIFICATE',
  };
}

function buildProfileData(ssotData) {
  return {
    name: ssotData.personal?.name,
    email: ssotData.personal?.email,
    phone: ssotData.personal?.phone,
    headline:
      `${ssotData.current?.position || 'Engineer'} | ${ssotData.summary?.totalExperience || ''}`.trim(),
    skills: Array.isArray(ssotData.summary?.expertise) ? ssotData.summary.expertise.join(',') : '',
    summary: ssotData.summary?.profileStatement || '',
  };
}

export class ProfileSyncHandler extends BaseHandler {
  async triggerProfileSync(request) {
    const body = await request.json().catch(() => ({}));
    const logicalResumeId = body.resumeId || 'master';
    let targetResumeId = body.targetResumeId || null;
    let ssotData = body.ssotData || null;
    const platforms =
      Array.isArray(body.platforms) && body.platforms.length > 0 ? body.platforms : ['wanted'];
    const dryRun = body.dryRun !== false;
    const callbackUrl = body.callbackUrl;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      if (!ssotData) {
        const stored = await db
          .prepare('SELECT data, target_resume_id FROM resumes WHERE id = ?')
          .bind(logicalResumeId)
          .first();

        if (!stored?.data) {
          return this.jsonResponse(
            { success: false, error: 'No stored master resume found. Upload resume JSON first.' },
            404
          );
        }

        ssotData = JSON.parse(stored.data);
        targetResumeId = targetResumeId || stored.target_resume_id || null;
      }

      if (!ssotData?.personal) {
        return this.jsonResponse(
          { success: false, error: 'Invalid SSOT data: missing personal info' },
          400
        );
      }

      const now = new Date().toISOString();
      const syncId = `sync_${Date.now()}`;
      const profileData = buildProfileData(ssotData);

      await db
        .prepare(
          `INSERT INTO profile_syncs (id, platforms, profile_data, status, dry_run, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          syncId,
          JSON.stringify(platforms),
          JSON.stringify({ logicalResumeId, targetResumeId, profileData }),
          'running',
          dryRun ? 1 : 0,
          now,
          now
        )
        .run()
        .catch(() => {});

      const results = {};

      if (platforms.includes('wanted')) {
        results.wanted = await this._syncWantedProfile(
          ssotData,
          profileData,
          dryRun,
          targetResumeId
        );
      }

      const otherPlatforms = platforms.filter((platform) => platform !== 'wanted');
      if (otherPlatforms.length > 0 && callbackUrl) {
        const callbackPayload = {
          syncId,
          platforms: otherPlatforms,
          profileData,
          dryRun,
          timestamp: now,
        };

        const platformAuth = {};
        for (const platform of otherPlatforms) {
          const cookies = await this.auth.getCookies(platform);
          platformAuth[platform] = { authenticated: !!cookies };
        }
        callbackPayload.platformAuth = platformAuth;

        const callbackResponse = await fetch(callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(callbackPayload),
          signal: AbortSignal.timeout(30000),
        }).catch((err) => ({ ok: false, error: err.message }));

        const callbackResult = callbackResponse.ok
          ? await callbackResponse.json().catch(() => ({}))
          : null;

        for (const platform of otherPlatforms) {
          results[platform] = callbackResponse.ok
            ? {
                method: 'callback',
                dispatched: true,
                automationResult: callbackResult,
              }
            : {
                method: 'callback',
                error: callbackResponse.error || `HTTP ${callbackResponse.status}`,
              };
        }
      } else {
        for (const platform of otherPlatforms) {
          const cookies = await this.auth.getCookies(platform);
          results[platform] = {
            method: 'callback_required',
            authenticated: !!cookies,
            wouldUpdate: profileData,
            message: 'Browser automation required (provide callbackUrl)',
          };
        }
      }

      const hasFailures = Object.values(results).some((result) => {
        if (!result) return false;
        if (result.error) return true;
        if (result.authenticated === false) return true;
        if (result.method === 'callback' && result.dispatched === false) return true;
        return Array.isArray(result?.syncResults?.failed) && result.syncResults.failed.length > 0;
      });
      const status = dryRun
        ? hasFailures
          ? 'dry_run_failed'
          : 'dry_run_complete'
        : hasFailures
          ? 'partial_failed'
          : 'completed';
      const success = !hasFailures;

      await db
        .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
        .bind(status, JSON.stringify(results), now, syncId)
        .run()
        .catch(() => {});

      return this.jsonResponse({
        success,
        message: dryRun
          ? success
            ? 'Dry run complete.'
            : 'Dry run completed with issues.'
          : success
            ? 'Profile sync completed.'
            : 'Profile sync completed with issues.',
        syncId,
        dryRun,
        resumeId: logicalResumeId,
        targetResumeId,
        platforms,
        profileData,
        platformResults: results,
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'triggerProfileSync',
      });
      console.error('Profile sync failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  async _syncWantedProfile(ssotData, profileData, dryRun, targetResumeId) {
    const cookies = await this.auth.getCookies('wanted');
    if (!cookies) {
      return {
        method: 'chaos_api',
        error: 'Wanted authentication required. Please login first.',
        authenticated: false,
      };
    }

    const client = new WantedClient(cookies);

    try {
      const resumes = await client.getResumeList();
      const selectedResume =
        resumes.find((resume) => String(resume.id || resume.key) === String(targetResumeId)) ||
        resumes.find((resume) => resume.is_default) ||
        resumes[0];

      if (!selectedResume) {
        return {
          method: 'chaos_api',
          error: 'No resumes found in Wanted account',
          authenticated: true,
        };
      }

      const resumeId = selectedResume.id || selectedResume.key;
      const currentResume = await client.getResumeDetail(resumeId);
      const changes = this._buildWantedChanges(ssotData, profileData, currentResume);

      if (dryRun) {
        return {
          method: 'chaos_api',
          authenticated: true,
          dryRun: true,
          resumeId,
          currentResume: {
            id: currentResume?.id,
            title: currentResume?.title,
            careersCount: currentResume?.careers?.length || 0,
            skillsCount: currentResume?.skills?.length || 0,
          },
          proposedChanges: changes,
          wouldUpdate: profileData,
        };
      }

      const syncResults = { updated: [], failed: [] };

      if (changes.profile.changed) {
        try {
          await client.updateProfile({ description: profileData.headline });
          syncResults.updated.push('profile_headline');
        } catch (error) {
          syncResults.failed.push({ section: 'profile_headline', error: error.message });
        }
      }

      if (Object.keys(changes.resumeFields.updates).length > 0) {
        try {
          await client.updateResumeFields(resumeId, changes.resumeFields.updates);
          syncResults.updated.push(...changes.resumeFields.sections);
        } catch (error) {
          syncResults.failed.push({ section: 'resume_fields', error: error.message });
        }
      }

      for (const career of changes.careers.toUpdate) {
        try {
          await client.updateCareer(resumeId, career.id, career.data);
          // Sync projects (career PATCH ignores projects field)
          for (const p of career.existingProjects || []) {
            await client.deleteProject(resumeId, career.id, p.id);
          }
          if (career.ssotCareer?.project && career.ssotCareer?.description) {
            await client.addProject(resumeId, career.id, {
              title: career.ssotCareer.project,
              description: career.ssotCareer.description,
            });
          }
          syncResults.updated.push(`career:${career.company}`);
        } catch (error) {
          syncResults.failed.push({ section: `career:${career.company}`, error: error.message });
        }
      }

      for (const career of changes.careers.toAdd) {
        try {
          const result = await client.addCareer(resumeId, career.data);
          const newCareerId = result?.data?.id || result?.id;
          if (newCareerId && career.ssotCareer?.project && career.ssotCareer?.description) {
            await client.addProject(resumeId, newCareerId, {
              title: career.ssotCareer.project,
              description: career.ssotCareer.description,
            });
          }
          syncResults.updated.push(`career:${career.company}`);
        } catch (error) {
          syncResults.failed.push({ section: `career:${career.company}`, error: error.message });
        }
      }

      for (const career of changes.careers.toDelete) {
        try {
          await client.deleteCareer(resumeId, career.id);
          syncResults.updated.push(`career_deleted:${career.company}`);
        } catch (error) {
          syncResults.failed.push({ section: `career_delete:${career.company}`, error: error.message });
        }
      }

      for (const education of changes.educations.toAdd) {
        try {
          await client.addEducation(resumeId, education.data);
          syncResults.updated.push(`education:${education.school}`);
        } catch (error) {
          syncResults.failed.push({
            section: `education:${education.school}`,
            error: error.message,
          });
        }
      }

      for (const activity of changes.activities.toAdd) {
        try {
          await client.addActivity(resumeId, activity.data);
          syncResults.updated.push(`activity:${activity.title}`);
        } catch (error) {
          syncResults.failed.push({ section: `activity:${activity.title}`, error: error.message });
        }
      }

      try {
        await client.saveResume(resumeId);
        syncResults.updated.push('resume_pdf');
      } catch (error) {
        syncResults.failed.push({ section: 'resume_pdf', error: error.message });
      }

      return {
        method: 'chaos_api',
        authenticated: true,
        dryRun: false,
        resumeId,
        syncResults,
        message: `Synced ${syncResults.updated.length} sections, ${syncResults.failed.length} failed`,
      };
    } catch (error) {
      return {
        method: 'chaos_api',
        authenticated: true,
        error: error.message,
      };
    }
  }

  _buildWantedChanges(ssotData, profileData, currentResume) {
    const currentCareers = currentResume?.careers || [];
    const currentEducations = currentResume?.educations || [];
    const currentActivities = currentResume?.activities || [];
    const about = ssotData.summary?.profileStatement || '';
    const updates = {};
    const sections = [];

    if (about && about !== (currentResume?.about || '')) {
      updates.about = about;
      sections.push('about');
    }

    if (ssotData.personal?.email && ssotData.personal.email !== currentResume?.email) {
      updates.email = ssotData.personal.email;
      sections.push('email');
    }

    const mobile = normalizePhone(ssotData.personal?.phone);
    if (mobile && mobile !== currentResume?.mobile) {
      updates.mobile = mobile;
      sections.push('mobile');
    }

    const careerChanges = { toUpdate: [], toAdd: [], toDelete: [] };
    for (const career of ssotData.careers || []) {
      const normalizedCompany = String(career.company || '')
        .replace(/\(주\)/g, '')
        .trim();
      const existing = currentCareers.find((item) =>
        String(item.company?.name || item.company_name || '').includes(normalizedCompany)
      );
      const mapped = mapCareerToWanted(career);
      if (existing) {
        careerChanges.toUpdate.push({
          id: existing.id,
          company: career.company,
          data: mapped,
          ssotCareer: career,
          existingProjects: existing.projects || [],
        });
      } else {
        careerChanges.toAdd.push({ company: career.company, data: mapped, ssotCareer: career });
      }
    }
    // Identify stale Wanted careers not in SSoT for deletion
    const matchedIds = new Set(careerChanges.toUpdate.map((c) => c.id));
    for (const existing of currentCareers) {
      if (!matchedIds.has(existing.id)) {
        careerChanges.toDelete.push({
          id: existing.id,
          company: existing.company?.name || existing.company_name || 'unknown',
        });
      }
    }

    const educationChanges = { toAdd: [] };
    if (ssotData.education?.school) {
      const exists = currentEducations.find((item) =>
        String(item.name || item.school_name || '').includes(ssotData.education.school)
      );
      if (!exists) {
        educationChanges.toAdd.push({
          school: ssotData.education.school,
          data: mapEducationToWanted(ssotData.education),
        });
      }
    }

    const activityChanges = { toAdd: [] };
    for (const certification of (ssotData.certifications || []).filter((c) => c.date && c.status !== '준비중')) {
      const exists = currentActivities.find((item) =>
        String(item.title || '').includes(certification.name || '')
      );
      if (!exists) {
        activityChanges.toAdd.push({
          title: certification.name,
          data: mapCertificationToWanted(certification),
        });
      }
    }

    return {
      profile: {
        changed: profileData.headline !== '',
        current: null,
        proposed: profileData.headline,
      },
      resumeFields: {
        updates,
        sections,
      },
      careers: careerChanges,
      educations: educationChanges,
      activities: activityChanges,
    };
  }

  async getProfileSyncStatus(request) {
    const syncId = request.params?.syncId;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const sync = await db
        .prepare('SELECT * FROM profile_syncs WHERE id = ?')
        .bind(syncId)
        .first();

      if (!sync) {
        return this.jsonResponse({ success: false, error: 'Sync not found' }, 404);
      }

      return this.jsonResponse({
        success: true,
        sync: {
          id: sync.id,
          platforms: JSON.parse(sync.platforms || '[]'),
          status: sync.status,
          dryRun: !!sync.dry_run,
          result: sync.result ? JSON.parse(sync.result) : null,
          createdAt: sync.created_at,
          updatedAt: sync.updated_at,
        },
      });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'getProfileSyncStatus',
        syncId,
      });
      console.error('Get profile sync status failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }

  async updateProfileSyncStatus(request) {
    const body = await request.json().catch(() => ({}));
    const { syncId, status, result } = body;
    const db = this.env?.DB;

    if (!db) {
      return this.jsonResponse({ success: false, error: 'Database not configured' }, 503);
    }

    try {
      const now = new Date().toISOString();
      await db
        .prepare('UPDATE profile_syncs SET status = ?, result = ?, updated_at = ? WHERE id = ?')
        .bind(status, JSON.stringify(result || {}), now, syncId)
        .run();

      if (status === 'completed') {
        const platforms = result?.platforms || [];
        const successCount = platforms.filter((platform) => platform.success).length;
      await sendTelegramNotification(this.env,
        `✅ <b>Profile Sync Complete</b>: ${successCount}/${platforms.length} platforms updated`
      );
      }

      return this.jsonResponse({ success: true, message: 'Sync status updated', syncId, status });
    } catch (error) {
      const normalized = normalizeError(error, {
        handler: 'ProfileSyncHandler',
        action: 'updateProfileSyncStatus',
        syncId,
      });
      console.error('Update profile sync status failed:', normalized);
      return this.jsonResponse({ success: false, error: normalized.message }, 500);
    }
  }
}
