const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE = 'csrf_token';

export function generateCsrfToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function csrfCookie(token, isSecure = true) {
  const flags = [
    `${CSRF_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=3600',
  ];
  if (isSecure) flags.push('Secure');
  return flags.join('; ');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validateCsrf(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { ok: true };
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const csrfHeader = request.headers.get(CSRF_HEADER);

  const cookieMatch = cookieHeader.match(new RegExp(`${CSRF_COOKIE}=([^;]+)`));
  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  if (!cookieToken || !csrfHeader) {
    return {
      ok: false,
      status: 403,
      error: 'CSRF token missing',
    };
  }

  if (!timingSafeEqual(cookieToken, csrfHeader)) {
    return {
      ok: false,
      status: 403,
      error: 'CSRF token mismatch',
    };
  }

  return { ok: true };
}

export function addCsrfCookie(response, request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasToken = cookieHeader.includes(`${CSRF_COOKIE}=`);

  if (!hasToken) {
    const token = generateCsrfToken();
    const isSecure = new URL(request.url).protocol === 'https:';
    const headers = new Headers(response.headers);
    headers.append('Set-Cookie', csrfCookie(token, isSecure));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
