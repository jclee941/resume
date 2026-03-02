#!/usr/bin/env node
import { program } from 'commander';
import { deploy } from '../src/commands/deploy.js';
import { verify } from '../src/commands/verify.js';
import { migrate, rollback, status, seed, create } from '../src/commands/db.js';
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
  .option('--dir <path>', 'Directory containing wrangler.toml')
  .option('--env <env>', 'Environment (production/dev)', 'production')
  .action(deploy);

program.command('verify').description('Verify service health').action(verify);

const db = program.command('db').description('D1 database migration management');

db.command('migrate')
  .description('Run pending migrations')
  .option('--env <env>', 'Environment (local/production)', 'local')
  .option('--dry-run', 'Preview migrations without applying')
  .action(migrate);

db.command('rollback')
  .description('Rollback migrations')
  .option('--env <env>', 'Environment (local/production)', 'local')
  .option('--steps <n>', 'Number of migrations to rollback', '1')
  .option('--dry-run', 'Preview rollback without applying')
  .action(rollback);

db.command('status')
  .description('Show migration status')
  .option('--env <env>', 'Environment (local/production)', 'local')
  .action(status);

db.command('seed')
  .description('Run seed data files')
  .option('--env <env>', 'Environment (local/production)', 'local')
  .option('--dry-run', 'Preview seed data without applying')
  .action(seed);

db.command('create')
  .description('Create a new migration file')
  .argument('<name>', 'Migration name (e.g., add_users_table)')
  .action(create);

program.parse();
