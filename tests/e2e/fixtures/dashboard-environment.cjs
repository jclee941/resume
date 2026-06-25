// @ts-check

const { getDashboardServer } = require('./mock-dashboard-server.cjs');

async function requestAvailable(request, url, expectedStatus, matchesBody) {
  const response = await request.get(url, { timeout: 5000 });
  if (matchesBody) {
    const body = await response.text();
    return response.status() === expectedStatus && matchesBody.test(body);
  }
  return expectedStatus.includes(response.status());
}

async function probeExternalDashboard(request, baseUrl) {
  let apiAvailable = false;
  let uiAvailable = false;

  try {
    apiAvailable = await requestAvailable(request, `${baseUrl}/job/api/auth/status`, [200, 401]);
  } catch (error) {
    if (error instanceof Error) {
      apiAvailable = false;
    } else {
      throw error;
    }
  }

  try {
    uiAvailable = await requestAvailable(request, `${baseUrl}/job/`, 200, /Job Dashboard/i);
  } catch (error) {
    if (error instanceof Error) {
      uiAvailable = false;
    } else {
      throw error;
    }
  }

  return { apiAvailable, uiAvailable };
}

async function createDashboardEnvironment(request, workerIndex) {
  if (!process.env.RUN_EXTERNAL_E2E) {
    const { url } = await getDashboardServer(9494 + workerIndex);
    return {
      baseUrl: url,
      dashboardBase: `${url}/job`,
      apiAvailable: true,
      uiAvailable: true,
    };
  }

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8787';
  return {
    baseUrl,
    dashboardBase: `${baseUrl}/job`,
    ...(await probeExternalDashboard(request, baseUrl)),
  };
}

module.exports = { createDashboardEnvironment };
