import { JOB_CATEGORY_MAPPING, DEFAULT_JOB_CATEGORY } from '@resume/shared/job-categories';

export function parsePeriod(period = '') {
  const parts = String(period)
    .split(/~| - /)
    .map((part) => part.trim())
    .filter(Boolean);
  const start = parts[0] ? `${parts[0].replace('.', '-')}-01` : null;
  const end = parts[1] && parts[1] !== '현재' ? `${parts[1].replace('.', '-')}-01` : null;
  return { start, end };
}

export function mapCareerToWanted(career) {
  const { start, end } = parsePeriod(career.period);
  return {
    company: { name: career.company, type: 'CUSTOM' },
    job_role: career.role,
    job_category_id: JOB_CATEGORY_MAPPING[career.role] || DEFAULT_JOB_CATEGORY,
    start_time: start,
    end_time: end,
    served: end === null,
    employment_type: 'FULLTIME',
  };
}

export function mapEducationToWanted(education) {
  const startTime = education.startDate ? `${education.startDate.replace('.', '-')}-01` : null;
  const endTime =
    education.status === '재학중'
      ? null
      : education.endDate
        ? `${education.endDate.replace('.', '-')}-01`
        : null;
  return {
    school_name: education.school,
    major: education.major,
    start_time: startTime,
    end_time: endTime,
    degree: '학사',
    description: education.status === '재학중' ? `재학중 (${education.startDate || ''} ~ )` : null,
  };
}

export function mapCertificationToWanted(certification) {
  return {
    title: certification.name,
    description: `${certification.issuer || ''} | ${certification.date || ''}`.trim(),
    start_time: certification.date ? `${certification.date.replace('.', '-')}-01` : null,
    activity_type: 'CERTIFICATE',
  };
}

export function buildProfileData(ssotData) {
  return {
    name: ssotData.personal?.name,
    email: ssotData.personal?.email,
    phone: ssotData.personal?.phone,
    headline:
      `${ssotData.current?.position || 'Engineer'} | ${ssotData.summary?.totalExperience || ''}`.trim(),
    skills: Array.isArray(ssotData.summary?.expertise) ? ssotData.summary.expertise.join(',') : '',
    summary: ssotData.summary?.profileStatement || '',
  };
}
