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
      error: error.message,
    };
  }
}

export async function checkWantedAuth(crawler) {
  if (!crawler.cookies) {
    return { authenticated: false, reason: 'No cookies set' };
  }

  try {
    const url = 'https://www.wanted.co.kr/api/chaos/me';
    const response = await crawler.rateLimitedFetch(url);
    const data = await response.json();

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
    return { authenticated: false, error: error.message };
  }
}

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

    const data = await response.json();

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
      error: error.message,
    };
  }
}
