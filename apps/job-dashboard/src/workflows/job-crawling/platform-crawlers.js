import { DEFAULT_USER_AGENT } from '@resume/shared/ua';

/**
 * Dispatch crawling to the selected platform adapter.
 *
 * @param {Object} env
 * @param {string} platform
 * @param {Object} criteria
 * @returns {Promise<{jobs: Object[], error?: string}>}
 */
export async function crawlPlatform(env, platform, criteria) {
  const clients = {
    wanted: () => crawlWanted(env, criteria),
    linkedin: () => crawlLinkedIn(criteria),
    remember: () => crawlRemember(criteria),
  };

  const crawler = clients[platform];
  if (!crawler) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  return await crawler();
}

/**
 * @param {Object} env
 * @returns {Promise<{jobs: Object[], error?: string}>}
 */
export async function crawlWanted(env) {
  const session = await env.SESSIONS.get('auth:wanted');
  if (!session) return { jobs: [], error: 'No session' };

  try {
    const response = await fetch('https://www.wanted.co.kr/api/v4/jobs', {
      headers: {
        Cookie: session,
        'User-Agent': DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      jobs: (data.data || []).map((job) => ({
        id: `wanted-${job.id}`,
        company: job.company?.name || 'Unknown',
        position: job.position || 'Unknown',
        url: `https://www.wanted.co.kr/wd/${job.id}`,
        location: job.address?.location || '',
        experience: job.years || '',
      })),
    };
  } catch (error) {
    return { jobs: [], error: error.message };
  }
}

/**
 * @param {Object} criteria
 * @returns {Promise<{jobs: Object[], error?: string}>}
 */
export async function crawlLinkedIn(criteria = {}) {
  try {
    const keyword = encodeURIComponent(criteria?.keyword || criteria?.keywords || '');
    const location = encodeURIComponent(criteria?.location || '');
    const response = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=${location}&f_TPR=r604800&position=0&pageNum=0`,
      {
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    const html = await response.text();
    const jobPattern =
      /<div[^>]*class="[^"]*base-card[^"]*"[^>]*data-entity-urn="urn:li:jobPosting:(\d+)"[^>]*>[\s\S]*?<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([^<]+)<\/h3>[\s\S]*?<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
    const jobs = [];

    for (;;) {
      const match = jobPattern.exec(html);
      if (match === null) break;

      const sourceId = (match[1] || '').trim();
      const position = (match[2] || '').trim();
      const company = (match[3] || '').trim();
      if (!sourceId) continue;

      jobs.push({
        id: `linkedin-${sourceId}`,
        company,
        position,
        url: `https://www.linkedin.com/jobs/view/${sourceId}`,
        location: criteria?.location || '',
        experience: '',
      });
    }

    return { jobs };
  } catch (error) {
    return { jobs: [], error: error.message };
  }
}

/**
 * @param {Object} criteria
 * @returns {Promise<{jobs: Object[], error?: string}>}
 */
export async function crawlRemember(criteria = {}) {
  try {
    const keyword = (criteria?.keyword || criteria?.keywords || '').trim();
    const headers = {
      Accept: 'application/json',
      Origin: 'https://career.rememberapp.co.kr',
      Referer: 'https://career.rememberapp.co.kr/job/postings',
      'User-Agent': DEFAULT_USER_AGENT,
    };

    const response = keyword
      ? await fetch('https://career-api.rememberapp.co.kr/job_postings/search', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `page=1&per=20&search=${encodeURIComponent(keyword)}`,
        })
      : await fetch(
          'https://career-api.rememberapp.co.kr/job_postings/curations?tab=STEP_UP&page=1&per=20',
          {
            method: 'GET',
            headers,
          }
        );

    if (!response.ok) {
      return { jobs: [], error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const rawJobs = Array.isArray(data?.data?.job_postings)
      ? data.data.job_postings
      : Array.isArray(data?.data)
        ? data.data
        : [];

    return {
      jobs: rawJobs
        .filter((job) => job?.id)
        .map((job) => ({
          id: `remember-${job.id}`,
          company: job.organization?.name || job.company?.name || '',
          position: job.title || '',
          url: `https://career.rememberapp.co.kr/job/posting/${job.id}`,
          location: job.location?.name || job.address?.full_location || '',
          experience: job.career_period || '',
        })),
    };
  } catch (error) {
    return { jobs: [], error: error.message };
  }
}
