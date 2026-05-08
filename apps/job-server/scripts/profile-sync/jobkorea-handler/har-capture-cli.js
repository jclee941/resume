#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { captureJobKoreaProfileSyncHar } from './har-capture.js';
import { loadSSOT } from '../ssot-loader.js';
import JobKoreaHandler from '../jobkorea-handler.js';

const VALID_FLAGS = new Set([
  '--output',
  '--apply',
  '--dry-run',
  '--include-save',
  '--include-portfolio',
]);

export function parseHarCaptureCliArgs(argv = process.argv.slice(2)) {
  const options = {
    output: undefined,
    apply: false,
    dryRun: false,
    includeSave: false,
    includePortfolio: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!VALID_FLAGS.has(arg)) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    if (arg === '--output') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) {
        throw new Error('--output requires a path');
      }
      options.output = value;
      continue;
    }

    if (arg === '--apply') options.apply = true;
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--include-save') options.includeSave = true;
    if (arg === '--include-portfolio') options.includePortfolio = true;
  }

  if (options.apply && options.dryRun) {
    throw new Error('--apply and --dry-run are mutually exclusive');
  }

  if (options.includeSave && !options.apply) {
    throw new Error('--include-save requires --apply');
  }

  return options;
}

function toPrintableSummary(result) {
  return {
    success: result.success,
    harPath: result.harPath,
    editUrl: result.editUrl,
    capturedAt: result.capturedAt,
    requestSummary: result.requestSummary.map((request) => ({
      method: request.method,
      origin: request.origin,
      path: request.path,
      resourceType: request.resourceType,
    })),
    error: result.error,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const cliOptions = parseHarCaptureCliArgs(argv);
  const ssot = loadSSOT();
  const handler = new JobKoreaHandler();
  const result = await captureJobKoreaProfileSyncHar(handler, ssot, {
    output: cliOptions.output,
    apply: cliOptions.apply && !cliOptions.dryRun,
    includeSave: cliOptions.includeSave,
    includePortfolio: cliOptions.includePortfolio,
  });

  console.log(JSON.stringify(toPrintableSummary(result), null, 2));
  process.exitCode = result.success ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
