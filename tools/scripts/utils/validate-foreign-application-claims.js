const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FOREIGN_PACKET_DIR = path.join(
  REPO_ROOT,
  'packages',
  'data',
  'resumes',
  'applications',
  'foreign-company'
);

const FIXTURES = {
  risky: {
    summary: 'Reduced manual triage by 80% using automation.',
  },
  harmless: {
    certifications: [{ name: 'LPIC Level 1', date: '2019.02' }],
    contact: 'Available during 2026.06 planning cycles.',
  },
};

const MALFORMED_FIXTURE = '{"summary": "Reduced manual triage by 80%"';

const SKIPPED_PATH_SEGMENTS = new Set(['date', 'email', 'github', 'period', 'phone', 'portfolio']);

const BENIGN_NUMERIC_PATTERNS = [
  /\b\d{4}[.-]\d{2}(?:[.-]\d{2})?\b/g,
  /\b\d{2,4}[-\s]\d{3,4}[-\s]\d{4}\b/g,
  /\b(?:level|version|v)\s*\d+(?:\.\d+)?\b/gi,
  /\b(?:ipv4|ipv6|http\/2|s3|ec2)\b/gi,
];

const STANDALONE_NUMERIC_PATTERN =
  /(?:\b\d+(?:[.,]\d+)?\s*(?:%|percent|percentage|x|times|fold)\b|\b\d+\s*[:/]\s*\d+\b|(?<![A-Za-z])\b\d+(?:[.,]\d+)?\b(?![A-Za-z]))/i;

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectTextItems(value, segments = []) {
  if (typeof value === 'string') {
    return [{ path: segments.join('.'), text: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectTextItems(entry, [...segments, String(index)]));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      collectTextItems(entry, [...segments, key])
    );
  }
  return [];
}

function containsSkippedSegment(pathName) {
  return pathName.split('.').some((segment) => SKIPPED_PATH_SEGMENTS.has(segment));
}

function stripBenignNumericText(text) {
  return BENIGN_NUMERIC_PATTERNS.reduce((current, pattern) => current.replace(pattern, ' '), text);
}

function findRiskyClaims(value) {
  const findings = [];
  for (const item of collectTextItems(value)) {
    if (containsSkippedSegment(item.path)) continue;
    const claimText = stripBenignNumericText(item.text);
    if (STANDALONE_NUMERIC_PATTERN.test(claimText)) {
      findings.push(`${item.path || '<root>'}: ${item.text}`);
    }
  }
  return findings;
}

function parseJsonText(text) {
  try {
    return { data: JSON.parse(text) };
  } catch (error) {
    return { error };
  }
}

function readJson(filePath) {
  return parseJsonText(fs.readFileSync(filePath, 'utf8'));
}

function validateFiles() {
  const files = listJsonFiles(FOREIGN_PACKET_DIR);
  if (files.length === 0)
    return ['packages/data/resumes/applications/foreign-company: no JSON packets found'];
  const failures = [];
  for (const file of files) {
    const loaded = readJson(file);
    if (loaded.error) {
      failures.push(`${path.relative(REPO_ROOT, file)}: malformed JSON: ${loaded.error.message}`);
      continue;
    }
    const findings = findRiskyClaims(loaded.data);
    for (const finding of findings) {
      failures.push(`${path.relative(REPO_ROOT, file)}: ${finding}`);
    }
  }
  return failures;
}

function runFixtures() {
  const risky = findRiskyClaims(FIXTURES.risky).length > 0 ? 'blocked' : 'allowed';
  const harmless = findRiskyClaims(FIXTURES.harmless).length === 0 ? 'allowed' : 'blocked';
  const malformed = parseJsonText(MALFORMED_FIXTURE).error ? 'blocked' : 'allowed';
  const fileFailures = validateFiles();
  for (const failure of fileFailures) console.error(failure);
  const passed =
    risky === 'blocked' &&
    harmless === 'allowed' &&
    malformed === 'blocked' &&
    fileFailures.length === 0;
  const marker = `T14-${passed ? 'PASS' : 'FAIL'} risky=${risky} harmless=${harmless}`;
  console.log(marker);
  return passed ? 0 : 1;
}

function main(argv) {
  if (argv.includes('--fixtures')) {
    return runFixtures();
  }

  const failures = validateFiles();
  for (const failure of failures) console.error(failure);
  console.log(
    `T14-${failures.length === 0 ? 'PASS' : 'FAIL'} files=${failures.length === 0 ? 'allowed' : 'blocked'}`
  );
  return failures.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { collectTextItems, findRiskyClaims, parseJsonText };
