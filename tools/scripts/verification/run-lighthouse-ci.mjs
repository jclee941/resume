#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { runLighthouseProfile } from './lighthouse-profile.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) continue;
    const [key, value] = part.replace(/^--/, '').split('=');
    args.set(key, value ?? 'true');
  }
  return args;
}

function printScore(name, value) {
  if (typeof value !== 'number') return `${name}=n/a`;
  return `${name}=${(value * 100).toFixed(0)}`;
}

function printProfile(result) {
  console.log(
    `[${result.profileName}] runs=${result.runs} ${printScore('perf', result.scores.performance)} ${printScore('a11y', result.scores.accessibility)} ${printScore('bp', result.scores.bestPractices)} ${printScore('seo', result.scores.seo)}`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const configRelPath = args.get('config') ?? 'tools/lighthouserc.json';
  const configPath = path.resolve(process.cwd(), configRelPath);
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  const assertions = config?.ci?.assert?.assertions;
  if (!assertions || typeof assertions !== 'object') {
    throw new Error('Invalid lighthouserc: ci.assert.assertions is required');
  }

  const profiles = [
    ['desktop', config?.ci?.collect],
    ['mobile', config?.ci?.collectMobile],
  ].filter(([, collect]) => Boolean(collect));

  if (!profiles.length) {
    throw new Error('Invalid lighthouserc: no ci.collect or ci.collectMobile profile found');
  }

  const allFailures = [];
  const allWarnings = [];
  for (const [profileName, collectConfig] of profiles) {
    const result = await runLighthouseProfile(profileName, collectConfig, assertions);
    printProfile(result);
    allFailures.push(...result.failures);
    allWarnings.push(...result.warnings);
  }

  if (allWarnings.length) {
    console.log('\nWarnings:');
    for (const warning of allWarnings) console.log(`- ${warning}`);
  }

  if (allFailures.length) {
    console.error('\nLighthouse assertion failures:');
    for (const failure of allFailures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('\nLighthouse checks passed');
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
