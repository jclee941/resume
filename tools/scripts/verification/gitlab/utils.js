/**
 * Shared utilities for GitLab CI/CD verification
 */

export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

export function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    success: `${colors.green}[✓]${colors.reset}`,
    error: `${colors.red}[✗]${colors.reset}`,
    warning: `${colors.yellow}[!]${colors.reset}`,
  }[type];
  console.log(`${prefix} ${message}`);
}
