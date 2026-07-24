import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const REQUIRED_JOBS = ['architecture-hardening', 'wrangler-dry-run', 'merged-worker-e2e'];

function loadWorkflow(repositoryRoot, name) {
  const file = path.join(repositoryRoot, '.github/workflows', name);
  try {
    return { source: readFileSync(file, 'utf8'), definition: parse(readFileSync(file, 'utf8')) };
  } catch (error) {
    throw new Error(`${name} YAML is invalid: ${error.message}`, { cause: error });
  }
}

function requireContract(condition, message) {
  if (!condition) throw new Error(message);
}

function jobCommands(job) {
  return (job?.steps ?? [])
    .map((step) => step.run)
    .filter((run) => typeof run === 'string')
    .join('\n');
}

function validateCI(ci) {
  const jobs = ci.definition.jobs ?? {};
  for (const job of REQUIRED_JOBS) {
    requireContract(jobs[job], `${job} job is required`);
  }

  const architecture = jobCommands(jobs['architecture-hardening']);
  requireContract(
    architecture.includes('npm run verify:architecture-hardening:core'),
    'architecture-hardening must invoke verify:architecture-hardening:core'
  );

  const wrangler = jobCommands(jobs['wrangler-dry-run']);
  requireContract(
    wrangler.includes('wrangler deploy --config wrangler.jsonc --dry-run') &&
      wrangler.includes('wrangler deploy --config wrangler.jsonc --env preview --dry-run') &&
      wrangler.includes('npm run verify:worker-config'),
    'wrangler-dry-run must validate parsed inventories and dry-run root production and preview configs'
  );

  const mergedWorker = jobCommands(jobs['merged-worker-e2e']);
  requireContract(
    mergedWorker.includes('CI=1 RUN_EXTERNAL_E2E=1') &&
      mergedWorker.includes('tests/e2e/merged-worker-contract.spec.js') &&
      !mergedWorker.includes('SKIP_WEBSERVER'),
    'merged-worker-e2e must exercise the root Wrangler server without SKIP_WEBSERVER'
  );

  const summary = jobs.summary ?? {};
  const needs = Array.isArray(summary.needs) ? summary.needs : [summary.needs].filter(Boolean);
  const summaryCommands = jobCommands(summary);
  for (const job of REQUIRED_JOBS) {
    requireContract(needs.includes(job), `${job} must be a summary dependency`);
    requireContract(
      summaryCommands.includes(`needs.${job}.result`) &&
        summaryCommands.includes(`"\${{ needs.${job}.result }}" != "success"`),
      `${job} failure and cancellation must fail the summary`
    );
  }
  requireContract(
    !ci.source.includes('/check-runs'),
    'synthetic provider check creation is forbidden'
  );
}

function validatePostDeploy(workflow) {
  const trigger = workflow.definition.on ?? {};
  requireContract(
    trigger.push && !Object.hasOwn(trigger.push, 'paths'),
    'push path filter is forbidden'
  );
  requireContract(
    workflow.definition.concurrency?.['cancel-in-progress'] === false,
    'post-deploy runs must be serialized without cancellation'
  );
  const expectedInput = trigger.workflow_dispatch?.inputs?.expected_sha;
  requireContract(
    expectedInput?.required === true && expectedInput?.type === 'string',
    'workflow_dispatch expected_sha must be a required string'
  );
  requireContract(
    workflow.source.includes("github.event_name == 'schedule'") &&
      workflow.source.includes('[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]]'),
    'schedule baseline must require a full 40-character SHA'
  );
  requireContract(
    workflow.source.includes('github.sha') && workflow.source.includes('refs/heads/master'),
    'push verification must use immutable github.sha and query refs/heads/master'
  );
  requireContract(
    workflow.source.includes('superseded=true') &&
      workflow.source.includes("if: steps.final.outputs.superseded != 'true'") &&
      !/name: (?:Ensure issue labels exist|Create failure issue|Close stale verification issues)[\s\S]*?if: (?!steps\.final\.outputs\.superseded != 'true')/u.test(
        workflow.source
      ),
    'superseded runs must emit a receipt and skip exact-SHA and issue mutation'
  );
  requireContract(
    !/\bsleep\s+180\b/u.test(workflow.source) &&
      !/prefix match|fallback freshness|COMMIT_TS/u.test(workflow.source) &&
      !workflow.source.includes('/check-runs'),
    'fixed waits, prefix/freshness fallbacks, and synthetic checks are forbidden'
  );
}

export function validateCIWorkflows(repositoryRoot = process.cwd()) {
  const ci = loadWorkflow(repositoryRoot, 'ci.yml');
  const postDeploy = loadWorkflow(repositoryRoot, 'post-deploy-verify.yml');
  validateCI(ci);
  validatePostDeploy(postDeploy);
  return { jobs: [...REQUIRED_JOBS] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateCIWorkflows();
  console.log(`CI workflow validation passed: ${result.jobs.join(', ')}`);
}
