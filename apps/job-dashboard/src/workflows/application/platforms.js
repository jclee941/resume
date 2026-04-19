import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

export async function searchJobs(ctx, platform, criteria) {
  switch (platform) {
    case 'wanted':
      return searchWanted(ctx, criteria);
    case 'linkedin':
      return searchLinkedIn(ctx, criteria);
    case 'remember':
      return searchRemember(ctx, criteria);
    default:
      return [];
  }
}

export async function searchWanted(ctx, criteria) {
  const session = await ctx.env.SESSIONS.get('auth:wanted');
  if (!session) {
    throw new Error('No Wanted session available');
  }

  const params = new URLSearchParams();
  if (criteria.keyword) params.append('query', criteria.keyword);
  if (criteria.location) params.append('location', criteria.location);

  const response = await fetch(`https://www.wanted.co.kr/api/v4/jobs?${params}`, {
    headers: {
      Cookie: session,
      'User-Agent': DEFAULT_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Wanted API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).map((job) => ({
    id: `wanted-${job.id}`,
    company: job.company?.name || 'Unknown',
    position: job.position || 'Unknown',
    url: `https://www.wanted.co.kr/wd/${job.id}`,
    location: job.address?.location || '',
    experience: job.years || '',
    description: job.detail?.description || '',
  }));
}

export async function searchLinkedIn(_ctx, criteria) {
  const keyword = encodeURIComponent(criteria.keyword || '');
  const location = encodeURIComponent(criteria.location || '');

  const response = await fetch(
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&f_TPR=r604800`,
    {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LinkedIn API error: ${response.status}`);
  }

  const html = await response.text();
  const jobs = [];
  const pattern =
    /data-entity-urn="urn:li:jobPosting:(\d+)"[\s\S]*?base-search-card__title[^>]*>([^<]+)<\/[\s\S]*?base-search-card__subtitle[\s\S]*?<a[^>]*>([^<]+)</gi;

  let match = pattern.exec(html);
  while (match !== null) {
    jobs.push({
      id: `linkedin-${match[1]}`,
      position: match[2].trim(),
      company: match[3].trim(),
      url: `https://www.linkedin.com/jobs/view/${match[1]}`,
    });
    match = pattern.exec(html);
  }

  return jobs;
}

export async function searchRemember(_ctx, criteria) {
  const headers = {
    Accept: 'application/json',
    Origin: 'https://career.rememberapp.co.kr',
    Referer: 'https://career.rememberapp.co.kr/job/postings',
    'User-Agent': DEFAULT_USER_AGENT,
  };

  const response = criteria.keyword
    ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `page=1&per=20&search=${encodeURIComponent(criteria.keyword)}`,
      })
    : await fetch(
        'https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20',
        {
          headers,
        }
      );

  if (!response.ok) {
    throw new Error(`Remember API error: ${response.status}`);
  }

  const data = await response.json();
  const jobs = Array.isArray(data?.data?.job_postings)
    ? data.data.job_postings
    : Array.isArray(data?.data)
      ? data.data
      : [];

  return jobs
    .filter((job) => job?.id)
    .map((job) => ({
      id: `remember-${job.id}`,
      company: job.organization?.name || job.company?.name || '',
      position: job.title || '',
      url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
      location: job.location?.name || '',
    }));
}

export async function submitApplication(ctx, { platform, jobId, resume, coverLetter }) {
  const submitters = {
    wanted: () => submitToWanted(ctx, jobId, resume, coverLetter),
    linkedin: () => submitToLinkedIn(ctx, jobId, resume, coverLetter),
    remember: () => submitToRemember(ctx, jobId, resume, coverLetter),
    jobkorea: () => submitToJobKorea(ctx, jobId, resume, coverLetter),
    saramin: () => submitToSaramin(ctx, jobId, resume, coverLetter),
  };

  const submitter = submitters[platform];
  if (!submitter) {
    return { success: false, error: `Unknown platform: ${platform}` };
  }

  try {
    return await submitter();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function submitToWanted(ctx, jobId, resume, coverLetter) {
  const session = await ctx.env.SESSIONS.get('auth:wanted');
  if (!session) {
    return { success: false, error: 'No Wanted session' };
  }

  const response = await fetch(
    `https://www.wanted.co.kr/api/v4/jobs/${jobId.replace('wanted-', '')}/apply`,
    {
      method: 'POST',
      headers: {
        Cookie: session,
        'Content-Type': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      body: JSON.stringify({
        resume_id: resume?.id,
        cover_letter: coverLetter,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Wanted API error: ${response.status} - ${error}` };
  }

  return { success: true, platformResponse: await response.json() };
}

export async function submitToLinkedIn(_ctx, _jobId, _resume, _coverLetter) {
  return {
    success: false,
    error: 'LinkedIn Easy Apply requires browser automation (Puppeteer). Use job-server CLI.',
    platform: 'linkedin',
    requiresJobServer: true,
  };
}

export async function submitToRemember(_ctx, _jobId, _resume, _coverLetter) {
  return {
    success: false,
    error: 'Remember application requires browser automation (Puppeteer). Use job-server CLI.',
    platform: 'remember',
    requiresJobServer: true,
  };
}

export async function submitToJobKorea(_ctx, _jobId, _resume, _coverLetter) {
  return {
    success: false,
    error: 'JobKorea application requires browser automation (Puppeteer). Use job-server CLI.',
    platform: 'jobkorea',
    requiresJobServer: true,
  };
}

export async function submitToSaramin(_ctx, _jobId, _resume, _coverLetter) {
  return {
    success: false,
    error: 'Saramin application requires browser automation (Puppeteer). Use job-server CLI.',
    platform: 'saramin',
    requiresJobServer: true,
  };
}
