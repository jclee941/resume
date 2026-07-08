import { syncToJobKoreaAPI } from '../../../scripts/profile-sync/jobkorea-handler/sync-api-only.js';

/**
 * Map resume SSoT data to JobKorea platform format.
 *
 * @param {object} source - Resume SSoT data
 * @returns {object} JobKorea formatted resume
 */
export function mapToJobKoreaFormat(source) {
  return {
    name: source?.personal?.name ?? '',
    email: source?.personal?.email ?? '',
    phone: source?.personal?.phone ?? '',
    careers: (source?.careers ?? []).map((c) => ({
      company: c.company ?? '',
      position: c.role ?? '',
      period: c.period ?? '',
      description: c.description ?? '',
    })),
    education: {
      school: source?.education?.school ?? '',
      major: source?.education?.major ?? '',
      status: source?.education?.status ?? '',
    },
    certifications: (source?.certifications ?? []).map((c) => ({
      name: c.name ?? '',
      issuer: c.issuer ?? '',
      date: c.date ?? '',
    })),
  };
}

/**
 * Sync resume data to JobKorea via API-only (no browser automation).
 *
 * @param {object} data - Resume SSoT data
 * @param {object} params - Sync parameters
 * @param {string} [params.cookieString] - JobKorea session cookies (required)
 * @param {string} [params.rNo] - Resume number
 * @param {boolean} [params.dry_run] - Preview without saving
 * @returns {Promise<object>} Sync result
 */
export async function syncToJobKorea(data, params = {}) {
  if (params.dry_run) {
    return {
      dry_run: true,
      mode: 'api-only',
      would_sync: mapToJobKoreaFormat(data),
      steps: [
        '1. Validate JWT session (jkat cookie)',
        '2. Fetch edit page tokens',
        '3. Build form data from SSoT',
        '4. Register portfolio URL (if present)',
        '5. Save resume via POST /User/Resume/Save',
      ],
    };
  }

  if (!params.cookieString) {
    return {
      error: 'cookieString required for API-only sync. Authenticate via jobkorea_auth first.',
    };
  }

  try {
    const result = await syncToJobKoreaAPI(data, {
      cookieString: params.cookieString,
      rNo: params.rNo || process.env.JOBKOREA_RNO,
      dryRun: false,
    });
    return result;
  } catch (e) {
    return { error: e.message, mode: 'api-only' };
  }
}
