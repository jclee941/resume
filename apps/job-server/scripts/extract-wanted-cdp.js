#!/usr/bin/env node
/**
 * Extract cookies from Wanted.co.kr using Chrome DevTools Protocol
 * Run this AFTER manually logging into Wanted in a browser with remote debugging
 */
import WebSocket from 'ws';
import { SessionManager } from '../src/shared/services/session/index.js';

const CHROME_DEBUG_PORT = process.env.CHROME_DEBUG_PORT || 9222;
const SESSION_PATH = '/home/jclee/.OpenCode/data/wanted-session.json';

async function getWebSocketUrl() {
  const res = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`);
  if (!res.ok) throw new Error('Chrome DevTools not available');
  const data = await res.json();
  return data.webSocketDebuggerUrl;
}

async function sendCDPCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const timeout = setTimeout(() => reject(new Error('CDP timeout')), 10000);

    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function extractWantedCookies() {
  console.log('\n🔐 Extracting Wanted.co.kr cookies via Chrome DevTools Protocol\n');

  let wsUrl;
  try {
    wsUrl = await getWebSocketUrl();
    console.log('✓ Connected to Chrome DevTools');
  } catch {
    console.error('✗ Chrome DevTools not available');
    console.log('\nStart Chrome with:');
    console.log(`  google-chrome --remote-debugging-port=${CHROME_DEBUG_PORT}`);
    console.log('\nThen login to Wanted and run this script again.\n');
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  try {
    // Get all cookies from Chrome
    const { cookies } = await sendCDPCommand(ws, 'Network.getAllCookies');
    console.log(`✓ Retrieved ${cookies.length} total cookies\n`);

    // Filter Wanted cookies
    const wantedCookies = cookies.filter((c) => c.domain.includes('wanted'));

    if (wantedCookies.length === 0) {
      console.log('✗ Wanted: No cookies found (not logged in?)');
      console.log('\n⚠️  Please login to Wanted in Chrome first, then run this script\n');
      return;
    }

    // Find auth cookie
    const authCookie = wantedCookies.find(
      (c) =>
        c.name.includes('TOKEN') ||
        c.name.includes('session') ||
        c.name.includes('auth') ||
        c.name.includes('login')
    );

    const session = {
      platform: 'wanted',
      cookies: wantedCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
      cookieString: wantedCookies.map((c) => `${c.name}=${c.value}`).join('; '),
      cookieCount: wantedCookies.length,
      extractedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    SessionManager.save('wanted', session);

    console.log(`✓ Wanted: Saved ${wantedCookies.length} cookies`);
    if (authCookie) {
      console.log(`  Auth: ${authCookie.name}`);
    }
    console.log(`  Session saved to: ${SESSION_PATH}`);
  } finally {
    ws.close();
  }

  console.log('\n✓ Done\n');
}

extractWantedCookies().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
