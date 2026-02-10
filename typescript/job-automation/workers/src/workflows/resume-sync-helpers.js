/**
 * Resume Sync Helpers
 *
 * Extracted helper functions for ResumeSyncWorkflow.
 * All functions that accessed `this.env` now receive `env` as a parameter.
 *
 * Groups:
 * - Data export: getMasterResumeData, exportFromPlatform, exportFromWanted, etc.
 * - Diff calculation: calculateDiff, getItemKey, itemsEqual
 * - Platform sync: syncToPlatform, syncToWanted, wantedApiRequest, etc.
 * - Notifications: notifyPreview, sendSlackNotification
 */

// ============================================================
// DATA EXPORT
// ============================================================

export async function getMasterResumeData(env, resumeId) {
  // Get from SSoT (resume_data.json)
  // In production, this would read from D1 or KV
  const data = await env.DB.prepare('SELECT data FROM resumes WHERE id = ?').bind(resumeId).first();

  return data?.data ? JSON.parse(data.data) : null;
}

export async function exportFromPlatform(env, platform, resumeId) {
  const exporters = {
    wanted: () => exportFromWanted(env, resumeId),
    linkedin: () => exportFromLinkedIn(resumeId),
    remember: () => exportFromRemember(resumeId),
  };

  const exporter = exporters[platform];
  if (!exporter) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await exporter();
}

export async function exportFromWanted(env, resumeId) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) {
    throw new Error('No Wanted session');
  }

  try {
    const response = await fetch(`https://www.wanted.co.kr/api/chaos/resumes/v1/${resumeId}`, {
      headers: {
        Cookie: session,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Wanted API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizeWantedResume(data);
  } catch (error) {
    throw new Error(`Wanted export failed: ${error.message}`);
  }
}

export async function exportFromLinkedIn(_resumeId) {
  // LinkedIn profile export
  return { careers: [], educations: [], skills: [] };
}

export async function exportFromRemember(_resumeId) {
  // Remember profile export
  return { careers: [], educations: [], skills: [] };
}

export function normalizeWantedResume(data) {
  // Normalize Wanted resume format to standard format
  return {
    careers: data.careers || [],
    educations: data.educations || [],
    skills: data.skills || [],
    activities: data.activities || [],
    language_certs: data.language_certs || [],
    links: data.links || [],
  };
}

// ============================================================
// DIFF CALCULATION
// ============================================================

export function calculateDiff(master, platform, sections = []) {
  const diff = {
    additions: [],
    updates: [],
    deletions: [],
  };

  const sectionsToCompare =
    sections.length > 0
      ? sections
      : ['careers', 'educations', 'skills', 'activities', 'language_certs'];

  for (const section of sectionsToCompare) {
    const masterItems = master[section] || [];
    const platformItems = platform[section] || [];

    // Find additions and updates
    for (const masterItem of masterItems) {
      const key = getItemKey(section, masterItem);
      const platformItem = platformItems.find((p) => getItemKey(section, p) === key);

      if (!platformItem) {
        diff.additions.push({ section, item: masterItem });
      } else if (!itemsEqual(masterItem, platformItem)) {
        diff.updates.push({ section, item: masterItem, existing: platformItem });
      }
    }

    // Find deletions
    for (const platformItem of platformItems) {
      const key = getItemKey(section, platformItem);
      const masterItem = masterItems.find((m) => getItemKey(section, m) === key);

      if (!masterItem) {
        diff.deletions.push({ section, item: platformItem });
      }
    }
  }

  return diff;
}

export function getItemKey(section, item) {
  switch (section) {
    case 'careers':
      return `${item.company_name || item.company}:${item.title}`;
    case 'educations':
      return `${item.school_name}:${item.major}`;
    case 'skills':
      return item.text || item.name;
    default:
      return item.id || JSON.stringify(item);
  }
}

export function itemsEqual(a, b) {
  // Simple deep equality check
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================================
// PLATFORM SYNC
// ============================================================

export async function syncToPlatform(env, platform, resumeId, diff) {
  const syncers = {
    wanted: () => syncToWanted(env, resumeId, diff),
    linkedin: () => syncToLinkedIn(resumeId, diff),
    remember: () => syncToRemember(resumeId, diff),
  };

  const syncer = syncers[platform];
  if (!syncer) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  try {
    return await syncer();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function syncToWanted(env, resumeId, diff) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) {
    return { success: false, error: 'No Wanted session' };
  }

  const results = { additions: 0, updates: 0, deletions: 0, errors: [] };

  // Apply additions
  for (const add of diff.additions) {
    try {
      await wantedApiRequest('POST', `resumes/v2/${resumeId}/${add.section}`, add.item, session);
      results.additions++;
    } catch (error) {
      results.errors.push({ action: 'add', section: add.section, error: error.message });
    }
  }

  // Apply updates
  for (const update of diff.updates) {
    try {
      const id = update.existing.id;
      await wantedApiRequest(
        'PATCH',
        `resumes/v2/${resumeId}/${update.section}/${id}`,
        update.item,
        session
      );
      results.updates++;
    } catch (error) {
      results.errors.push({ action: 'update', section: update.section, error: error.message });
    }
  }

  // Apply deletions (skip by default for safety)
  // for (const del of diff.deletions) { ... }

  return {
    success: results.errors.length === 0,
    ...results,
  };
}

export async function wantedApiRequest(method, path, body, session) {
  const response = await fetch(`https://www.wanted.co.kr/api/chaos/${path}`, {
    method,
    headers: {
      Cookie: session,
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function syncToLinkedIn(_resumeId, _diff) {
  return { success: false, error: 'LinkedIn sync not implemented' };
}

export async function syncToRemember(_resumeId, _diff) {
  return { success: false, error: 'Remember sync not implemented' };
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function notifyPreview(env, sync, _diffs) {
  const summary = Object.entries(sync.changes)
    .map(
      ([platform, changes]) =>
        `*${platform}*: +${changes.additions} ~${changes.updates} -${changes.deletions}`
    )
    .join('\n');

  await sendSlackNotification(env, {
    text: '👀 Resume Sync Preview',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '👀 Resume Sync Preview (Dry Run)' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resume*: ${sync.resumeId}\n*Platforms*:\n${summary}`,
        },
      },
    ],
  });
}

export async function sendSlackNotification(env, message) {
  const webhookUrl = env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}
