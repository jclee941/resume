import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ACCEPTED_ADVISORIES = ['GHSA-7pqw-9j4j-h8q3', 'GHSA-jmr9-qjv8-65gv'];
const ACCEPTED_GRAPH = {
  '@cloudflare/puppeteer': {
    via: ['@puppeteer/browsers'],
    effects: [],
  },
  '@puppeteer/browsers': {
    via: ['extract-zip'],
    effects: ['@cloudflare/puppeteer'],
  },
  'extract-zip': {
    via: ACCEPTED_ADVISORIES,
    effects: ['@puppeteer/browsers'],
  },
};

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function advisoryIds(vulnerability) {
  return vulnerability.via
    .filter((entry) => typeof entry === 'object' && entry !== null)
    .map((entry) => new URL(entry.url).pathname.split('/').at(-1));
}

function dependencyNames(vulnerability) {
  return vulnerability.via.filter((entry) => typeof entry === 'string');
}

function sameMembers(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

export function evaluateAuditReport(report) {
  if (report?.error) {
    const { code = 'unknown', summary = '' } = report.error;
    throw new Error(`npm audit failed: ${code} ${summary}`.trim());
  }
  if (!report || typeof report !== 'object' || !report.vulnerabilities) {
    throw new TypeError('npm audit report must contain a vulnerabilities object');
  }
  if (typeof report.vulnerabilities !== 'object' || Array.isArray(report.vulnerabilities)) {
    throw new TypeError('npm audit report vulnerabilities must be an object');
  }

  const violations = [];
  const acceptedAdvisories = new Set();

  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!vulnerability || typeof vulnerability !== 'object' || !Array.isArray(vulnerability.via)) {
      throw new TypeError(`npm audit vulnerability ${name} is malformed`);
    }
    if (vulnerability.severity !== 'high' && vulnerability.severity !== 'critical') continue;

    const expected = ACCEPTED_GRAPH[name];
    if (!expected) {
      violations.push(`${name}: unaccepted ${vulnerability.severity} vulnerability`);
      continue;
    }

    const actualVia = [...dependencyNames(vulnerability), ...advisoryIds(vulnerability)];
    const actualEffects = Array.isArray(vulnerability.effects) ? vulnerability.effects : [];
    if (!sameMembers(actualVia, expected.via) || !sameMembers(actualEffects, expected.effects)) {
      violations.push(`${name}: accepted vulnerability graph changed`);
      continue;
    }

    for (const advisory of advisoryIds(vulnerability)) acceptedAdvisories.add(advisory);
  }

  for (const packageName of Object.keys(ACCEPTED_GRAPH)) {
    if (!(packageName in report.vulnerabilities)) {
      violations.push(`${packageName}: accepted vulnerability graph is incomplete`);
    }
  }

  for (const advisory of ACCEPTED_ADVISORIES) {
    if (!acceptedAdvisories.has(advisory)) {
      violations.push(`${advisory}: accepted advisory is missing`);
    }
  }

  return { acceptedAdvisories: sorted(acceptedAdvisories), violations };
}

function runAudit() {
  let output;
  try {
    // `npm run` exports user-level npm config to children; an inherited
    // allow-scripts setting makes the nested `npm audit` fail with EALLOWSCRIPTS.
    const { npm_config_allow_scripts: _inheritedAllowScripts, ...env } = process.env;
    output = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
      encoding: 'utf8',
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (!error || typeof error !== 'object' || typeof error.stdout !== 'string') throw error;
    output = error.stdout;
  }

  let report;
  try {
    report = JSON.parse(output);
  } catch (error) {
    throw new Error(`npm audit returned invalid JSON: ${error.message}`, { cause: error });
  }

  const result = evaluateAuditReport(report);
  if (result.violations.length > 0) {
    throw new Error(`Production dependency audit failed:\n- ${result.violations.join('\n- ')}`);
  }

  console.warn(
    `Accepted risk: ${ACCEPTED_ADVISORIES.join(', ')} via @cloudflare/puppeteer -> @puppeteer/browsers -> extract-zip. See docs/security/cloudflare-puppeteer-extract-zip-accepted-risk.md.`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runAudit();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
