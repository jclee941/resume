import { PLATFORMS } from './config.js';
import { isSessionExpired, loadSession } from './session-persistence.js';
import { runPlatform } from './platform-auth.js';
import { syncAllSessions, syncToWorker } from './worker-sync.js';

export function printHelp() {
  console.log(`
Persistent Auth - Login once, auto-login forever

Usage:
  node auth-persistent.js <platform>           # Login to platform
  node auth-persistent.js --reset <platform>   # Clear state and re-login
  node auth-persistent.js --sync               # Sync all sessions to Worker
  node auth-persistent.js --status             # Show saved session status

Platforms: wanted, jobkorea, saramin

First run: Browser opens, login manually. State saved automatically.
Next runs: Already logged in, just extracts cookies.
`);
}

export function printStatus() {
  console.log('\n📊 Saved Sessions:\n');

  for (const [key, platform] of Object.entries(PLATFORMS)) {
    const session = loadSession(key);

    if (session) {
      const expired = isSessionExpired(session);
      console.log(
        `${expired ? '❌' : '✅'} ${platform.name}: ${session.cookieCount} cookies, expires ${session.expiresAt}`
      );
    } else {
      console.log(`⚪ ${platform.name}: No session`);
    }
  }

  console.log('');
}

export async function runCli(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    return 0;
  }

  if (args.includes('--sync')) {
    await syncAllSessions();
    return 0;
  }

  if (args.includes('--status')) {
    printStatus();
    return 0;
  }

  const reset = args.includes('--reset');
  const platformKey = args.find((arg) => !arg.startsWith('--'));

  if (!platformKey || !PLATFORMS[platformKey]) {
    console.error('Invalid platform. Use: wanted, jobkorea, saramin');
    return 1;
  }

  const session = await runPlatform(platformKey, reset);
  if (session) {
    await syncToWorker(session);
  }

  return session ? 0 : 1;
}
