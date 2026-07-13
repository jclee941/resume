const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const path = require('node:path');
const test = globalThis.test || require('node:test');

const cloudflareWorkersStub = `data:text/javascript,${encodeURIComponent(`
  export class WorkflowEntrypoint {
    constructor(_context, env) {
      this.env = env;
    }
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

const workflowModulePromise = import(
  path.join(
    __dirname,
    '../../../apps/job-dashboard/src/workflows/job-crawling/job-crawling-workflow.js'
  )
);

const matchedJob = {
  id: 'linkedin-101',
  company: 'Fixture Labs',
  position: 'Platform Engineer',
};

function createDatabase({ batchError } = {}) {
  const database = {
    batchCalls: 0,
    prepare(sql) {
      if (sql.includes("key = 'auto_apply_config'")) {
        return {
          async first() {
            return { value: JSON.stringify({ minMatchScore: 1 }) };
          },
        };
      }
      return {
        bind(...values) {
          return { values };
        },
      };
    },
    async batch() {
      database.batchCalls += 1;
      if (batchError) {
        throw batchError;
      }
      return [];
    },
  };
  return database;
}

async function createHarness({ platforms, batchError } = {}) {
  const { JobCrawlingWorkflow } = await workflowModulePromise;
  const stepNames = [];
  const rejectedStepNames = [];
  const database = createDatabase({ batchError });
  const authenticated = new Set(platforms ?? ['wanted']);
  const env = {
    JOB_DB: database,
    SESSIONS: {
      async get(key) {
        return authenticated.has(key.replace('auth:', '')) ? 'fixture-session' : null;
      },
    },
  };
  const step = {
    async do(name, ...args) {
      stepNames.push(name);
      try {
        return await args.at(-1)();
      } catch (error) {
        rejectedStepNames.push(name);
        throw error;
      }
    },
    async sleep() {},
  };
  const workflow = new JobCrawlingWorkflow({}, env);
  workflow.validateSession = async () => true;

  return { database, rejectedStepNames, step, stepNames, workflow };
}

test('C002 dry-run returns matches without persistence or notification side effects', async () => {
  const { database, step, stepNames, workflow } = await createHarness();
  workflow.crawlPlatform = async () => ({ jobs: [matchedJob] });

  const result = await workflow.run(
    { payload: { platforms: ['wanted'], searchCriteria: {}, dryRun: true } },
    step
  );

  assert.equal(result.success, true);
  assert.equal(result.jobs.length, 1);
  assert.equal(database.batchCalls, 0);
  assert.deepEqual(stepNames, ['validate-auth', 'crawl-wanted', 'process-results', 'match-jobs']);
});

test('C002 empty dry-run completes without persistence or notification side effects', async () => {
  const { database, step, stepNames, workflow } = await createHarness();
  workflow.crawlPlatform = async () => ({ jobs: [] });

  const result = await workflow.run(
    { payload: { platforms: ['wanted'], searchCriteria: {}, dryRun: true } },
    step
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.jobs, []);
  assert.equal(database.batchCalls, 0);
  assert.deepEqual(
    stepNames.filter((name) => name === 'save-results' || name === 'notify'),
    []
  );
});

test('C003 records one platform failure and completes with another platform result', async () => {
  const { database, rejectedStepNames, step, stepNames, workflow } = await createHarness({
    platforms: ['wanted', 'linkedin'],
  });
  workflow.crawlPlatform = async (platform) => {
    if (platform === 'wanted') {
      return { jobs: [], error: 'wanted fixture unavailable' };
    }
    return { jobs: [matchedJob] };
  };

  let result;
  await assert.doesNotReject(async () => {
    result = await workflow.run(
      { payload: { platforms: ['wanted', 'linkedin'], searchCriteria: {}, dryRun: false } },
      step
    );
  }, 'a failed platform must not abort the remaining crawl');

  assert.equal(result.success, true);
  assert.deepEqual(
    {
      errors: result.summary.errors,
      platforms: result.summary.platforms,
    },
    {
      errors: [{ platform: 'wanted', error: 'wanted fixture unavailable' }],
      platforms: ['linkedin'],
    }
  );
  assert.deepEqual(rejectedStepNames, ['crawl-wanted']);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].source, 'linkedin');
  assert.equal(database.batchCalls, 1);
  assert.equal(stepNames.includes('save-results'), true);
  assert.equal(stepNames.includes('notify'), true);
});

test('PIN live persistence failure rejects before notification', async () => {
  const batchError = new Error('fixture D1 batch rejected');
  const { database, step, stepNames, workflow } = await createHarness({ batchError });
  workflow.crawlPlatform = async () => ({ jobs: [matchedJob] });

  await assert.rejects(
    workflow.run(
      { payload: { platforms: ['wanted'], searchCriteria: {}, dryRun: false } },
      step
    ),
    /fixture D1 batch rejected/
  );

  assert.equal(database.batchCalls, 1);
  assert.equal(stepNames.includes('save-results'), true);
  assert.equal(stepNames.includes('notify'), false);
});
