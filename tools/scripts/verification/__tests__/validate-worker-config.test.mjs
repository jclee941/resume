import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  validateWorkerConfiguration,
  validateWorkerConsumers,
  validateWorkerRepository,
} from '../validate-worker-config.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function validConfiguration() {
  return {
    name: 'resume',
    main: 'apps/portfolio/entry.js',
    compatibility_date: '2026-04-29',
    build: { command: 'npm run build', cwd: '.' },
    assets: { directory: 'apps/portfolio/assets', binding: 'ASSETS' },
    vars: {
      ENVIRONMENT: 'production',
      ELASTICSEARCH_INDEX: 'resume-logs-worker',
    },
    routes: [{ pattern: 'resume.jclee.me', custom_domain: true }],
    triggers: { crons: ['0 23 * * *', '0 21 * * *'] },
    migrations: [{ tag: 'v1', new_classes: ['BrowserSessionDO'] }],
    ai: { binding: 'AI' },
    browser: { binding: 'MYBROWSER' },
    durable_objects: {
      bindings: [{ name: 'BROWSER_SESSION', class_name: 'BrowserSessionDO' }],
    },
    d1_databases: [
      { binding: 'DB', database_name: 'resume-prod-db', database_id: 'db-id' },
      { binding: 'JOB_DB', database_name: 'job-dashboard-db', database_id: 'job-db-id' },
    ],
    kv_namespaces: [
      { binding: 'SESSIONS', id: 'sessions-id' },
      { binding: 'RATE_LIMIT_KV', id: 'rate-limit-id' },
      { binding: 'NONCE_KV', id: 'nonce-id' },
    ],
    workflows: [
      ['job-crawling-workflow', 'JOB_CRAWLING_WORKFLOW', 'JobCrawlingWorkflow'],
      ['application-workflow', 'APPLICATION_WORKFLOW', 'ApplicationWorkflow'],
      ['resume-sync-workflow', 'RESUME_SYNC_WORKFLOW', 'ResumeSyncWorkflow'],
      ['daily-report-workflow', 'DAILY_REPORT_WORKFLOW', 'DailyReportWorkflow'],
      ['health-check-workflow', 'HEALTH_CHECK_WORKFLOW', 'HealthCheckWorkflow'],
      ['backup-workflow', 'BACKUP_WORKFLOW', 'BackupWorkflow'],
      ['cleanup-workflow', 'CLEANUP_WORKFLOW', 'CleanupWorkflow'],
    ].map(([name, binding, class_name]) => ({ name, binding, class_name })),
    queues: {
      producers: [
        { queue: 'crawl-tasks', binding: 'CRAWL_TASKS' },
        { queue: 'notifications', binding: 'NOTIFICATION_QUEUE' },
      ],
      consumers: [
        { queue: 'crawl-tasks', dead_letter_queue: 'crawl-tasks-dlq' },
        { queue: 'notifications', dead_letter_queue: 'notifications-dlq' },
      ],
    },
    env: {
      preview: {
        name: 'resume-preview',
        vars: {
          ENVIRONMENT: 'preview',
          ELASTICSEARCH_INDEX: 'resume-logs-worker-preview',
        },
        assets: { directory: 'apps/portfolio/assets', binding: 'ASSETS' },
        routes: [],
        triggers: { crons: [] },
      },
    },
  };
}

