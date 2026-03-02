export const JOB_CATEGORIES = {
  backend: 872,
  frontend: 669,
  fullstack: 873,
  devops: 674,
  data: 655,
  ml: 1634,
  security: 672,
  mobile: 677,
  ios: 678,
  android: 679,
  embedded: 658,
  qa: 676,
  dba: 10231,
  system: 665,
  pm: 876,
};

export function normalizeJob(job) {
  return {
    id: job.id,
    company: job.company?.name || job.company_name,
    companyId: job.company?.id || job.company_id,
    position: job.position,
    location: job.address?.location || job.location,
    reward: job.reward,
    thumbnail: job.title_img?.thumb,
    source: 'wanted',
    sourceUrl: `https://www.wanted.co.kr/wd/${job.id}`,
    createdAt: job.created_at,
    due: job.due_time,
  };
}

export function normalizeJobDetail(detail) {
  return {
    ...normalizeJob(detail),
    description: detail.position_description,
    requirements: detail.requirements,
    preferredPoints: detail.preferred_points,
    benefits: detail.benefits,
    skills: detail.skill_tags?.map((t) => t.title) || [],
    category: detail.category_tags?.map((t) => t.title) || [],
  };
}

export function normalizeCompany(company) {
  return {
    id: company.id,
    name: company.name,
    logo: company.logo_img?.thumb,
    industry: company.industry_name,
    employees: company.employee_count,
    description: company.description,
    website: company.homepage_url,
  };
}
