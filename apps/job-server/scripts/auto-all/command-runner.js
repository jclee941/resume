import { execSync } from 'child_process';

/**
 * @typedef {import('child_process').ExecSyncOptions & { silent?: boolean, ignoreError?: boolean }} RunOptions
 */

/**
 * @param {string} cmd
 * @param {RunOptions} [opts={}]
 * @returns {string | Buffer | null}
 */
export function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts });
  } catch (e) {
    if (!opts.ignoreError) throw e;
    return null;
  }
}
