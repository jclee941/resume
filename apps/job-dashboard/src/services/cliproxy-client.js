const DEFAULT_MODEL = 'claude-opus-4-8';

export class CliproxyClient {
  constructor(env = {}, options = {}) {
    this.baseUrl = normalizeBaseUrl(env.CLIPROXY_BASE || options.baseUrl);
    this.apiKey = normalizeApiKey(env.CLIPROXY_API_KEY || options.apiKey);
    this.model = env.CLIPROXY_MODEL || options.model || DEFAULT_MODEL;
    this.fetcher = options.fetcher || fetch;
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async searchJobs(keyword, { limit = 10 } = {}) {
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
              acceptedCompanyScale: ['large', 'enterprise'],
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
        companyScale: String(job.companyScale || job.scale || ''),
        companySize: Number(job.companySize || job.employeeCount || 0),
        isEnterprise: job.isEnterprise === true,
        isLargeCompany: job.isLargeCompany === true,
        matchScore: Number.isFinite(job.matchScore) ? job.matchScore : undefined,
        adapterBacked: true,
      }));

    return {
      jobs: jobs.filter(
        (job) => job.company && job.position && job.sourceUrl && isLargeCompany(job)
      ),
    };
  }
}

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

export function normalizeApiKey(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeHttpUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function isLargeCompany(job) {
  const scale = normalizeScale(job?.companyScale);
  if (scale === 'large' || scale === 'enterprise') return true;
  if (job?.isEnterprise === true || job?.isLargeCompany === true) return true;

  const companySize = Number(job?.companySize || job?.employeeCount || 0);
  return Number.isFinite(companySize) && companySize >= 1000;
}

function parseJobs(text) {
  const parsed = parseJson(text);
  if (parsed === null) {
    throw new Error('Cliproxy returned non-JSON job content');
  }
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.jobs)) return parsed.jobs;
  return [];
}

async function readErrorDetails(response) {
  if (typeof response.text !== 'function') return '';
  const text = await response.text().catch(() => '');
  const message = extractErrorMessage(text);
  return message ? `: ${message}` : '';
}

function extractErrorMessage(text) {
  if (typeof text !== 'string' || !text.trim()) return '';
  try {
    const parsed = JSON.parse(text);
    return String(parsed?.error?.message || parsed?.message || '').slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

function normalizeScale(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

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
