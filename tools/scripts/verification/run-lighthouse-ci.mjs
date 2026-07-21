#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function parseArgs(argv) {
  const args = new Map();
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) continue;
    const [key, value] = part.replace(/^--/, '').split('=');
    args.set(key, value ?? 'true');
  }
  return args;
}

function normalizeAssertion(rawAssertion) {
  if (Array.isArray(rawAssertion)) {
    return {
      level: String(rawAssertion[0] ?? 'warn').toLowerCase(),
      options: rawAssertion[1] ?? {},
    };
  }
  return {
    level: String(rawAssertion ?? 'warn').toLowerCase(),
    options: {},
  };
}

function getResourceSummaryValue(lhr, key) {
  const [, type, metric] = key.split(':');
  if (metric !== 'size') return null;

  const summary = lhr.audits?.['resource-summary'];
  const items = summary?.details?.items;
  if (!Array.isArray(items)) return null;

  const target = items.find((item) => item.resourceType === type);
  return typeof target?.transferSize === 'number' ? target.transferSize : null;
}

function getAssertionValue(lhr, key, options) {
  if (key.startsWith('categories:')) {
    const category = key.split(':')[1];
    const score = lhr.categories?.[category]?.score;
    return typeof score === 'number' ? score : null;
  }

  if (key.startsWith('resource-summary:')) {
    return getResourceSummaryValue(lhr, key);
  }

  const audit = lhr.audits?.[key];
  if (!audit) return null;

  if (typeof options.maxNumericValue === 'number' || typeof options.minNumericValue === 'number') {
    return typeof audit.numericValue === 'number' ? audit.numericValue : null;
  }

  return typeof audit.score === 'number' ? audit.score : null;
}

function evaluateAssertion(key, assertion, value, profileName) {
  const failures = [];
  const warnings = [];

  if (value === null) {
    const msg = `[${profileName}] ${key}: metric not available in current Lighthouse version`;
    warnings.push(msg);
    return { failures, warnings };
  }

  const opts = assertion.options;
  if (typeof opts.minScore === 'number' && value < opts.minScore) {
    failures.push(`[${profileName}] ${key}: ${value.toFixed(3)} < minScore ${opts.minScore}`);
  }

  if (typeof opts.maxNumericValue === 'number' && value > opts.maxNumericValue) {
    failures.push(
      `[${profileName}] ${key}: ${value.toFixed(2)} > maxNumericValue ${opts.maxNumericValue}`
    );
  }

  if (opts.minScore === undefined && opts.maxNumericValue === undefined) {
    if (assertion.level === 'error' && value < 1) {
      failures.push(`[${profileName}] ${key}: score ${value.toFixed(3)} < 1`);
    }
    if (assertion.level === 'warn' && value < 1) {
      warnings.push(`[${profileName}] ${key}: score ${value.toFixed(3)} < 1`);
    }
  }

  return { failures, warnings };
}

async function runProfile(profileName, collectConfig, assertions) {
  const urls = collectConfig?.url ?? [];
  const runs = Number(collectConfig?.numberOfRuns ?? 1);
  const settings = collectConfig?.settings ?? {};

  if (!urls.length) {
    throw new Error(`Profile ${profileName} has no URL configured`);
  }

  const results = [];
  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    for (const url of urls) {
      for (let i = 0; i < runs; i += 1) {
        const runnerResult = await lighthouse(
          url,
          {
            port: chrome.port,
            logLevel: 'error',
            output: 'json',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
            preset: settings.preset,
            throttling: settings.throttling,
            screenEmulation: settings.screenEmulation,
            formFactor: settings.screenEmulation?.mobile ? 'mobile' : 'desktop',
          },
          undefined
        );

        if (!runnerResult?.lhr) {
          throw new Error(`Lighthouse returned no report for ${url}`);
        }

        results.push(runnerResult.lhr);
      }
    }
  } finally {
    await chrome.kill();
  }

  const failures = [];
  const warnings = [];
  const valuesByAssertion = new Map();

  for (const [key, rawAssertion] of Object.entries(assertions)) {
    const assertion = normalizeAssertion(rawAssertion);
    if (assertion.level !== 'error' && assertion.level !== 'warn') continue;

    const values = [];
    for (const lhr of results) {
      const value = getAssertionValue(lhr, key, assertion.options);
      if (value !== null) values.push(value);
    }
    valuesByAssertion.set(key, values);

    const value = median(values);
    const outcome = evaluateAssertion(key, assertion, value, profileName);
    failures.push(...outcome.failures);
    warnings.push(...outcome.warnings);
  }

  const representative = results[0];
  const scores = {
    performance: representative.categories?.performance?.score ?? null,
    accessibility: representative.categories?.accessibility?.score ?? null,
    bestPractices: representative.categories?.['best-practices']?.score ?? null,
    seo: representative.categories?.seo?.score ?? null,
  };

  return {
    profileName,
    urls,
    runs: results.length,
    failures,
    warnings,
    scores,
  };
}

function printScore(name, value) {
  if (typeof value !== 'number') return `${name}=n/a`;
  return `${name}=${(value * 100).toFixed(0)}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const configRelPath = args.get('config') ?? 'tools/lighthouserc.json';
  const configPath = path.resolve(process.cwd(), configRelPath);
  const raw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(raw);

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
    const result = await runProfile(profileName, collectConfig, assertions);
    console.log(
      `[${result.profileName}] runs=${result.runs} ${printScore('perf', result.scores.performance)} ${printScore('a11y', result.scores.accessibility)} ${printScore('bp', result.scores.bestPractices)} ${printScore('seo', result.scores.seo)}`
    );
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
