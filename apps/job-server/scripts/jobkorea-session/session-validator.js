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

  const body = await response.text();
  const expiredMarkers = [
    '세션이 만료 되었습니다',
    '로그인이 필요합니다',
    '/Login/Login_ToT.asp',
    '/Login/Login.asp',
    "location.href='/Login",
  ];
  const foundMarker = expiredMarkers.find((marker) => body.includes(marker));
  if (foundMarker) {
    throw new Error(`Session expired detected by marker: ${foundMarker}`);
  }

  return true;
}
