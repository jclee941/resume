const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const path = require('node:path');
const test = globalThis.test || require('node:test');

const cloudflareWorkersStub = `data:text/javascript,${encodeURIComponent(`
  export class WorkflowEntrypoint {
    constructor(_context, env) { this.env = env; }
  }
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'cloudflare:workers') {
      return { shortCircuit: true, url: cloudflareWorkersStub };
    }
    return nextResolve(specifier, context);
  },
});

if (typeof jest !== 'undefined') {
  jest.unstable_mockModule(
    'cloudflare:workers',
    () => ({
      WorkflowEntrypoint: class {
        constructor(_context, env) {
          this.env = env;
        }
      },
    }),
    { virtual: true }
  );
}

const workflowPromise = import(
  path.join(
    __dirname,
    '../../../apps/job-dashboard/src/workflows/job-crawling/job-crawling-workflow.js'
  )
);

function createHarness(sessionValue = null) {
  const stepNames = [];
  const sessionKeys = [];
  const database = {
    batchCalls: 0,
    prepare() {
      return {
        async first() {
          return null;
        },
        bind() {
          return {};
        },
      };
    },
    async batch() {
      database.batchCalls += 1;
    },
  };
  const env = {
    JOB_DB: database,
    SESSIONS: {
      async get(key) {
        sessionKeys.push(key);
        return key === 'auth:wanted' ? sessionValue : null;
      },
    },
  };
  const step = {
    async do(name, ...args) {
      stepNames.push(name);
      return args.at(-1)();
    },
    async sleep() {},
  };
  return { database, env, sessionKeys, step, stepNames };
}

test('default run crawls LinkedIn and Remember without public-platform sessions', async () => {
  const { JobCrawlingWorkflow } = await workflowPromise;
  const harness = createHarness();
  const crawled = [];
  const workflow = new JobCrawlingWorkflow({}, harness.env);
  workflow.crawlPlatform = async (platform) => {
    crawled.push(platform);
    return { jobs: [] };
  };

  const result = await workflow.run({ payload: { dryRun: true } }, harness.step);

  assert.deepEqual(crawled, ['linkedin', 'remember']);
  assert.deepEqual(harness.sessionKeys, ['auth:wanted']);
  assert.deepEqual(result.summary.platforms, ['linkedin', 'remember']);
  assert.match(result.summary.errors[0].error, /authentication required.*wanted session missing/i);
});

test('invalid Wanted auth produces an explicit error with no crawl, save, or notify', async () => {
  const { JobCrawlingWorkflow } = await workflowPromise;
  const harness = createHarness('corrupt-fixture');
  const workflow = new JobCrawlingWorkflow({}, harness.env);
  let crawlCalls = 0;
  workflow.crawlPlatform = async () => {
    crawlCalls += 1;
    return {
      jobs: [{ id: 'wanted-1', company: 'Fixture', position: 'Engineer' }],
    };
  };

  const result = await workflow.run(
    { payload: { platforms: ['wanted'], searchCriteria: {}, dryRun: false } },
    harness.step
  );

  assert.equal(crawlCalls, 0);
  assert.equal(harness.database.batchCalls, 0);
  assert.equal(harness.stepNames.includes('crawl-wanted'), false);
  assert.equal(harness.stepNames.includes('save-results'), false);
  assert.equal(harness.stepNames.includes('notify'), false);
  assert.match(result.summary.errors[0].error, /authentication required.*invalid wanted session/i);
});

test('notification result reports a disabled Telegram delivery without false success', async () => {
  await workflowPromise;
  const { notifyJobCrawlingResults } = await import(
    path.join(
      __dirname,
      '../../../apps/job-dashboard/src/workflows/job-crawling/notifications.js'
    )
  );
  const result = await notifyJobCrawlingResults(
    {},
    ['linkedin'],
    { totalJobs: 1 },
    [{ company: 'Fixture', position: 'Engineer', matchScore: 90 }]
  );

  assert.deepEqual(result, { notified: false, reason: 'not_configured' });
});
