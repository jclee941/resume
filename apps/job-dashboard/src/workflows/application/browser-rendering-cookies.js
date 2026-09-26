import { readPlatformSession } from '../../services/platform-session.js';

export async function hydrateSessionCookies(ctx, page, platform, targetUrl) {
  const cookieHeader = await getPlatformCookieHeader(ctx, platform);
  const cookies = parseCookieHeader(cookieHeader, targetUrl);
  if (cookies.length === 0 || typeof page.setCookie !== 'function') return 0;
  await page.setCookie(...cookies);
  return cookies.length;
}

async function getPlatformCookieHeader(ctx, platform) {
  const raw = await readPlatformSession(ctx?.env, platform);
  if (!raw) return '';

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed.cookieHeader || parsed.cookie || cookiesToHeader(parsed.cookies) || '';
  } catch {
    return raw;
  }
}

function cookiesToHeader(cookies) {
  if (!Array.isArray(cookies)) return '';
  return cookies
    .filter((cookie) => cookie?.name && cookie?.value != null)
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

function parseCookieHeader(cookieHeader, targetUrl) {
  if (!cookieHeader) return [];
  const { hostname } = new URL(targetUrl);
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator <= 0) return null;
      return {
        name: part.slice(0, separator).trim(),
        value: part.slice(separator + 1).trim(),
        domain: hostname,
        path: '/',
        secure: true,
      };
    })
    .filter(Boolean);
}
