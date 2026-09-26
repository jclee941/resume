export const WANTED_CATEGORIES = {
  DEVOPS: 674,
  SYSTEM_ADMIN: 665,
  SECURITY: 672,
  BACKEND: 872,
  FRONTEND: 669,
  PYTHON: 899,
  ML_ENGINEER: 1634,
  DATA_ENGINEER: 655,
  PRODUCT_MANAGER: 876,
  INFRA: 895,
  DBA: 656,
  QA: 676,
  CTO: 877,
};

/**
 * @typedef {Object} WantedSearchParams
 * @property {string} [sort]
 * @property {number | string} [years]
 * @property {string} [locations]
 * @property {number} [limit]
 * @property {number | string} [offset]
 * @property {(string | number)[]} [tag_type_ids]
 */

/**
 * @typedef {Object} WantedKeywordOptions
 * @property {string} [sort]
 * @property {number | string} [years]
 * @property {number} [limit]
 * @property {number | string} [offset]
 */

/**
 * @typedef {Object} WantedRawJob
 * @property {string | number} id
 * @property {string} [position]
 * @property {{ id?: string | number, name?: string, industry_name?: string }} [company]
 * @property {{ location?: string, district?: string }} [address]
 * @property {number} [annual_from]
 * @property {number} [annual_to]
 * @property {{ formatted_total?: string }} [reward]
 * @property {Array<{ title: string }>} [skill_tags]
 * @property {string | null} [due_time]
 * @property {string | null} [created_at]
 * @property {boolean} [is_remote]
 * @property {string} [employment_type]
 */

/**
 * @param {WantedSearchParams} params
 * @returns {string}
 */
export function buildWantedSearchQuery(params) {
  const query = new URLSearchParams({
    country: 'kr',
    job_sort: params.sort || 'job.latest_order',
    years: String(params.years ?? -1),
    locations: params.locations || 'all',
    limit: String(Math.min(params.limit || 20, 100)),
    offset: String(params.offset || 0),
  });

  if (params.tag_type_ids && params.tag_type_ids.length > 0) {
    params.tag_type_ids.forEach((id) => query.append('tag_type_ids', String(id)));
  }

  return query.toString();
}

/**
 * @param {string} keyword
 * @param {WantedKeywordOptions} [options]
 * @returns {string}
 */
export function buildWantedKeywordQuery(keyword, options = {}) {
  const query = new URLSearchParams({
    query: keyword,
    country: 'kr',
    job_sort: options.sort || 'job.latest_order',
    years: String(options.years ?? -1),
    limit: String(Math.min(options.limit || 20, 100)),
    offset: String(options.offset || 0),
  });

  return query.toString();
}

/**
 * @param {WantedRawJob} rawJob
 * @returns {Record<string, unknown>}
 */
export function normalizeWantedJob(rawJob) {
  return {
    id: `wanted_${rawJob.id}`,
    sourceId: rawJob.id,
    source: 'wanted',
    sourceUrl: `https://www.wanted.co.kr/wd/${rawJob.id}`,
    position: rawJob.position || '',
    company: rawJob.company?.name || '',
    companyId: rawJob.company?.id || '',
    location: [rawJob.address?.location, rawJob.address?.district].filter(Boolean).join(' '),
    experienceMin: rawJob.annual_from || 0,
    experienceMax: rawJob.annual_to || 99,
    salary: rawJob.reward?.formatted_total || '',
    techStack: rawJob.skill_tags?.map((t) => t.title) || [],
    description: '',
    requirements: '',
    benefits: '',
    dueDate: rawJob.due_time || null,
    postedDate: rawJob.created_at || null,
    isRemote: rawJob.is_remote || false,
    employmentType: rawJob.employment_type || '정규직',
    industry: rawJob.company?.industry_name || '',
    crawledAt: new Date().toISOString(),
  };
}
