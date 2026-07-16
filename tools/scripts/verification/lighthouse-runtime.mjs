import fs from 'node:fs/promises';
import path from 'node:path';

const USER_AGENTS = {
  desktop:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  mobile:
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
};

export function profileAuditSettings(profileName, settings) {
  if (!USER_AGENTS[profileName]) throw new Error(`Unknown Lighthouse profile: ${profileName}`);
  return {
    ...settings,
    formFactor: profileName,
    emulatedUserAgent: USER_AGENTS[profileName],
    screenEmulation: { ...settings.screenEmulation, mobile: profileName === 'mobile' },
  };
}

export function assertLhrIdentity(profileName, lhr) {
  const settings = lhr?.configSettings;
  const mobile = profileName === 'mobile';
  if (
    settings?.formFactor !== profileName ||
    settings?.screenEmulation?.mobile !== mobile ||
    settings?.emulatedUserAgent !== USER_AGENTS[profileName]
  ) {
    throw new Error(`Lighthouse ${profileName} LHR identity does not match requested settings`);
  }
}

export function validateAuditUrls(urls, allowRemote) {
  return urls.map((raw) => {
    const url = new URL(raw);
    const local = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
    if (!local && !allowRemote) throw new Error(`Lighthouse target must be local: ${url.href}`);
    if (url.username || url.password)
      throw new Error('Lighthouse target URL must not contain credentials');
    return url.href.replace(/\/$/, '');
  });
}

export function expectedReportFiles(profileNames, runs) {
  return profileNames.flatMap((name) =>
    Array.from({ length: runs }, (_, index) => [
      `${name}-run-${index + 1}.report.json`,
      `${name}-run-${index + 1}.report.html`,
    ]).flat()
  );
}

function validateReportPair(reports, profileName, run) {
  if (!Array.isArray(reports) || reports.length !== 2) {
    throw new Error(`Expected JSON and HTML reports for ${profileName} run ${run}`);
  }
  try {
    const parsed = JSON.parse(reports[0]);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('not object');
  } catch (error) {
    throw new Error(
      `Invalid Lighthouse JSON report for ${profileName} run ${run}: ${error.message}`
    );
  }
  const html = reports[1].replace(/^\s*(?:<!--[\s\S]*?-->\s*)*/, '');
  if (!/^(?:<!doctype\s+html|<html)\b/i.test(html)) {
    throw new Error(`Invalid Lighthouse HTML report for ${profileName} run ${run}`);
  }
}

export async function writeReportPair(outputDir, profileName, index, reports) {
  validateReportPair(reports, profileName, index + 1);
  const stem = `${profileName}-run-${index + 1}.report`;
  await Promise.all([
    fs.writeFile(path.join(outputDir, `${stem}.json`), reports[0], 'utf8'),
    fs.writeFile(path.join(outputDir, `${stem}.html`), reports[1], 'utf8'),
  ]);
}

export async function prepareOutputDir(outputDir) {
  const resolved = path.resolve(outputDir);
  if (resolved === path.parse(resolved).root) throw new Error('Refusing to clean filesystem root');
  await fs.mkdir(resolved, { recursive: true });
  const entries = await fs.readdir(resolved);
  await Promise.all(entries.map((entry) => fs.rm(path.join(resolved, entry), { recursive: true })));
}

export async function assertReportInventory(outputDir, expectedFiles) {
  const actual = (await fs.readdir(outputDir)).sort();
  const expected = [...expectedFiles].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Lighthouse report inventory mismatch: ${JSON.stringify({ actual, expected })}`
    );
  }
}

export function withTimeout(operation, timeoutMs, label) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error(`Invalid ${label} timeout`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
    Promise.resolve(operation).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function installSignalHandlers(target, controller, cleanup) {
  let resolveDone;
  let rejectDone;
  let handled = false;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const handler = (signal) => {
    if (handled) return;
    handled = true;
    controller.abort(new Error(`Received ${signal}`));
    Promise.resolve(cleanup()).then(() => resolveDone(signal), rejectDone);
  };
  const onInt = () => handler('SIGINT');
  const onTerm = () => handler('SIGTERM');
  target.once('SIGINT', onInt);
  target.once('SIGTERM', onTerm);
  return {
    done,
    dispose() {
      target.removeListener('SIGINT', onInt);
      target.removeListener('SIGTERM', onTerm);
    },
  };
}
