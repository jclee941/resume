export async function applyJobKoreaCookiesToPage(page, cookieString) {
  if (!cookieString || typeof page.setCookie !== 'function') return;

  const cookies = String(cookieString)
    .split(';')
    .map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (!name || valueParts.length === 0) return null;
      return {
        name,
        value: valueParts.join('='),
        domain: '.jobkorea.co.kr',
        path: '/',
      };
    })
    .filter(Boolean);

  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }
}

export async function extractJobKoreaSearchJobs(page) {
  return page.evaluate(() => {
    const results = [];
    const jobMap = new Map();
    const links = document.querySelectorAll('a[href*="/Recruit/GI_Read/"]');

    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const idMatch = href.match(/\/Recruit\/GI_Read\/(\d+)/);
      if (!idMatch) return;

      const jobId = idMatch[1];
      const text = link.textContent?.trim() || '';
      const hasImg = link.querySelector('img') !== null;

      if (!jobMap.has(jobId)) {
        jobMap.set(jobId, {
          id: jobId,
          position: '',
          company: '',
          url: href,
        });
      }

      const job = jobMap.get(jobId);
      if (!hasImg && text.length > 0) {
        if (!job.position) {
          job.position = text;
        } else if (!job.company) {
          job.company = text;
        }
      }
    });

    jobMap.forEach((job) => {
      if (job.position && job.position.length >= 2) {
        results.push(job);
      }
    });

    return results.slice(0, 20);
  });
}

export function normalizeJobKoreaJob(rawJob, baseUrl) {
  return {
    id: `jobkorea_${rawJob.id}`,
    sourceId: rawJob.id,
    source: 'jobkorea',
    sourceUrl: rawJob.url || `${baseUrl}/Recruit/GI_Read/${rawJob.id}`,
    position: rawJob.position || '',
    company: rawJob.company || '',
    companyId: rawJob.companyId || '',
    location: rawJob.location || '',
    experienceMin: rawJob.experienceMin || 0,
    experienceMax: rawJob.experienceMax || 99,
    salary: rawJob.salary || '',
    techStack: rawJob.techStack || [],
    description: rawJob.description || '',
    requirements: rawJob.requirements || '',
    benefits: rawJob.benefits || '',
    dueDate: rawJob.dueDate || null,
    postedDate: rawJob.postedDate || null,
    isRemote: rawJob.isRemote || false,
    employmentType: rawJob.employmentType || '',
    crawledAt: new Date().toISOString(),
  };
}
