/**
 * @typedef {Object} CookieParam
 * @property {string} name
 * @property {string} value
 * @property {string} domain
 * @property {string} path
 */

/**
 * @typedef {Object} PuppeteerCookiePage
 * @property {(...cookies: CookieParam[]) => Promise<unknown>} [setCookie]
 */

/**
 * @param {PuppeteerCookiePage} page
 * @param {string | null | undefined} cookieString
 * @returns {Promise<void>}
 */
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
    .filter(/** @type {(c: CookieParam | null) => c is CookieParam} */ ((c) => c !== null));

  if (cookies.length > 0) {
    await page.setCookie(...cookies);
  }
}

/**
 * @typedef {Object} ExtractedJobKoreaJob
 * @property {string} id
 * @property {string} position
 * @property {string} company
 * @property {string} url
 */

/**
 * @param {{ evaluate: <T>(fn: () => T) => Promise<T> }} page
 * @returns {Promise<ExtractedJobKoreaJob[]>}
 */
export async function extractJobKoreaSearchJobs(page) {
  return page.evaluate(() => {
    /** @type {ExtractedJobKoreaJob[]} */
    const results = [];
    /** @type {Map<string, ExtractedJobKoreaJob>} */
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
      if (job && !hasImg && text.length > 0) {
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

/**
 * @typedef {Object} RawJobKoreaJob
 * @property {string} id
 * @property {string} [url]
 * @property {string} [position]
 * @property {string} [company]
 * @property {string} [companyId]
 * @property {string} [location]
 * @property {number} [experienceMin]
 * @property {number} [experienceMax]
 * @property {string} [salary]
 * @property {string[]} [techStack]
 * @property {string} [description]
 * @property {string} [requirements]
 * @property {string} [benefits]
 * @property {string | null} [dueDate]
 * @property {string | null} [postedDate]
 * @property {boolean} [isRemote]
 * @property {string} [employmentType]
 */

/**
 * @param {RawJobKoreaJob} rawJob
 * @param {string} baseUrl
 * @returns {Record<string, unknown>}
 */
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
