#!/usr/bin/env node
import net from 'node:net';
import { spawn } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const platforms = ['greenhouse', 'lever', 'ashby'];
const keyword = 'security';

if (!args.has('--ats-stub')) {
  console.error('Usage: npm run foreign-apply:dry-run -- --ats-stub');
  console.error('Refusing to run foreign ATS walkthrough without the local ATS stub.');
  process.exit(2);
}

const port = await reservePort();
const child = spawn(
  process.execPath,
  ['apps/job-dashboard/scripts/dev/start-job-dashboard-stub.mjs', '--serve', port],
  {
    stdio: 'ignore',
  }
);

try {
  await waitForPort(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const run = await postJson(`${baseUrl}/job/api/auto-apply/run`, {
    dryRun: true,
    atsStub: true,
    platforms,
    keywords: [keyword],
    maxApplications: platforms.length,
  });
  const status = await getJson(`${baseUrl}/job/api/auto-apply/status`);
  const summary = validateWalkthrough(run, status);

  console.log('Foreign ATS dry-run walkthrough');
  console.log(`stub=${baseUrl}`);
  console.log(`search platforms=${summary.platforms.join(',')} searched=${summary.searched}`);
  console.log(`score matched=${summary.matched} scores=${summary.scores.join(',')}`);
  console.log(
    `preview jobs=${summary.previewed} adapterBacked=${summary.adapterBacked} submitted=${summary.submitted} actions=${summary.actions.join(',')} networkWrites=0`
  );
  console.log(`sourceUrls=${summary.sourceUrls.join(',')}`);
  console.log(
    `pending approval/status candidates=${summary.pendingCandidates} statusPending=${summary.statusPending}`
  );
  console.log(`submissions submitted=${summary.submitted}`);
  console.log('T17-PASS submitted=0');
} finally {
  child.kill('SIGTERM');
  await waitForExit(child);
  console.log(`cleanup stopped local stub pid=${child.pid}`);
}

function validateWalkthrough(run, status) {
  const data = run?.data ?? run;
  const statusData = status?.data ?? status;
  const jobs = data?.results?.jobs ?? [];
  const actions = [...new Set(jobs.map((job) => job.action))];
  const scores = jobs.map((job) => job.matchScore);

  assert(data?.success === true, 'dry-run response must succeed');
  assert(data?.dryRun === true, 'dryRun must remain true');
  assert(data?.submitted === 0, 'submitted must be zero');
  assert(
    platforms.every((platform) => data.platforms?.includes(platform)),
    'all ATS platforms required'
  );
  assert(data?.results?.searched >= platforms.length, 'search must include ATS stub jobs');
  assert(data?.results?.matched >= platforms.length, 'score step must match ATS stub jobs');
  assert(jobs.length >= platforms.length, 'preview jobs must be present');
  assert(
    jobs.every((job) => job.adapterBacked === true),
    'ATS previews must come from adapter-backed discovery'
  );
  assert(
    jobs.every((job) => !JSON.stringify(job).includes('example.invalid')),
    'ATS previews must not contain fabricated example.invalid URLs'
  );
  assert(actions.length === 1 && actions[0] === 'would_apply', 'only dry-run previews are allowed');
  assert(statusData?.dryRun?.enabledByDefault === true, 'status must report dry-run default');
  assert(
    platforms.every((platform) => statusData?.platforms?.[platform]?.submissions === 'disabled'),
    'ATS submissions must stay disabled'
  );

  return {
    platforms: data.platforms,
    searched: data.results.searched,
    matched: data.results.matched,
    scores,
    previewed: jobs.length,
    adapterBacked: jobs.filter((job) => job.adapterBacked === true).length,
    sourceUrls: jobs.map((job) => job.sourceUrl),
    actions,
    pendingCandidates: jobs.filter((job) => job.action === 'would_apply').length,
    statusPending: statusData.pendingApprovals ?? 0,
    submitted: data.submitted,
  };
}

function postJson(url, body) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getJson(url) {
  return fetchJson(url, { method: 'GET' });
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForPort(port) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await canConnect(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Local dashboard stub did not listen on ${port}`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => socket.end(() => resolve(true)));
    socket.once('error', () => resolve(false));
  });
}

function waitForExit(childProcess) {
  return new Promise((resolve) => {
    childProcess.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
}
