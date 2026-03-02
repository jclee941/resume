import { API_CONTRACTS } from '../src/shared/contracts/index.js';

const FASTIFY_URL = process.env.FASTIFY_URL || 'http://localhost:3000';
const WORKER_URL = process.env.WORKER_URL || 'https://resume.jclee.me/job';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function fetchEndpoint(baseUrl, contract, options = {}) {
  const url = new URL(contract.path, baseUrl);
  const headers = {
    'Content-Type': 'application/json',
  };

  if (contract.auth && ADMIN_TOKEN) {
    headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  }

  const response = await fetch(url.toString(), {
    method: contract.method,
    headers,
    ...options,
  });

  return {
    status: response.status,
    data: await response.json().catch(() => null),
  };
}

async function compareEndpoints(contractName, contract) {
  const results = {
    contract: contractName,
    path: contract.path,
    fastify: null,
    worker: null,
    match: false,
    errors: [],
  };

  try {
    results.fastify = await fetchEndpoint(FASTIFY_URL, contract);
  } catch (e) {
    results.errors.push(`Fastify error: ${e.message}`);
  }

  try {
    results.worker = await fetchEndpoint(WORKER_URL, contract);
  } catch (e) {
    results.errors.push(`Worker error: ${e.message}`);
  }

  if (results.fastify && results.worker) {
    results.match =
      results.fastify.status === results.worker.status &&
      JSON.stringify(Object.keys(results.fastify.data || {}).sort()) ===
        JSON.stringify(Object.keys(results.worker.data || {}).sort());
  }

  return results;
}

export async function runDriftTest() {
  const testContracts = [
    { name: 'health', contract: API_CONTRACTS.health },
    { name: 'stats', contract: API_CONTRACTS.stats },
    { name: 'auth.status', contract: API_CONTRACTS.auth.status },
    { name: 'applications.list', contract: API_CONTRACTS.applications.list },
  ];

  const results = [];

  for (const { name, contract } of testContracts) {
    const result = await compareEndpoints(name, contract);
    results.push(result);

    const status = result.match ? '✓' : '✗';
    console.log(`${status} ${name}: ${result.path}`);

    if (!result.match && result.errors.length === 0) {
      console.log(`  Fastify: ${result.fastify?.status}`);
      console.log(`  Worker: ${result.worker?.status}`);
    }

    for (const error of result.errors) {
      console.log(`  Error: ${error}`);
    }
  }

  const passed = results.filter((r) => r.match).length;
  const total = results.length;

  console.log(`\nDrift Test: ${passed}/${total} endpoints match`);

  return {
    passed,
    total,
    results,
    success: passed === total,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDriftTest().then((r) => process.exit(r.success ? 0 : 1));
}
