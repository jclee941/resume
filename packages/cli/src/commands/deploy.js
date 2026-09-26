import { execFileSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * @param {string} baseDir
 * @returns {string}
 */
function resolveRepositoryRoot(baseDir) {
  let current = path.resolve(baseDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'wrangler.jsonc'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(`No root Wrangler config found above ${baseDir}`);
}

/**
 * @typedef {Object} DeployOptions
 * @property {string} [workerFile]
 * @property {string} [dir]
 * @property {string} env
 */

/**
 * @typedef {Object} WranglerDeployInvocation
 * @property {string} command
 * @property {string[]} args
 * @property {string} cwd
 * @property {Record<string, string>} environment
 */

/**
 * @param {DeployOptions} options
 * @returns {WranglerDeployInvocation}
 */
export function createWranglerDeployInvocation({ workerFile, dir, env }) {
  const targetDirectory = workerFile ? path.dirname(workerFile) : dir;
  if (!targetDirectory) throw new Error('A worker file or directory is required');
  if (env !== 'production' && env !== 'preview') {
    throw new Error(`Unsupported Worker environment: ${env}`);
  }

  const cwd = resolveRepositoryRoot(targetDirectory);
  const args = ['wrangler', 'deploy', '--config', 'wrangler.jsonc'];
  if (env === 'preview') args.push('--env', 'preview');
  return { command: 'npx', args, cwd, environment: { CLOUDFLARE_ENV: '' } };
}

/**
 * @param {DeployOptions} options
 * @returns {Promise<void>}
 */
export async function deploy(options) {
  console.log(chalk.blue('🚀 Starting deployment...'));

  try {
    const { workerFile, dir, env } = options;

    if (!process.env.CLOUDFLARE_API_KEY || !process.env.CLOUDFLARE_EMAIL) {
      throw new Error('Missing Cloudflare credentials in .env');
    }

    const invocation = createWranglerDeployInvocation({ workerFile, dir, env });
    const target = workerFile || dir;
    console.log(chalk.yellow(`📦 Deploying: ${target}`));
    console.log(chalk.gray(`Running: ${invocation.command} ${invocation.args.join(' ')}`));
    execFileSync(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      stdio: 'inherit',
      env: { ...process.env, ...invocation.environment },
    });

    console.log(chalk.green('✅ Deployment successful!'));
  } catch (error) {
    console.error(chalk.red('❌ Deployment failed:'), /** @type {Error} */ (error).message);
    process.exit(1);
  }
}
