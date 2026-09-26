/**
 * @typedef {object} RawRememberJob
 * @property {string | number} [id]
 * @property {string} [experience]
 * @property {string} [career_period]
 * @property {string} [url]
 * @property {string} [title]
 * @property {string} [position]
 * @property {{ name?: string, company_id?: string | number }} [organization]
 * @property {{ name?: string, id?: string | number }} [company]
 * @property {string} [company_name]
 * @property {string | number} [company_id]
 * @property {{ level1?: string, level2?: string }} [normalized_address]
 * @property {string} [location]
 * @property {string} [region]
 * @property {number} [min_experience]
 * @property {number} [max_experience]
 * @property {string | number} [salary]
 * @property {string | number} [min_salary]
 * @property {string | number} [max_salary]
 * @property {string[]} [skills]
 * @property {string[]} [tech_stack]
 * @property {string} [job_description]
 * @property {string} [description]
 * @property {string} [qualifications]
 * @property {string} [requirements]
 * @property {string} [benefits]
 * @property {string} [welfare]
 * @property {string | null} [deadline]
 * @property {string | null} [due_date]
 * @property {string | null} [created_at]
 * @property {string | null} [posted_date]
 * @property {boolean} [is_remote]
 * @property {string} [employment_type]
 * @property {string} [job_posting_type]
 * @property {string} [application_type]
 */

/**
 * @typedef {object} NormalizedRememberJob
 * @property {string} id
 * @property {string} sourceId
 * @property {string} source
 * @property {string} sourceUrl
 * @property {string} position
 * @property {string | { name?: string, id?: string | number }} company
 * @property {string | number} companyId
 * @property {string} location
 * @property {number} experienceMin
 * @property {number} experienceMax
 * @property {string} salary
 * @property {string[]} techStack
 * @property {string} description
 * @property {string} requirements
 * @property {string} benefits
 * @property {string | null} dueDate
 * @property {string | null} postedDate
 * @property {boolean} isRemote
 * @property {string} employmentType
 * @property {string} applicationType
 * @property {string} crawledAt
 */

/**
 * @param {RawRememberJob} rawJob
 * @param {string} baseUrl
 * @param {boolean} [_isDetail=false]
 * @returns {NormalizedRememberJob}
 */
export function normalizeRememberJob(rawJob, baseUrl, _isDetail = false) {
  // Parse Korean experience format: "5년~12년 차" or "5년 이상"
  let experienceMin = 0;
  let experienceMax = 99;

  const expStr = rawJob.experience || rawJob.career_period || '';
  const expMatch = expStr.match(/(\d+)(?:년)?(?:~|-)(\d+)?/);
  if (expMatch) {
    experienceMin = parseInt(expMatch[1]) || 0;
    experienceMax = parseInt(expMatch[2]) || experienceMin + 10;
  } else if (expStr.includes('이상')) {
    const minMatch = expStr.match(/(\d+)/);
    experienceMin = parseInt(/** @type {string} */ (minMatch?.[1])) || 0;
    experienceMax = 99;
  }

  return {
    id: `remember_${rawJob.id}`,
    sourceId: String(rawJob.id),
    source: 'remember',
    sourceUrl: rawJob.url || `${baseUrl}/job/posting/${rawJob.id}`,
    position: rawJob.title || rawJob.position || '',
    company:
      rawJob.organization?.name ||
      rawJob.company?.name ||
      rawJob.company_name ||
      rawJob.company ||
      '',
    companyId: rawJob.organization?.company_id || rawJob.company?.id || rawJob.company_id || '',
    location: rawJob.normalized_address
      ? `${rawJob.normalized_address.level1}/${rawJob.normalized_address.level2}`
      : rawJob.location || rawJob.region || '',
    experienceMin: rawJob.min_experience || experienceMin,
    experienceMax: rawJob.max_experience || experienceMax,
    salary:
      rawJob.salary || rawJob.min_salary
        ? `${rawJob.min_salary || ''}-${rawJob.max_salary || ''}`
        : '',
    techStack: rawJob.skills || rawJob.tech_stack || [],
    description: rawJob.job_description || rawJob.description || '',
    requirements: rawJob.qualifications || rawJob.requirements || '',
    benefits: rawJob.benefits || rawJob.welfare || '',
    dueDate: rawJob.deadline || rawJob.due_date || null,
    postedDate: rawJob.created_at || rawJob.posted_date || null,
    isRemote: rawJob.is_remote || false,
    employmentType: rawJob.employment_type || rawJob.job_posting_type || '',
    applicationType: rawJob.application_type || '',
    crawledAt: new Date().toISOString(),
  };
}
