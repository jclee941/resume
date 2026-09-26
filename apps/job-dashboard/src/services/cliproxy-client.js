// Must be a model cliproxy serves (GET /v1/models); an unserved id fails every
// search with HTTP 400 "unknown provider", which silently stopped discovery.
const DEFAULT_MODEL = 'gpt-6-pro';

/**
 * @typedef {Object} CliproxyEnv
 * @property {string} [CLIPROXY_BASE]
 * @property {string} [CLIPROXY_API_KEY]
 * @property {string} [CLIPROXY_MODEL]
 */

/**
 * @typedef {Object} CliproxyOptions
 * @property {string} [baseUrl]
 * @property {string} [apiKey]
 * @property {string} [model]
 * @property {typeof fetch} [fetcher]
 */

/**
 * @typedef {Object} CliproxyCandidateProfile
 * @property {string[]} [skills]
 * @property {number} [experienceYears]
 * @property {string[]} [preferredLocations]
 */

/**
 * @typedef {Object} SearchJobsOptions
 * @property {number} [limit]
 * @property {CliproxyCandidateProfile} [profile]
 */

/**
 * @typedef {Object} RawCliproxyJob
 * @property {string | number} [id]
 * @property {string} [company]
 * @property {string} [position]
 * @property {string} [title]
 * @property {string} [sourceUrl]
 * @property {string} [url]
 * @property {string} [location]
 * @property {string} [description]
 * @property {string} [summary]
 * @property {string} [experience]
 * @property {string} [postedAt]
 * @property {string} [postedDate]
 * @property {string} [companyScale]
 * @property {string} [scale]
 * @property {number | string} [companySize]
 * @property {number | string} [employeeCount]
 * @property {boolean} [isEnterprise]
 * @property {boolean} [isLargeCompany]
 * @property {unknown} [matchScore]
 */

/**
 * @typedef {Object} NormalizedCliproxyJob
 * @property {string} id
 * @property {string} sourceId
 * @property {string} source
 * @property {string} company
 * @property {string} position
 * @property {string} sourceUrl
 * @property {string} location
 * @property {string} description
 * @property {string} experience
 * @property {string} postedAt
 * @property {string} companyScale
 * @property {number} companySize
 * @property {number | string} [employeeCount]
 * @property {boolean} isEnterprise
 * @property {boolean} isLargeCompany
 * @property {number | undefined} matchScore
 * @property {boolean} adapterBacked
 */

export class CliproxyClient {
  /**
   * @param {CliproxyEnv} [env]
   * @param {CliproxyOptions} [options]
   */
  constructor(env = {}, options = {}) {
    this.baseUrl = normalizeBaseUrl(env.CLIPROXY_BASE || options.baseUrl);
    this.apiKey = normalizeApiKey(env.CLIPROXY_API_KEY || options.apiKey);
    this.model = env.CLIPROXY_MODEL || options.model || DEFAULT_MODEL;
    this.fetcher =
      options.fetcher || /** @type {typeof fetch} */ ((...args) => globalThis.fetch(...args));
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  /**
   * @param {string} keyword
   * @param {SearchJobsOptions} [options]
   * @returns {Promise<{ jobs: NormalizedCliproxyJob[] }>}
   */
  async searchJobs(keyword, { limit = 10, profile } = {}) {
    if (!this.isConfigured()) {
      return { jobs: [] };
    }

    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Return only JSON. Find large-company job postings relevant to the user. Do not invent URLs.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              keyword,
              limit,
              requiredFields: ['id', 'company', 'position', 'sourceUrl', 'companyScale'],
              // Scoring inputs for calculateMatchScore (skills, experience, location, freshness).
              optionalFields: ['description', 'experience', 'location', 'postedAt'],
              acceptedCompanyScale: ['large', 'enterprise'],
              ...scoringRequest(profile),
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await readErrorDetails(response);
      throw new Error(
        `Cliproxy job search failed with HTTP ${response.status || 'error'}${details}`
      );
    }

    const payload = await response.json().catch(() => null);
    const text = payload?.choices?.[0]?.message?.content || '';
    const jobs = parseJobs(text)
      .slice(0, limit)
      .map((job, index) => ({
        id: String(job.id || `cliproxy-${index}`),
        sourceId: String(job.id || `cliproxy-${index}`),
        source: 'cliproxy',
        company: String(job.company || ''),
        position: String(job.position || job.title || ''),
        sourceUrl: normalizeHttpUrl(job.sourceUrl || job.url),
        location: String(job.location || ''),
        description: String(job.description || job.summary || ''),
        experience: String(job.experience || ''),
        postedAt: String(job.postedAt || job.postedDate || ''),
        companyScale: String(job.companyScale || job.scale || ''),
        companySize: Number(job.companySize || job.employeeCount || 0),
        isEnterprise: job.isEnterprise === true,
        isLargeCompany: job.isLargeCompany === true,
        matchScore: parseMatchScore(job.matchScore),
        adapterBacked: true,
      }));

    return {
      jobs: jobs.filter(
        (job) => job.company && job.position && job.sourceUrl && isLargeCompany(job)
      ),
    };
  }
}

// With a candidate profile the model also rates fit: discovered postings carry too
// little text for the rule-based scorer to reach the auto-apply threshold on its own.
/**
 * @param {CliproxyCandidateProfile} [profile]
 * @returns {Record<string, unknown>}
 */
function scoringRequest(profile) {
  if (!profile) return {};
  return {
    candidateProfile: {
      skills: profile.skills || [],
      experienceYears: profile.experienceYears,
      preferredLocations: profile.preferredLocations || [],
    },
    matchScore: 'integer 0-100: how well each posting fits candidateProfile',
  };
}

/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
function parseMatchScore(value) {
  const score = typeof value === 'string' && value.trim() ? Number(value) : value;
  return Number.isFinite(/** @type {number} */ (score))
    ? Math.min(100, Math.max(0, /** @type {number} */ (score)))
    : undefined;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeBaseUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return raw.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeApiKey(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeHttpUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

/**
 * @param {NormalizedCliproxyJob | RawCliproxyJob} job
 * @returns {boolean}
 */
function isLargeCompany(job) {
  const scale = normalizeScale(job?.companyScale);
  if (scale === 'large' || scale === 'enterprise') return true;
  if (job?.isEnterprise === true || job?.isLargeCompany === true) return true;

  const companySize = Number(job?.companySize || job?.employeeCount || 0);
  return Number.isFinite(companySize) && companySize >= 1000;
}

/**
 * @param {string} text
 * @returns {RawCliproxyJob[]}
 */
function parseJobs(text) {
  const parsed = /** @type {RawCliproxyJob[] | { jobs?: RawCliproxyJob[] } | null} */ (
    parseJson(text)
  );
  if (parsed === null) {
    throw new Error('Cliproxy returned non-JSON job content');
  }
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.jobs)) return parsed.jobs;
  return [];
}

/**
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function readErrorDetails(response) {
  if (typeof response.text !== 'function') return '';
  const text = await response.text().catch(() => '');
  const message = extractErrorMessage(text);
  return message ? `: ${message}` : '';
}

/**
 * @param {string} text
 * @returns {string}
 */
function extractErrorMessage(text) {
  if (typeof text !== 'string' || !text.trim()) return '';
  try {
    const parsed = JSON.parse(text);
    return String(parsed?.error?.message || parsed?.message || '').slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeScale(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJson(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
