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
    experienceMin = parseInt(minMatch?.[1]) || 0;
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
