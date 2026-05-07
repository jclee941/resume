import fs from 'fs';
import path from 'path';
import { CONFIG } from './config.js';
import { log } from './logging.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionFile(platformKey) {
  return path.join(CONFIG.SESSION_DIR, `${platformKey}-session.json`);
}

export function buildSession(platformKey, cookies, cookieDomains) {
  const relevantCookies = cookies.filter((cookie) =>
    cookieDomains.some((domain) => cookie.domain.includes(domain))
  );

  if (relevantCookies.length === 0) {
    return null;
  }

  return {
    platform: platformKey,
    cookies: relevantCookies,
    cookieString: serializeCookies(relevantCookies),
    cookieCount: relevantCookies.length,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

export function serializeCookies(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

export function saveSession(platformKey, session) {
  if (!fs.existsSync(CONFIG.SESSION_DIR)) {
    fs.mkdirSync(CONFIG.SESSION_DIR, { recursive: true });
  }

  const sessionFile = getSessionFile(platformKey);
  fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
  log(`Saved ${session.cookieCount} cookies to ${sessionFile}`, 'success', platformKey);
  return sessionFile;
}

export function loadSession(platformKey) {
  const sessionFile = getSessionFile(platformKey);
  if (!fs.existsSync(sessionFile)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
}

export function isSessionExpired(session) {
  return new Date(session.expiresAt) < new Date();
}
