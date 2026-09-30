#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { guard } from './guard.mjs';
import { REPO_ROOT, buildManifest, loadPack } from './pack.mjs';
import { pull } from './pull.mjs';
import { push, status } from './sync.mjs';

const USAGE = `usage: cli.mjs <command> [options]
  pull [--source d1|fixtures]    materialize the pack (default: CONTENT_SOURCE, else d1)
  push [--dry-run] [--prune]     upload new/changed pack files to D1
  status                         compare local pack files with D1
  manifest [--out file]          print the local pack file count; write path/sha256/size JSON
  guard [--staged|--tracked] [--report]  fail on pack paths or personal tokens in git`;

const OPTIONS = {
  source: { type: 'string' },
  'dry-run': { type: 'boolean' },
  prune: { type: 'boolean' },
  out: { type: 'string' },
  staged: { type: 'boolean' },
  tracked: { type: 'boolean' },
  report: { type: 'boolean' },
};

/**
 * Run one CLI command and return its exit code.
 * @param {string[]} argv
 * @param {{ root?: string, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch, out?: (line: string) => void }} [context]
 * @returns {Promise<number>}
 */
export async function run(
  argv,
  { root = REPO_ROOT, env = process.env, fetchImpl, out = console.log } = {}
) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (error) {
    console.error(`content: ${error.message}\n${USAGE}`);
    return 2;
  }
  const [command] = parsed.positionals;
  const flags = parsed.values;
  const shared = { root, env, fetchImpl, out };
  try {
    switch (command) {
      case 'pull':
        await pull({ ...shared, source: flags.source });
        return 0;
      case 'push':
        await push({ ...shared, dryRun: flags['dry-run'], prune: flags.prune });
        return 0;
      case 'status':
        await status(shared);
        return 0;
      case 'manifest': {
        const files = await buildManifest(await loadPack(), root);
        if (flags.out) {
          await fs.mkdir(path.dirname(path.resolve(flags.out)), { recursive: true });
          await fs.writeFile(
            path.resolve(flags.out),
            `${JSON.stringify({ version: 1, files }, null, 2)}\n`
          );
        }
        const bytes = files.reduce((sum, file) => sum + file.size, 0);
        out(`pack files: ${files.length} (${bytes} bytes)`);
        return 0;
      }
      case 'guard': {
        if (flags.staged && flags.tracked) throw new Error('choose one of --staged or --tracked');
        const mode = flags.tracked ? 'tracked' : 'staged';
        const hits = await guard({ root, mode, report: flags.report, out });
        return hits.size > 0 ? 1 : 0;
      }
      default:
        console.error(USAGE);
        return 2;
    }
  } catch (error) {
    console.error(`content: ${error instanceof Error ? error.message : 'unknown error'}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
