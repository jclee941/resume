export async function verifyAuthenticatedSession({ cookieString, resumeUrl, userAgent }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const response = await fetch(resumeUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      Cookie: cookieString,
      Referer: 'https://www.jobkorea.co.kr/',
      'User-Agent': userAgent,
    },
    redirect: 'manual',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (response.status !== 200) {
    throw new Error(`Authenticated resume request failed with status ${response.status}`);
  }

  return response.status;
}
