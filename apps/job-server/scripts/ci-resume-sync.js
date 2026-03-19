#!/usr/bin/env node

/**
 * CI Script: Sync resume to Wanted platform
 * Run directly without starting the Fastify server.
 *
 * Usage:
 *   node apps/job-server/scripts/ci-resume-sync.js
 *
 * Required env vars:
 *   WANTED_EMAIL     - Wanted account email
 *   WANTED_COOKIES   - Wanted authentication cookies (preferred)
 *   WANTED_PASSWORD  - Wanted password for automatic cookie minting fallback
 *   WANTED_ONEID_CLIENT_ID - OneID client ID required for password fallback
 *   WANTED_RESUME_ID - Wanted resume ID to sync
 *   DRY_RUN          - 'true' for preview only
 */

import { SessionManager } from '../src/tools/auth.js';
import { unifiedResumeSyncTool } from '../src/tools/unified-resume-sync.js';

const requiredEnvVars = ['WANTED_EMAIL', 'WANTED_RESUME_ID'];
const missing = requiredEnvVars.filter((name) => !process.env[name]);

if (!process.env.WANTED_COOKIES && !process.env.WANTED_PASSWORD) {
  missing.push('WANTED_COOKIES or WANTED_PASSWORD');
}

if (
  !process.env.WANTED_COOKIES &&
  process.env.WANTED_PASSWORD &&
  !process.env.WANTED_ONEID_CLIENT_ID
) {
  missing.push('WANTED_ONEID_CLIENT_ID');
}

if (missing.length > 0) {
  console.error(`Error: Missing required environment variables: ${missing.join(', ')}`);
  console.error('Wanted sync automation requires:');
  console.error('- WANTED_EMAIL: account email used for traceability');
  console.error('- WANTED_COOKIES: browser Cookie header copied from wanted.co.kr');
  console.error('- WANTED_PASSWORD: fallback for automatic cookie issuance');
  console.error('- WANTED_ONEID_CLIENT_ID: OneID client identifier for password fallback');
  console.error('- WANTED_RESUME_ID: target Wanted resume ID');
  process.exit(1);
}

const wantedEmail = process.env.WANTED_EMAIL;
const wantedPassword = process.env.WANTED_PASSWORD;
const wantedOneIdClientId = process.env.WANTED_ONEID_CLIENT_ID;
const wantedResumeId = process.env.WANTED_RESUME_ID;
const dryRun = process.env.DRY_RUN === 'true';

function buildWantedOneIdLoginUrl(clientId) {
  const url = new URL('https://id.wanted.co.kr/login');
  url.searchParams.set('service', 'wanted');
  url.searchParams.set('before_url', 'https://www.wanted.co.kr/');
  url.searchParams.set('client_id', clientId);
  return url.toString();
}

async function mintWantedCookies(email, password, clientId) {
  if (!clientId) {
    throw new Error('WANTED_ONEID_CLIENT_ID is required when minting Wanted cookies');
  }

  const response = await fetch('https://id-api.wanted.co.kr/v1/auth/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://id.wanted.co.kr',
      Referer: buildWantedOneIdLoginUrl(clientId),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'oneid-agent': 'web',
    },
    body: JSON.stringify({
      grant_type: 'password',
      email,
      password,
      client_id: clientId,
      beforeUrl: 'https://www.wanted.co.kr/',
      redirect_url: null,
      stay_signed_in: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OneID token request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const token = payload?.token;
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('OneID token response did not include a usable token');
  }

  return `WWW_ONEID_ACCESS_TOKEN=${token}`;
}

try {
  let wantedCookies = process.env.WANTED_COOKIES;

  if (!wantedCookies) {
    console.log('No WANTED_COOKIES provided. Minting a fresh Wanted session cookie from OneID.');
    wantedCookies = await mintWantedCookies(wantedEmail, wantedPassword, wantedOneIdClientId);
  }

  console.log(
    `Starting Wanted resume sync (${dryRun ? 'dry-run' : 'apply'}) for resume ${wantedResumeId}`
  );

  SessionManager.save('wanted', {
    email: wantedEmail,
    cookies: wantedCookies,
    cookieString: wantedCookies,
    timestamp: Date.now(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    cookieCount: wantedCookies.split(';').filter(Boolean).length,
  });
  console.log('✅ Session saved successfully');

  const result = await unifiedResumeSyncTool.execute({
    action: 'sync',
    platforms: ['wanted'],
    dry_run: dryRun,
    resume_id: wantedResumeId,
  });

  console.log('Sync result:', JSON.stringify(result, null, 2));

  if (!result.success) {
    console.error('❌ Sync failed');
    process.exit(1);
  }

  console.log('✅ Resume sync completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
