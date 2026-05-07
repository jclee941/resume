import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import WebSocket from 'ws';
import { CHROME_DEBUG_PORT, PLATFORM_DOMAINS } from './constants.js';
import { log } from './logging.js';
import { SessionManager } from './session-status.js';

export async function checkChromeDevTools() {
  try {
    const res = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function connectWebSocket(wsUrl) {
  const ws = new WebSocket(wsUrl);
  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function createCdpSender(ws) {
  return (method, params = {}) => new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    const timeout = setTimeout(() => reject(new Error('CDP timeout')), 5000);
    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.off('message', handler);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function buildPlatformSession(platform, platformCookies) {
  return {
    platform,
    cookies: platformCookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    })),
    cookieString: platformCookies.map((c) => `${c.name}=${c.value}`).join('; '),
    cookieCount: platformCookies.length,
    extractedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function savePlatformSession(platform, session) {
  SessionManager.save(platform, session);
  const platformSessionDir = join(homedir(), '.opencode', 'data');
  if (!existsSync(platformSessionDir)) mkdirSync(platformSessionDir, { recursive: true });
  const platformSessionPath = join(platformSessionDir, `${platform}-session.json`);
  writeFileSync(platformSessionPath, JSON.stringify(session, null, 2));
}

export async function extractCookiesViaCDP(platforms) {
  try {
    const verRes = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`, {
      signal: AbortSignal.timeout(3000),
    });
    const { webSocketDebuggerUrl: wsUrl } = await verRes.json();
    if (!wsUrl) {
      log('No WebSocket URL from Chrome DevTools', 'warn');
      return 0;
    }

    const ws = await connectWebSocket(wsUrl);
    const cdpSend = createCdpSender(ws);
    const { cookies } = await cdpSend('Network.getAllCookies');
    log(`Retrieved ${cookies.length} total cookies from Chrome`, 'ok');

    let saved = 0;
    for (const platform of platforms) {
      const domains = PLATFORM_DOMAINS[platform];
      if (!domains) continue;

      const platformCookies = cookies.filter((c) => domains.some((d) => c.domain.includes(d.replace('.', ''))));
      if (platformCookies.length === 0) {
        log(`${platform}: No cookies found (not logged in?)`, 'warn');
        continue;
      }

      savePlatformSession(platform, buildPlatformSession(platform, platformCookies));
      log(`${platform}: Saved ${platformCookies.length} cookies via CDP`, 'ok');
      saved++;
    }

    ws.close();
    return saved;
  } catch (e) {
    log(`CDP extraction error: ${e.message}`, 'err');
    return 0;
  }
}
