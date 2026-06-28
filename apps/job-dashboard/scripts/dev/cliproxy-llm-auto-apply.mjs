#!/usr/bin/env node
import {
  CliproxyClient,
  normalizeApiKey,
  normalizeBaseUrl,
} from '../../src/services/cliproxy-client.js';
import { runAutoApply } from '../../src/handlers/auto-apply/run-handler.js';

const DEFAULT_KEYWORD = 'security engineer';

export async function runCliproxyLlmAutoApply({
  env = process.env,
  fetcher = fetch,
  keyword = DEFAULT_KEYWORD,
  maxApplications = 3,
  dryRun = true,
} = {}) {
  const cliproxyConfig = parseCliproxyConfig(env);
  const validationError = validateCliproxyConfig(cliproxyConfig);
  if (validationError) return createConfigFailure(validationError);

  const recorded = [];
  const seen = new Set();
  const network = createNetworkTracker(fetcher, cliproxyConfig.baseUrl);
  const db = createMemoryDb(recorded, seen);
  const cliproxy = new CliproxyClient(
    {
      ...env,
      CLIPROXY_BASE: cliproxyConfig.baseUrl,
      CLIPROXY_API_KEY: cliproxyConfig.apiKey,
    },
    { fetcher: network.fetcher }
  );

  const response = await runAutoApply({
    request: createRequest({
      dryRun,
      platforms: ['cliproxy'],
      keywords: [keyword],
      maxApplications,
      runId: `cliproxy-llm-${Date.now()}`,
    }),
    env: { DB: db },
    clients: { cliproxy },
  });
  const body = JSON.parse(await response.text());
  const errorDetail = body.results?.errorDetails?.[0] || null;

  return {
    success: response.status >= 200 && response.status < 300 && body.success === true,
    status: response.status,
    error: errorDetail?.message || body.error || null,
    errorCode: body.errorCode || errorDetail?.errorCode || null,
    submitted: body.submitted || 0,
    networkWrites: network.stats.networkWrites,
    cliproxyRequests: network.stats.cliproxyRequests,
    body,
    recorded: recorded.map(toRecordedApplication),
  };
}

function parseCliproxyConfig(env) {
  return {
    baseUrl: normalizeBaseUrl(env.CLIPROXY_BASE),
    apiKey: normalizeApiKey(env.CLIPROXY_API_KEY),
  };
}

function validateCliproxyConfig(config) {
  if (!config.baseUrl || !config.apiKey) {
    return 'CLIPROXY_BASE and CLIPROXY_API_KEY are required';
  }
  return '';
}

function createConfigFailure(error) {
  return {
    success: false,
    status: 400,
    error,
    errorCode: 'CLIPROXY_CONFIG_MISSING',
    submitted: 0,
    networkWrites: 0,
    cliproxyRequests: 0,
    body: null,
    recorded: [],
  };
}

function createNetworkTracker(fetcher, cliproxyBase) {
  const normalizedBase = String(cliproxyBase || '').replace(/\/+$/, '');
  const stats = { networkWrites: 0, cliproxyRequests: 0 };
  const trackedFetcher = async (url, options = {}) => {
    const requestUrl = typeof url === 'string' ? url : url?.url || String(url);
    const method = String(options?.method || 'GET').toUpperCase();
    if (normalizedBase && requestUrl.startsWith(`${normalizedBase}/`)) {
      stats.cliproxyRequests++;
    } else if (method !== 'GET' && method !== 'HEAD') {
      stats.networkWrites++;
    }
    return fetcher(url, options);
  };
  return { fetcher: trackedFetcher, stats };
}

function createRequest(body) {
  return { json: async () => body };
}

function createMemoryDb(recorded, seen) {
  return {
    prepare(query) {
      if (query.includes('SELECT key, value FROM config')) {
        return statement(() => ({
          all: async () => ({
            results: [
              { key: 'auto_apply_enabled', value: 'true' },
              { key: 'max_daily_applications', value: '10' },
              { key: 'min_match_score', value: '1' },
              { key: 'auto_apply_keywords', value: JSON.stringify(['security', '보안']) },
            ],
          }),
        }));
      }

      if (query.includes('COUNT(*) as count')) {
        return statement(() => ({ first: async () => ({ count: 0 }) }));
      }

      if (query.includes('job_id = ? AND source = ?')) {
        return statement((jobId, source) => ({
          first: async () => (seen.has(`${source}_${jobId}`) ? { id: `${source}_${jobId}` } : null),
        }));
      }

      if (query.includes('lower(trim(company)) = lower(?)')) {
        return statement(() => ({ first: async () => null }));
      }

      if (query.includes('INSERT INTO applications')) {
        return statement((...params) => ({
          run: async () => {
            recorded.push(params);
            seen.add(params[0]);
            return { meta: { changes: 1 } };
          },
        }));
      }

      throw new Error(`Unexpected query: ${query}`);
    },
  };
}

function statement(handler) {
  return { bind: (...params) => handler(...params) };
}

function toRecordedApplication(row) {
  return {
    id: row[0],
    jobId: row[1],
    source: row[2],
    sourceUrl: row[3],
    position: row[4],
    company: row[5],
    matchScore: row[7],
    status: row[8],
    runId: row[14],
    dryRun: row[15],
    action: row[16],
    adapterBacked: row[17],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const keyword = readArg('--keyword') || DEFAULT_KEYWORD;
  const maxApplications = Number.parseInt(readArg('--max') || '3', 10);
  const result = await runCliproxyLlmAutoApply({
    keyword,
    maxApplications: Number.isInteger(maxApplications) ? maxApplications : 3,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.success ? 0 : 1;
}

function readArg(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : '';
}
