/**
 * @typedef {Object} WantedJob
 * @property {string|number} id
 * @property {string} company
 * @property {string|number} [companyId]
 * @property {string} position
 * @property {string} [location]
 * @property {number|null} experienceMin
 * @property {number|null} experienceMax
 * @property {string[]} techStack
 * @property {string|null} salary
 * @property {Object} [reward]
 * @property {string} [thumbnail]
 * @property {boolean} isRemote
 * @property {string|null} employmentType
 * @property {'wanted'} source
 * @property {string} sourceUrl
 * @property {string} createdAt
 * @property {string} due
 */

/**
 * @typedef {WantedJob & {
 *   description: string,
 *   requirements: string,
 *   preferredPoints: string,
 *   benefits: string,
 *   skills: string[],
 *   category: string[],
 * }} WantedJobDetail
 */

/**
 * @typedef {Object} WantedCompany
 * @property {string|number} id
 * @property {string} name
 * @property {string} [logo]
 * @property {string} [industry]
 * @property {number} [employees]
 * @property {string} [description]
 * @property {string} [website]
 */

export function normalizeJob(job) {
  return {
    id: job.id,
    company: job.company?.name || job.company_name,
    companyId: job.company?.id || job.company_id,
    position: job.position,
    location: job.address?.location || job.location,
    experienceMin: job.annual_from ?? null,
    experienceMax: job.annual_to ?? null,
    techStack: job.skill_tags?.map((t) => t.title) || [],
    salary: job.reward?.formatted_total || null,
    reward: job.reward,
    thumbnail: job.title_img?.thumb,
    isRemote: job.is_remote || false,
    employmentType: job.employment_type || null,
    source: 'wanted',
    sourceUrl: `https://www.wanted.co.kr/wd/${job.id}`,
    createdAt: job.created_at,
    due: job.due_time,
  };
}

export function normalizeJobDetail(detail) {
  return {
    ...normalizeJob(detail),
    description: detail.main_tasks || detail.position_description || '',
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
