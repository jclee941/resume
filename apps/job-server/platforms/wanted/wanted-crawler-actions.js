/**
 * @typedef {object} WantedCompanyResponse
 * @property {string | number} [id]
 * @property {string} [name]
 * @property {string} [industry_name]
 * @property {number} [employee_count]
 * @property {string} [description]
 * @property {string} [address]
 * @property {string} [website]
 * @property {{ origin?: string }} [logo_img]
 */

/**
 * @typedef {object} WantedCrawlerLike
 * @property {string} apiBase
 * @property {string | null | undefined} [cookies]
 * @property {(url: string, options?: RequestInit) => Promise<WantedCompanyResponse>} fetchJSON
 * @property {(url: string, options?: RequestInit) => Promise<Response>} rateLimitedFetch
 */

/**
 * @typedef {object} WantedCompanyInfoResult
 * @property {boolean} success
 * @property {string} source
 * @property {{ id?: string | number, name?: string, industry?: string, employeeCount?: number, description?: string, address?: string, website?: string, logoUrl?: string }} [company]
 * @property {string} [error]
 */

/**
 * @typedef {object} WantedAuthResult
 * @property {boolean} authenticated
 * @property {string} [reason]
 * @property {{ id: string | number, email: string, name: string } | null} [user]
 * @property {string} [error]
 */

/**
 * @typedef {object} WantedApplicationData
 * @property {string | number} [resumeId]
 * @property {string} [coverLetter]
 */

/**
 * @typedef {object} WantedApplyResult
 * @property {boolean} success
 * @property {string} [source]
 * @property {string | number} [applicationId]
 * @property {string} [status]
 * @property {string} [appliedAt]
 * @property {string} [error]
 */

/**
 * @param {WantedCrawlerLike} crawler
 * @param {string | number} companyId
 * @returns {Promise<WantedCompanyInfoResult>}
 */
export async function getWantedCompanyInfo(crawler, companyId) {
  const url = `${crawler.apiBase}/companies/${companyId}`;

  try {
    const data = await crawler.fetchJSON(url);

    return {
      success: true,
      source: 'wanted',
      company: {
        id: data.id,
        name: data.name,
        industry: data.industry_name,
        employeeCount: data.employee_count,
        description: data.description,
        address: data.address,
        website: data.website,
        logoUrl: data.logo_img?.origin,
      },
    };
  } catch (error) {
    return {
      success: false,
      source: 'wanted',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {WantedCrawlerLike} crawler
 * @returns {Promise<WantedAuthResult>}
 */
export async function checkWantedAuth(crawler) {
  if (!crawler.cookies) {
    return { authenticated: false, reason: 'No cookies set' };
  }

  try {
    const url = 'https://www.wanted.co.kr/api/chaos/me';
    const response = await crawler.rateLimitedFetch(url);
    const data = /** @type {{ user?: { id: string | number, email: string, name: string } }} */ (
      await response.json()
    );

    return {
      authenticated: !!data.user,
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
          }
        : null,
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {WantedCrawlerLike} crawler
 * @param {string | number} jobId
 * @param {WantedApplicationData} [applicationData={}]
 * @returns {Promise<WantedApplyResult>}
 */
export async function applyWantedJob(crawler, jobId, applicationData = {}) {
  if (!crawler.cookies) {
    return { success: false, error: 'Authentication required' };
  }

  const url = 'https://www.wanted.co.kr/api/chaos/applications/v2';

  try {
    const response = await crawler.rateLimitedFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        resume_id: applicationData.resumeId,
        cover_letter: applicationData.coverLetter || '',
        ...applicationData,
      }),
    });

    const data = /** @type {{ id?: string | number, status?: string }} */ (await response.json());

    return {
      success: true,
      source: 'wanted',
      applicationId: data.id,
      status: data.status,
      appliedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      source: 'wanted',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
