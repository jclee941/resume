#!/usr/bin/env node
/**
 * Extract cookies via Chrome DevTools Protocol
 * Requires Chrome running with: google-chrome --remote-debugging-port=9222
 */
import WebSocket from 'ws';
import { SessionManager } from '../src/shared/services/session/index.js';

const CHROME_DEBUG_PORT = process.env.CHROME_DEBUG_PORT || 9222;

const PLATFORMS = {
  wanted: { domains: ['.wanted.co.kr', 'wanted.co.kr'] },
  jobkorea: { domains: ['.jobkorea.co.kr', 'jobkorea.co.kr'] },
  remember: { domains: ['.rememberapp.co.kr', 'rememberapp.co.kr'] },
  saramin: { domains: ['.saramin.co.kr', 'saramin.co.kr'] },
  linkedin: { domains: ['.linkedin.com', 'linkedin.com'] },
};

async function getWebSocketUrl() {
  const res = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`);
  if (!res.ok) throw new Error('Chrome DevTools not available');
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

async function sendCDPCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const timeout = setTimeout(() => reject(new Error('CDP timeout')), 5000);

    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.off('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function extractCookies(platforms) {
  console.log('\n🔐 Extracting cookies via Chrome DevTools Protocol\n');

  // Connect to Chrome
  let wsUrl;
  try {
    wsUrl = await getWebSocketUrl();
    console.log('✓ Connected to Chrome DevTools');
  } catch {
    console.error('✗ Chrome DevTools not available');
    console.log('\nStart Chrome with remote debugging:');
    console.log(`  google-chrome --remote-debugging-port=${CHROME_DEBUG_PORT}\n`);
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  try {
    // Get all cookies
    const { cookies } = await sendCDPCommand(ws, 'Network.getAllCookies');
    console.log(`✓ Retrieved ${cookies.length} total cookies\n`);

    // Filter and save by platform
    for (const platformKey of platforms) {
      const platform = PLATFORMS[platformKey];
      if (!platform) {
        console.log(`✗ Unknown platform: ${platformKey}`);
        continue;
      }

      const platformCookies = cookies.filter((c) =>
        platform.domains.some((d) => c.domain.includes(d.replace('.', '')))
      );

      if (platformCookies.length === 0) {
        console.log(`✗ ${platformKey}: No cookies found (not logged in?)`);
        continue;
      }

      // Find auth cookie
      const authCookie = platformCookies.find(
        (c) => c.name.includes('TOKEN') || c.name.includes('session') || c.name.includes('auth')
      );

      const session = {
        platform: platformKey,
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
        extractedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      SessionManager.save(platformKey, session);

      console.log(`✓ ${platformKey}: Saved ${platformCookies.length} cookies`);
      if (authCookie) {
        console.log(`  Auth: ${authCookie.name}`);
      }
    }
  } finally {
    ws.close();
  }

  console.log('\n✓ Done\n');
}

// Parse args
const args = process.argv.slice(2);
const platforms = args.length > 0 ? args : Object.keys(PLATFORMS);
extractCookies(platforms).catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
