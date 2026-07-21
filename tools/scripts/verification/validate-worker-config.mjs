import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, printParseErrorCode } from 'jsonc-parser';

const REQUIRED_WORKFLOWS = [
  ['APPLICATION_WORKFLOW', 'application-workflow', 'ApplicationWorkflow'],
  ['BACKUP_WORKFLOW', 'backup-workflow', 'BackupWorkflow'],
  ['CLEANUP_WORKFLOW', 'cleanup-workflow', 'CleanupWorkflow'],
  ['DAILY_REPORT_WORKFLOW', 'daily-report-workflow', 'DailyReportWorkflow'],
  ['HEALTH_CHECK_WORKFLOW', 'health-check-workflow', 'HealthCheckWorkflow'],
  ['JOB_CRAWLING_WORKFLOW', 'job-crawling-workflow', 'JobCrawlingWorkflow'],
  ['RESUME_SYNC_WORKFLOW', 'resume-sync-workflow', 'ResumeSyncWorkflow'],
];
const REQUIRED_QUEUE_PRODUCERS = [
  { queue: 'crawl-tasks', binding: 'CRAWL_TASKS' },
  { queue: 'notifications', binding: 'NOTIFICATION_QUEUE' },
];
const REQUIRED_QUEUE_CONSUMERS = [
  { queue: 'crawl-tasks', dead_letter_queue: 'crawl-tasks-dlq' },
  { queue: 'notifications', dead_letter_queue: 'notifications-dlq' },
];
const PREVIEW_FORBIDDEN_KEYS = [
  'ai',
  'browser',
  'd1_databases',
  'durable_objects',
  'kv_namespaces',
  'migrations',
  'queues',
  'workflows',
];
const SCANNED_EXTENSIONS = new Set('.cjs .go .js .json .mjs .sh .ts .tsx .yaml .yml'.split(' '));
const IGNORED_DIRECTORIES = new Set(['.git', '.tmp', 'node_modules', 'third_party', '.worktrees']);

function parseConfiguration(input) {
  if (typeof input !== 'string') return input;
  const errors = [];
  const config = parse(input, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    const detail = errors.map(({ error }) => printParseErrorCode(error)).join(', ');
    throw new Error(`JSONC parse failed: ${detail}`);
  }
  return config;
}

function requireBindings(config, key, expected) {
  const bindings = config[key];
  assert.ok(Array.isArray(bindings), `${key} must be an array`);
  const actual = bindings.map(({ binding }) => binding).sort();
  assert.deepEqual(actual, [...expected].sort(), `${key} binding inventory mismatch`);
}

function requireQueueTopology(queues) {
  assert.ok(queues && typeof queues === 'object', 'queues must be explicit');
  assert.deepEqual(
    (queues.producers ?? []).map(({ queue, binding }) => ({ queue, binding })),
    REQUIRED_QUEUE_PRODUCERS,
    'queue producer inventory mismatch'
  );
  assert.deepEqual(
    (queues.consumers ?? []).map(({ queue, dead_letter_queue }) => ({ queue, dead_letter_queue })),
    REQUIRED_QUEUE_CONSUMERS,
    'queue consumer inventory mismatch'
  );
}

