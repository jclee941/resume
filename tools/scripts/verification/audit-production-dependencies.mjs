import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

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
  for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
    if (!vulnerability || typeof vulnerability !== 'object' || !Array.isArray(vulnerability.via)) {
      throw new TypeError(`npm audit vulnerability ${name} is malformed`);
    }
    if (vulnerability.severity === 'high' || vulnerability.severity === 'critical') {
      violations.push(`${name}: ${vulnerability.severity} vulnerability`);
    }
  }

  return { violations };
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

  console.log('Production dependency audit passed: no high or critical advisories.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runAudit();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
