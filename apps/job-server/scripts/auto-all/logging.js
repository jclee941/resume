// ANSI colors
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export function log(msg, type = 'info') {
  const icons = { info: '→', ok: '✓', err: '✗', warn: '⚠', run: '▶' };
  const colors = { info: c.cyan, ok: c.green, err: c.red, warn: c.yellow, run: c.blue };
  console.log(`${colors[type]}${icons[type]}${c.reset} ${msg}`);
}

export function header(title) {
  console.log(`\n${c.bold}━━━ ${title} ━━━${c.reset}\n`);
}

export function printBanner() {
  console.log(`\n${c.bold}╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║     Resume Automation Runner         ║${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════╝${c.reset}`);
}
