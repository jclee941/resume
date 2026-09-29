#!/usr/bin/env node
import { program } from 'commander';
import { deploy } from '../src/commands/deploy.js';
import { verify } from '../src/commands/verify.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root to ensure monorepo environment variables are available to the CLI
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env') });

program.name('resume-cli').description('Resume Automation CLI').version('1.0.0');

program
  .command('deploy')
  .description('Deploy services')
  .option('--worker-file <path>', 'Path to worker file')
  .option('--dir <path>', 'Directory within the Worker repository')
  .option('--env <env>', 'Environment (production/preview)', 'production')
  .action(deploy);

program.command('verify').description('Verify service health').action(verify);

program.parse();
