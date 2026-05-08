#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { analyzeJobKoreaHar } from './har-analyze.js';
import { assertNoSensitiveHarContent, sanitizeHar } from './har-sanitize.js';

const VALID_COMMANDS = new Set(['sanitize', 'analyze']);

export function parseHarToolsCliArgs(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (!VALID_COMMANDS.has(command)) {
    throw new Error('Usage: har-tools-cli.js <sanitize|analyze> --input <har> [--output <json>]');
  }

  const options = { command, input: undefined, output: undefined };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg !== '--input' && arg !== '--output') {
      throw new Error(`Unknown flag: ${arg}`);
    }
    const value = rest[++i];
    if (!value || value.startsWith('--')) {
      throw new Error(`${arg} requires a path`);
    }
    options[arg === '--input' ? 'input' : 'output'] = value;
  }

  if (!options.input) throw new Error('--input is required');
  if (command === 'sanitize' && !options.output) throw new Error('sanitize requires --output');
  if (command === 'analyze' && options.output) throw new Error('analyze writes to stdout; omit --output');

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseHarToolsCliArgs(argv);
  const input = readJson(options.input);

  if (options.command === 'sanitize') {
    const sanitized = sanitizeHar(input);
    const text = JSON.stringify(sanitized, null, 2);
    assertNoSensitiveHarContent(text);
    fs.writeFileSync(options.output, `${text}\n`, { mode: 0o600 });
    return;
  }

  console.log(JSON.stringify(analyzeJobKoreaHar(input), null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
