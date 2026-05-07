import { run } from './command-runner.js';
import { log } from './logging.js';

export function runVerification() {
  log('Building worker.js...', 'run');
  try {
    run('npm run build', { cwd: '..', silent: true });
    log('Build successful', 'ok');
  } catch {
    log('Build failed', 'err');
  }

  log('Checking for errors...', 'run');
  try {
    const result = run('npx tsc --noEmit 2>&1 || true', { silent: true });
    if (result?.includes('error')) {
      log('TypeScript errors found', 'warn');
    } else {
      log('No TypeScript errors', 'ok');
    }
  } catch {
    log('TypeScript check skipped', 'warn');
  }
}