export function validateWorkerConfiguration(input) {
  const config = parseConfiguration(input);
  assert.equal(config.name, 'resume', 'production Worker name must be resume');
  assert.equal(config.main, 'apps/portfolio/entry.js', 'main must be root-relative');
  assert.equal(config.compatibility_date, '2026-04-29', 'compatibility_date mismatch');
  assert.equal(config.assets?.directory, 'apps/portfolio/assets', 'assets must be root-relative');
  assert.equal(config.assets?.binding, 'ASSETS', 'ASSETS binding missing');
  assert.equal(config.vars?.ENVIRONMENT, 'production', 'production vars missing');
  assert.equal(config.vars?.ELASTICSEARCH_INDEX, 'resume-logs-worker', 'production index missing');
  assert.deepEqual(
    config.routes,
    [{ pattern: 'resume.jclee.me', custom_domain: true }],
    'production routes mismatch'
  );
  assert.deepEqual(
    config.triggers?.crons,
    ['0 23 * * *', '0 21 * * *'],
    'production cron mismatch'
  );
  assert.equal(config.ai?.binding, 'AI', 'AI binding missing');
  assert.equal(config.browser?.binding, 'MYBROWSER', 'Browser binding missing');
  requireBindings(config, 'd1_databases', ['DB', 'JOB_DB']);
  requireBindings(config, 'kv_namespaces', ['NONCE_KV', 'RATE_LIMIT_KV', 'SESSIONS']);
  assert.deepEqual(
    config.durable_objects?.bindings,
    [{ name: 'BROWSER_SESSION', class_name: 'BrowserSessionDO' }],
    'Durable Object binding mismatch'
  );
  assert.deepEqual(
    config.migrations,
    [{ tag: 'v1', new_classes: ['BrowserSessionDO'] }],
    'global v1 migration mismatch'
  );
  const workflows = config.workflows
    ?.map(({ binding, name, class_name }) => [binding, name, class_name])
    .sort(([left], [right]) => left.localeCompare(right));
  assert.deepEqual(workflows, REQUIRED_WORKFLOWS, 'Workflow inventory mismatch');
  requireQueueTopology(config.queues);
  assert.equal(config.env?.production, undefined, 'production must use the default environment');

  const preview = config.env?.preview;
  assert.equal(preview?.name, 'resume-preview', 'preview Worker name mismatch');
  assert.equal(preview?.vars?.ENVIRONMENT, 'preview', 'preview vars missing');
  assert.equal(
    preview?.vars?.ELASTICSEARCH_INDEX,
    'resume-logs-worker-preview',
    'preview index missing'
  );
  assert.equal(preview?.assets?.directory, 'apps/portfolio/assets', 'preview assets mismatch');
  assert.deepEqual(preview?.routes, [], 'preview routes must explicitly override production');
  assert.deepEqual(
    preview?.triggers?.crons,
    [],
    'preview crons must explicitly override production'
  );
  for (const key of PREVIEW_FORBIDDEN_KEYS) {
    assert.equal(preview?.[key], undefined, `preview must not declare ${key}`);
  }

  return {
    production: {
      d1: config.d1_databases.map(({ binding }) => binding),
      kv: config.kv_namespaces.map(({ binding }) => binding),
      workflows: config.workflows.map(({ binding }) => binding),
      routes: config.routes,
      crons: config.triggers.crons,
      queues: config.queues,
    },
    preview: { name: preview.name, routes: preview.routes, crons: preview.triggers.crons },
  };
}

export function validateWorkerConsumers(consumers) {
  const childPaths = [
    ['apps', 'portfolio', 'wrangler.jsonc'].join('/'),
    ['apps', 'job-dashboard', 'wrangler.jsonc'].join('/'),
  ];
  const failures = [];
  for (const { path: consumerPath, content } of consumers) {
    if (childPaths.some((childPath) => content.includes(childPath))) {
      failures.push(`${consumerPath}: removed child Wrangler config`);
    }
    if (/wrangler[^\n]*--env(?:\s+|=)["']?production\b/u.test(content)) {
      failures.push(`${consumerPath}: production must omit --env`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
}

function collectFiles(target, root, files) {
  if (!existsSync(target)) return;
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep);
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment) || segment === '__tests__')) {
    return;
  }
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) collectFiles(path.join(target, entry), root, files);
    return;
  }
  if (SCANNED_EXTENSIONS.has(path.extname(target))) {
    files.push({ path: relative, content: readFileSync(target, 'utf8') });
  }
}

function collectWranglerConfigs(target, root, configs) {
  if (!existsSync(target)) return;
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep);
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) return;
  if (statSync(target).isDirectory()) {
    for (const entry of readdirSync(target)) {
      collectWranglerConfigs(path.join(target, entry), root, configs);
    }
    return;
  }
  if (['wrangler.jsonc', 'wrangler.toml'].includes(path.basename(target))) configs.push(relative);
}

export function validateWorkerRepository(repositoryRoot) {
  const rootConfig = path.join(repositoryRoot, 'wrangler.jsonc');
  const configs = [];
  collectWranglerConfigs(repositoryRoot, repositoryRoot, configs);
  assert.deepEqual(
    configs.sort(),
    ['wrangler.jsonc'],
    'root wrangler.jsonc must be the only config'
  );
  const inventory = validateWorkerConfiguration(readFileSync(rootConfig, 'utf8'));
  const files = [];
  for (const target of [
    'package.json',
    'playwright.config.js',
    'packages/cli',
    'tools/ci',
    'tools/scripts',
    '.github/workflows',
  ]) {
    collectFiles(path.join(repositoryRoot, target), repositoryRoot, files);
  }
  for (const workspaceRoot of ['apps', 'packages']) {
    const absoluteRoot = path.join(repositoryRoot, workspaceRoot);
    for (const workspace of readdirSync(absoluteRoot)) {
      collectFiles(path.join(absoluteRoot, workspace, 'package.json'), repositoryRoot, files);
    }
  }
  validateWorkerConsumers(files);
  return inventory;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const inventory = validateWorkerRepository(repositoryRoot);
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}
