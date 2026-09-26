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

export function buildWantedSearchQuery(params) {
  const query = new URLSearchParams({
    country: 'kr',
    job_sort: params.sort || 'job.latest_order',
    years: params.years ?? -1,
    locations: params.locations || 'all',
    limit: Math.min(params.limit || 20, 100),
    offset: params.offset || 0,
  });

  if (params.tag_type_ids && params.tag_type_ids.length > 0) {
    params.tag_type_ids.forEach((id) => query.append('tag_type_ids', id));
  }

  return query.toString();
}

export function buildWantedKeywordQuery(keyword, options = {}) {
  const query = new URLSearchParams({
    query: keyword,
    country: 'kr',
    job_sort: options.sort || 'job.latest_order',
    years: options.years ?? -1,
    limit: Math.min(options.limit || 20, 100),
    offset: options.offset || 0,
  });

  return query.toString();
}

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
