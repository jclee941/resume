import childProcess from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { PassThrough } from 'node:stream';

const healthSequence = JSON.parse(process.env.CRON_TEST_HEALTH_SEQUENCE);
let healthIndex = 0;

const originalExistsSync = fs.existsSync;
fs.existsSync = (path) => (String(path).endsWith('/.env') ? false : originalExistsSync(path));

childProcess.execSync = (command) => {
  const text = String(command);
  if (text.includes('SessionManager.checkHealth')) {
    fs.writeFileSync(process.env.CRON_TEST_SESSION_CHECK_PATH, 'checked');
    const health = healthSequence[Math.min(healthIndex, healthSequence.length - 1)];
    healthIndex += 1;
    return JSON.stringify(health);
  }
  if (text.includes('extract-cookies-cdp.js')) {
    if (process.env.CRON_TEST_REFRESH_SUCCEEDS === 'true') return '';
    throw new Error('simulated refresh failure');
  }
  throw new Error(`Unexpected execSync command: ${text}`);
};

childProcess.spawn = (command, args) => {
  fs.writeFileSync(process.env.CRON_TEST_CAPTURE_PATH, JSON.stringify({ command, args }));

  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    child.stdout.end();
    child.stderr.end();
    child.emit('close', 0);
  });
  return child;
};

syncBuiltinESMExports();
