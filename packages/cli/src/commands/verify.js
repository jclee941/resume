import fetch from 'node-fetch';
import chalk from 'chalk';

/**
 * @returns {Promise<void>}
 */
export async function verify() {
  console.log(chalk.blue('🔍 Verifying services...'));

  const endpoints = [
    { name: 'Resume Portfolio', url: 'https://resume.jclee.me' },
    { name: 'Job Automation', url: 'https://resume.jclee.me/job' },
  ];

  let failed = false;

  for (const { name, url } of endpoints) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        console.log(chalk.green(`✅ ${name}: OK (${res.status})`));
      } else {
        console.log(chalk.red(`❌ ${name}: Failed (${res.status})`));
        failed = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`❌ ${name}: Error (${message})`));
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }
}
