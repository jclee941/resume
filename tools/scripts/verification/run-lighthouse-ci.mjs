#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';
import {
  assertLhrIdentity,
  assertReportInventory,
  expectedReportFiles,
  installSignalHandlers,
  prepareOutputDir,
  profileAuditSettings,
  summarizeProfile,
  validateAuditUrls,
  withTimeout,
  writeReportPair,
} from './lighthouse-contract.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (const part of argv.slice(2)) {
    if (!part.startsWith('--')) continue;
    const [key, value] = part.replace(/^--/, '').split('=');
    args.set(key, value ?? 'true');
  }
  return args;
}

function profileConfig(name, collect, args, allowRemote) {
  const urlOverride = args.get('url');
  const runsOverride = args.get('runs');
  return {
    name,
    urls: validateAuditUrls(urlOverride ? [urlOverride] : (collect?.url ?? []), allowRemote),
    runs: runsOverride ? Number(runsOverride) : Number(collect?.numberOfRuns ?? 1),
    settings: collect?.settings ?? {},
  };
}

async function runProfile(profile, assertions, outputDir, chromePath, timeouts) {
  if (profile.urls.length !== 1)
    throw new Error(`Profile ${profile.name} requires exactly one URL`);
  if (!Number.isInteger(profile.runs) || profile.runs < 1) {
    throw new Error(`Profile ${profile.name} has invalid numberOfRuns`);
  }
  const launchOptions = {
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage'],
    ...(chromePath ? { chromePath } : {}),
  };
  const chrome = await withTimeout(
    launchChrome(launchOptions),
    timeouts.run,
    `${profile.name} Chrome launch`
  );
  let closePromise;
  const closeChrome = () => {
    closePromise ??= withTimeout(chrome.kill(), timeouts.kill, `${profile.name} Chrome shutdown`);
    return closePromise;
  };
  const controller = new AbortController();
  const lifecycle = installSignalHandlers(process, controller, closeChrome);
  void lifecycle.done.catch(() => {});
  const lhrs = [];
  try {
    for (const url of profile.urls) {
      for (let index = 0; index < profile.runs; index += 1) {
        controller.signal.throwIfAborted();
        const result = await withTimeout(
          lighthouse(
            url,
            {
              port: chrome.port,
              logLevel: 'error',
              output: ['json', 'html'],
              onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
              ...profileAuditSettings(profile.name, profile.settings),
            },
            undefined
          ),
          timeouts.run,
          `${profile.name} run ${index + 1}`
        );
        if (!result?.lhr) throw new Error(`Lighthouse returned no LHR for ${url}`);
        assertLhrIdentity(profile.name, result.lhr);
        await writeReportPair(outputDir, profile.name, index, result.report);
        lhrs.push(result.lhr);
      }
    }
  } finally {
    lifecycle.dispose();
    await closeChrome();
  }
  return {
    ...summarizeProfile(profile.name, lhrs, assertions),
    urls: profile.urls,
    reportFiles: expectedReportFiles([profile.name], profile.runs),
  };
}

function printProfile(result) {
  const score = (key) => {
    const value = result.medians[`categories:${key}`];
    return typeof value === 'number' ? (value * 100).toFixed(0) : 'n/a';
  };
  console.log(
    `[${result.profileName}] runs=${result.runs} median perf=${score('performance')} a11y=${score('accessibility')} bp=${score('best-practices')} seo=${score('seo')} outliers=${result.runOutliers.length}`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const allowRemote = args.get('allow-remote') === 'true';
  const configPath = path.resolve(args.get('config') ?? 'tools/lighthouserc.json');
  const outputDir = path.resolve(
    args.get('output-dir') ?? process.env.LIGHTHOUSE_OUTPUT_DIR ?? '.lighthouseci/portfolio-rebrand'
  );
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const assertions = config?.ci?.assert?.assertions;
  if (!assertions || typeof assertions !== 'object') {
    throw new Error('Invalid lighthouserc: ci.assert.assertions is required');
  }
  const profiles = [
    profileConfig('desktop', config?.ci?.collect, args, allowRemote),
    profileConfig('mobile', config?.ci?.collectMobile, args, allowRemote),
  ].filter((profile) => profile.urls.length > 0);
  if (profiles.length !== 2) throw new Error('Desktop and mobile Lighthouse profiles are required');
  const reportFiles = profiles.flatMap((profile) =>
    expectedReportFiles([profile.name], profile.runs)
  );
  const timeouts = {
    run: Number(args.get('run-timeout-ms') ?? 120_000),
    kill: Number(args.get('kill-timeout-ms') ?? 15_000),
  };
  await prepareOutputDir(outputDir);
  const results = [];
  for (const profile of profiles) {
    const result = await runProfile(
      profile,
      assertions,
      outputDir,
      args.get('chrome-path') ?? process.env.CHROME_PATH,
      timeouts
    );
    results.push(result);
    printProfile(result);
  }
  const failures = results.flatMap((result) => result.failures);
  const warnings = results.flatMap((result) => result.warnings);
  const outliers = results.flatMap((result) =>
    result.runOutliers.map((outlier) => ({ profileName: result.profileName, ...outlier }))
  );
  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    config: path.relative(process.cwd(), configPath),
    reports: reportFiles,
    profiles: results,
    failures,
    warnings,
    outliers,
  };
  await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  await assertReportInventory(outputDir, [...reportFiles, 'summary.json']);
  if (warnings.length > 0) console.log(`Lighthouse warnings: ${warnings.length}`);
  if (outliers.length > 0) {
    console.log(`Lighthouse per-run outliers retained for investigation: ${outliers.length}`);
  }
  if (failures.length > 0) {
    for (const failure of failures) console.error(`- ${failure}`);
    throw new Error(`Lighthouse failed with ${failures.length} assertion failure(s)`);
  }
  console.log(
    `Lighthouse median policy passed; retained ${reportFiles.length} reports in ${outputDir}`
  );
}

main().catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exit(1);
});
