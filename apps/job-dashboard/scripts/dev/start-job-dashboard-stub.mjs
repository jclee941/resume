#!/usr/bin/env node
import http from 'node:http';
import { runAutoApply } from '../../src/handlers/auto-apply/run-handler.js';
import { getAutoApplyStatus } from '../../src/handlers/auto-apply/status-handler.js';
import { createAtsDryRunClient } from '../../src/workflows/application/platforms.js';

const args = new Set(process.argv.slice(2));

if (args.has('--serve')) {
  const port = Number(process.argv[process.argv.indexOf('--serve') + 1]);
  await startServer(port);
} else {
  console.error(
    'Usage: node apps/job-dashboard/scripts/dev/start-job-dashboard-stub.mjs --serve <port>'
  );
  process.exit(2);
}

/** @param {number} port */
async function startServer(port) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url?.startsWith('/ats/')) {
      writeJson(res, 200, atsFixture(req.url));
      return;
    }

    const statusPath = ['/job/api/auto-apply/status', '/api/auto-apply/status'].includes(
      /** @type {string} */ (req.url)
    );
    const runPath = ['/job/api/auto-apply/run', '/api/auto-apply/run'].includes(
      /** @type {string} */ (req.url)
    );

    if (req.method === 'GET' && statusPath) {
      const response = await getAutoApplyStatus(createEnv());
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(await response.text());
      return;
    }

    if (req.method !== 'POST' || !runPath) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
      return;
    }

    const payload = await readJson(req);
    const response = await runAutoApply({
      request: { json: async () => payload },
      env: createEnv(),
      clients: createClients(port),
    });
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
  });
  server.listen(port, '127.0.0.1');
}

/**
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {unknown} body
 */
function writeJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function createEnv() {
  return {
    DB: createMockDb(),
    SESSIONS: {
      async get() {
        return null;
      },
    },
  };
}

/** @param {http.IncomingMessage} req */
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

function createMockDb() {
  return {
    /** @param {string} query */
    prepare(query) {
      if (query.includes('SELECT key, value FROM config')) {
        return stmt({ all: async () => ({ results: configRows() }) });
      }
      if (query.includes('COUNT(*) as count')) return stmt({ first: async () => ({ count: 0 }) });
      if (query.includes('SELECT id FROM applications')) return stmt({ first: async () => null });
      if (query.includes('INSERT INTO applications')) return stmt({ run: async () => ({}) });
      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

/**
 * @template T
 * @param {T} result
 */
const stmt = (result) => ({ bind: () => result });
const configRows = () => [
  { key: 'auto_apply_enabled', value: 'true' },
  { key: 'max_daily_applications', value: '5' },
  { key: 'min_match_score', value: '1' },
  { key: 'auto_apply_keywords', value: JSON.stringify(['security']) },
];

/** @param {number} port */
function createClients(port) {
  const atsFetch = createAtsFetch(port);
  return {
    wanted: {
      setCookies() {},
      async searchJobs() {
        return { jobs: [] };
      },
      async apply() {
        return { success: false };
      },
    },
    greenhouse: createRequiredAtsClient('greenhouse', {
      fetch: atsFetch,
      company: 'GreenhouseStub',
      boardToken: 'greenhousestub',
    }),
    lever: createRequiredAtsClient('lever', {
      fetch: atsFetch,
      company: 'LeverStub',
      boardToken: 'leverstub',
    }),
    ashby: createRequiredAtsClient('ashby', {
      fetch: atsFetch,
      company: 'AshbyStub',
      boardToken: 'ashbystub',
      ashbyApiKey: 'stub-backend-key',
    }),
  };
}

/**
 * @param {string} platform
 * @param {import('../../src/workflows/application/ats-dry-run-client.js').AtsDryRunOptions} options
 */
function createRequiredAtsClient(platform, options) {
  const client = createAtsDryRunClient(platform, options);
  if (!client) throw new Error(`Failed to create ${platform} dry-run client`);
  return client;
}

/**
 * @param {number} port
 * @returns {import('../../src/workflows/application/ats-dry-run-client.js').FetchFunction}
 */
function createAtsFetch(port) {
  return async (url, init) => {
    const route = atsRoute(url);
    if (!route) throw new Error(`Unexpected external ATS request: ${url}`);
    return fetch(`http://127.0.0.1:${port}${route}`, init);
  };
}

/** @param {RequestInfo | URL} url */
function atsRoute(url) {
  const parsed = new URL(/** @type {string | URL} */ (url));
  return ATS_ROUTES.get(`${parsed.hostname}${parsed.pathname}`) ?? null;
}

/** @param {string} url */
function atsFixture(url) {
  return ATS_FIXTURES[url] ?? { jobs: [] };
}

const ATS_ROUTES = new Map([
  ['boards-api.greenhouse.io/v1/boards/greenhousestub/jobs', '/ats/greenhouse'],
  ['api.lever.co/v0/postings/leverstub', '/ats/lever'],
  ['api.ashbyhq.com/posting-api/job-board/ashbystub', '/ats/ashby'],
]);
/** @type {Record<string, { jobs: ReturnType<typeof greenhouseJob>[] | ReturnType<typeof ashbyJob>[] } | ReturnType<typeof leverJob>[]>} */
const ATS_FIXTURES = {
  '/ats/greenhouse': { jobs: [greenhouseJob()] },
  '/ats/lever': [leverJob()],
  '/ats/ashby': { jobs: [ashbyJob()] },
};
function greenhouseJob() {
  return {
    id: 'gh-security-seoul',
    title: 'Security Engineer',
    absolute_url: 'https://boards.greenhouse.io/adapterstub/jobs/gh-security-seoul',
    apply_url: 'https://boards.greenhouse.io/adapterstub/jobs/gh-security-seoul/apply',
    location: { name: 'Seoul, South Korea' },
  };
}
function leverJob() {
  return {
    id: 'lever-security-remote',
    text: 'Security Platform Engineer',
    hostedUrl: 'https://jobs.lever.co/adapterstub/lever-security-remote',
    applyUrl: 'https://jobs.lever.co/adapterstub/lever-security-remote/apply',
    categories: { location: 'Remote' },
  };
}
function ashbyJob() {
  return {
    id: 'ashby-security-incheon',
    title: 'Security Automation Engineer',
    jobUrl: 'https://jobs.ashbyhq.com/adapterstub/ashby-security-incheon',
    applyUrl: 'https://jobs.ashbyhq.com/adapterstub/ashby-security-incheon/application',
    locationName: 'Incheon',
  };
}
