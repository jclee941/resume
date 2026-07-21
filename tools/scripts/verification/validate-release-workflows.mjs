import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { reproductionContract } from './release-workflow-reproduction-contract.mjs';
import {
  directMutationCommands,
  hasDecisionArtifact,
  hasDirectReleaseWriter,
  publishBoundarySteps,
  shellCommands,
  workflowSteps,
} from './release-workflow-structure.mjs';

function parseWorkflow(file) {
  const source = readFileSync(file, 'utf8');
  try {
    const definition = YAML.parse(source);
    if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
      throw new Error('workflow root must be a mapping');
    }
    return { source, definition };
  } catch (error) {
    throw new Error(`${path.basename(file)}: invalid YAML`, { cause: error });
  }
}

function isPublisher(workflow) {
  const permissions = workflow.definition.permissions ?? {};
  return (
    permissions.contents === 'write' &&
    (publishBoundarySteps(workflow.definition).length > 0 ||
      hasDirectReleaseWriter(workflow.definition))
  );
}

function requireCondition(condition, message, failures) {
  if (!condition) failures.push(message);
}

function validateTrigger(definition, source, failures) {
  requireCondition(
    definition.on?.workflow_run?.workflows?.length === 1 &&
      definition.on.workflow_run.workflows[0] === 'CI' &&
      definition.on.workflow_run.types?.includes('completed'),
    'publisher must use completed CI workflow_run',
    failures
  );
  requireCondition(
    definition.on?.workflow_dispatch?.inputs?.target_sha?.required === true,
    'manual dispatch must require target_sha',
    failures
  );
  const jobCondition = definition.jobs?.prepare?.if ?? '';
  requireCondition(
    jobCondition.includes("workflow_run.conclusion == 'success'") &&
      jobCondition.includes("workflow_run.head_branch == 'master'") &&
      jobCondition.includes('head_repository.full_name == github.repository'),
    'publisher must require a successful trusted workflow_run',
    failures
  );
  requireCondition(
    source.includes('workflow_run.head_sha') && source.includes('^[0-9a-f]{40}$'),
    'target must be the immutable workflow_run SHA or strict manual SHA',
    failures
  );
  const policyCommands = workflowSteps(definition)
    .flatMap(shellCommands)
    .filter((command) => command.startsWith('go -C tools/scripts run ./release/next-version'));
  requireCondition(
    policyCommands.length === 1 &&
      policyCommands[0].includes('--output ../../release-decision.json'),
    'publisher must invoke the tested next-version boundary from its Go module',
    failures
  );
}

function validateStructure(definition, failures) {
  requireCondition(
    definition.concurrency?.group === 'release-production' &&
      definition.concurrency?.['cancel-in-progress'] === false,
    'publisher must use serialized release-production concurrency',
    failures
  );
  const checkoutSteps = workflowSteps(definition).filter(
    (step) => typeof step.uses === 'string' && step.uses.startsWith('actions/checkout@')
  );
  requireCondition(
    checkoutSteps.length === 3 &&
      checkoutSteps.every((step) => step.with?.ref === '${{ env.TARGET_SHA }}'),
    'every checkout must use the immutable target SHA',
    failures
  );
  const publishNeeds = definition.jobs?.publish?.needs;
  requireCondition(
    Array.isArray(publishNeeds) &&
      publishNeeds.includes('prepare') &&
      publishNeeds.includes('verify'),
    'publish must have a verification dependency',
    failures
  );
  requireCondition(
    hasDecisionArtifact(definition),
    'publish/no-release/superseded decision artifact is required',
    failures
  );
}

function validatePublishBoundary(definition, failures) {
  const boundarySteps = publishBoundarySteps(definition);
  requireCondition(
    boundarySteps.length === 1,
    'publisher must invoke the exact tested publish boundary once',
    failures
  );
  if (boundarySteps.length !== 1) return;
  const commands = shellCommands(boundarySteps[0]);
  const boundary = commands.find((command) => command.startsWith('go -C tools/scripts run')) ?? '';
  requireCondition(
    commands[0] === 'set -euo pipefail',
    'tested publish boundary step must fail closed',
    failures
  );
  for (const [token, message] of [
    ['--target "$TARGET_SHA"', 'boundary must receive the immutable target SHA'],
    ['--tag "$TAG"', 'boundary must receive the decided tag'],
    [
      '--asset "../../dist/resume-source-${TAG}.tar.gz"',
      'boundary must receive the verified asset',
    ],
    ['--manifest ../../dist/release-manifest.json', 'boundary must receive the verified manifest'],
    ['--notes ../../dist/release-notes.md', 'boundary must receive immutable-range notes'],
    ['--run-marker "release-run:${GITHUB_RUN_ID}"', 'boundary must receive run ownership'],
  ]) {
    requireCondition(boundary.includes(token), message, failures);
  }
  const directMutations = directMutationCommands(definition);
  requireCondition(
    directMutations.length === 0,
    'workflow must not bypass the tested publish boundary',
    failures
  );
}

function validateReproduction(source, failures) {
  for (const [token, message] of reproductionContract) {
    requireCondition(source.includes(token), message, failures);
  }
}

export function validateReleaseWorkflows(repositoryRoot) {
  const workflowsRoot = path.join(repositoryRoot, '.github/workflows');
  const workflows = readdirSync(workflowsRoot)
    .filter((name) => /\.ya?ml$/u.test(name))
    .map((name) => ({ name, ...parseWorkflow(path.join(workflowsRoot, name)) }));
  const publishers = workflows.filter(isPublisher);
  const failures = [];
  requireCondition(
    publishers.length === 1,
    `exactly one release publisher is required; found ${publishers.length}`,
    failures
  );
  const directWriters = workflows.filter((workflow) => hasDirectReleaseWriter(workflow.definition));
  requireCondition(
    directWriters.length === 0,
    `direct tag or release writer is forbidden: ${directWriters.map((workflow) => workflow.name).join(', ')}`,
    failures
  );
  const tagTriggered = workflows.filter(
    (workflow) => workflow.definition.on?.push?.tags?.length > 0
  );
  requireCondition(
    tagTriggered.length === 0,
    'tag-triggered release notes workflows are forbidden',
    failures
  );
  const publisher = workflows.find((workflow) => workflow.name === 'release.yml');
  requireCondition(Boolean(publisher), 'release.yml must exist', failures);
  if (publisher) {
    requireCondition(
      publisher.name === 'release.yml',
      'release.yml must be the sole publisher',
      failures
    );
    validateTrigger(publisher.definition, publisher.source, failures);
    validateStructure(publisher.definition, failures);
    validatePublishBoundary(publisher.definition, failures);
    validateReproduction(publisher.source, failures);
  }
  if (failures.length > 0) throw new Error(failures.join('\n'));
  return { publisher: publisher.name, workflowCount: workflows.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  process.stdout.write(`${JSON.stringify(validateReleaseWorkflows(repositoryRoot), null, 2)}\n`);
}