describe('Worker configuration characterization', () => {
  it('uses the configured deploy target and keeps preview capabilities isolated', () => {
    // Given: the deploy command selected by the repository's public script surface.
    const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
    const deployCommand = manifest.scripts['deploy:wrangler:root:dry-run'];
    const configMatch = deployCommand.match(/--config\s+(\S+)/u);
    assert.ok(configMatch, 'deploy dry-run must select a Wrangler config');
    const configPath = path.join(repositoryRoot, configMatch[1]);
    const outputDirectory = mkdtempSync(path.join(tmpdir(), 'resume-worker-characterization-'));

    try {
      // When: Wrangler resolves that same config for the preview environment.
      const commandEnv = { ...process.env, NO_COLOR: '1' };
      delete commandEnv.FORCE_COLOR;
      const rawOutput = execFileSync(
        'npx',
        [
          'wrangler',
          'deploy',
          '--config',
          configPath,
          '--env',
          'preview',
          '--dry-run',
          '--outdir',
          outputDirectory,
        ],
        {
          cwd: repositoryRoot,
          encoding: 'utf8',
          env: commandEnv,
          timeout: 180_000,
        }
      );
      // Strip any ANSI escapes Wrangler emits regardless of NO_COLOR so the
      // characterization is resilient to the invoking shell's color settings.
      const ansiEscape = String.fromCharCode(27);
      const output = rawOutput.replace(new RegExp(`${ansiEscape}\\[[0-9;]*m`, 'gu'), '');

      // Then: the resolved preview inventory is visible and production-only
      // capabilities are absent from Wrangler's deploy surface.
      assert.match(output, /ENVIRONMENT\s+\("preview"\)/u);
      for (const binding of ['DB', 'JOB_DB', 'AI', 'MYBROWSER', 'BROWSER_SESSION']) {
        assert.doesNotMatch(output, new RegExp(`\\b${binding}\\b`, 'u'));
      }
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
});

describe('Worker configuration policy', () => {
  it('rejects missing JOB_DB', () => {
    // Given: an otherwise complete production binding inventory.
    const config = validConfiguration();
    config.d1_databases = config.d1_databases.filter(({ binding }) => binding !== 'JOB_DB');

    // When/Then: the absent merged-dashboard database is rejected.
    assert.throws(() => validateWorkerConfiguration(config), /JOB_DB/u);
  });

  it('rejects inherited route and cron exposure in preview', () => {
    const config = validConfiguration();
    delete config.env.preview.routes;
    delete config.env.preview.triggers;

    assert.throws(() => validateWorkerConfiguration(config), /preview.*routes|routes.*preview/u);
  });

  it('allows only the global migration metadata exception in preview', () => {
    const config = validConfiguration();

    assert.doesNotThrow(() => validateWorkerConfiguration(config));
    config.env.preview.migrations = config.migrations;
    assert.throws(() => validateWorkerConfiguration(config), /preview.*migrations/u);
  });

  it('rejects production bindings in preview', () => {
    const config = validConfiguration();
    config.env.preview.d1_databases = config.d1_databases;

    assert.throws(() => validateWorkerConfiguration(config), /preview.*d1_databases/u);
  });

  it('rejects a dropped queue producer binding', () => {
    const config = validConfiguration();
    config.queues.producers = config.queues.producers.filter(
      ({ binding }) => binding !== 'CRAWL_TASKS'
    );

    assert.throws(() => validateWorkerConfiguration(config), /queue producer/u);
  });

  it('rejects malformed JSONC input', () => {
    assert.throws(() => validateWorkerConfiguration('{ "name": }'), /JSONC|parse/u);
  });
});

describe('Worker configuration consumers', () => {
  for (const [name, content] of [
    ['removed portfolio config', 'wrangler --config apps/portfolio/wrangler.jsonc'],
    ['removed dashboard config', 'wrangler --config apps/job-dashboard/wrangler.jsonc'],
    ['production named environment', 'wrangler deploy --config wrangler.jsonc --env production'],
    ['production equals environment', 'wrangler deploy --config wrangler.jsonc --env=production'],
  ]) {
    it(`rejects stale consumer: ${name}`, () => {
      assert.throws(
        () => validateWorkerConsumers([{ path: 'consumer.txt', content }]),
        /consumer\.txt/u
      );
    });
  }

  it('rejects stale workspace manifests and active shell consumers discovered from a repository', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'resume-worker-repository-'));
    mkdirSync(path.join(fixtureRoot, 'apps', 'portfolio'), { recursive: true });
    mkdirSync(path.join(fixtureRoot, 'packages', 'data'), { recursive: true });
    mkdirSync(path.join(fixtureRoot, 'packages', 'cli'), { recursive: true });
    mkdirSync(path.join(fixtureRoot, 'tools', 'scripts'), { recursive: true });
    writeFileSync(path.join(fixtureRoot, 'wrangler.jsonc'), JSON.stringify(validConfiguration()));
    writeFileSync(path.join(fixtureRoot, 'package.json'), '{}');
    writeFileSync(
      path.join(fixtureRoot, 'packages', 'data', 'package.json'),
      JSON.stringify({ scripts: { stale: 'wrangler --config apps/job-dashboard/wrangler.jsonc' } })
    );
    writeFileSync(
      path.join(fixtureRoot, 'tools', 'scripts', 'stale.sh'),
      'wrangler deploy --config apps/portfolio/wrangler.jsonc --env production'
    );

    try {
      assert.throws(() => validateWorkerRepository(fixtureRoot), /packages\/data|stale\.sh/u);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('rejects any additional Wrangler config discovered in a workspace', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'resume-worker-config-count-'));
    mkdirSync(path.join(fixtureRoot, 'apps', 'portfolio'), { recursive: true });
    mkdirSync(path.join(fixtureRoot, 'packages', 'cli'), { recursive: true });
    writeFileSync(path.join(fixtureRoot, 'wrangler.jsonc'), JSON.stringify(validConfiguration()));
    writeFileSync(path.join(fixtureRoot, 'apps', 'portfolio', 'wrangler.toml'), 'name = "stale"');
    writeFileSync(path.join(fixtureRoot, 'package.json'), '{}');

    try {
      assert.throws(() => validateWorkerRepository(fixtureRoot), /only config/u);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
