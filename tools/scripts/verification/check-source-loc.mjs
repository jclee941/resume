import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_CODE_LINES = 200;

const SOURCE_FILE = /^(apps|packages|tools)\/.+\.(?:c?js|mjs|go)$/;
const NOT_SOURCE = [
  /(^|\/)__tests__\//,
  /\.test\.[cm]?js$/,
  /_test\.go$/,
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /^apps\/portfolio\/worker\.js$/,
];

/**
 * Architecture-rules LOC: skip blank lines, comment-only lines, and the bodies
 * of multi-line template literals / Go raw strings (static string content).
 * @param {string} source
 * @returns {number}
 */
export function countCodeLines(source) {
  let count = 0;
  let inBlockComment = false;
  let inMultilineString = false;
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();
    const backticks = (line.match(/`/g) || []).length;
    if (inMultilineString) {
      if (backticks % 2 === 1) inMultilineString = false;
      continue;
    }
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    if (line.startsWith('/*')) {
      inBlockComment = !line.includes('*/');
      continue;
    }
    count += 1;
    if (backticks % 2 === 1) inMultilineString = true;
  }
  return count;
}

/**
 * @typedef {Object} OversizedFile
 * @property {string} file
 * @property {number} codeLines
 */

/**
 * @param {string[]} files
 * @param {(file: string) => string} readSource
 * @param {number} [limit]
 * @returns {OversizedFile[]}
 */
export function findOversizedFiles(files, readSource, limit = MAX_CODE_LINES) {
  return files
    .filter((file) => SOURCE_FILE.test(file) && !NOT_SOURCE.some((pattern) => pattern.test(file)))
    .map((file) => ({ file, codeLines: countCodeLines(readSource(file)) }))
    .filter(({ codeLines }) => codeLines > limit)
    .sort((left, right) => right.codeLines - left.codeLines);
}

function main() {
  const root = process.cwd();
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file) => file && existsSync(path.join(root, file)));
  const oversized = findOversizedFiles(files, (file) =>
    readFileSync(path.join(root, file), 'utf8')
  );

  if (oversized.length > 0) {
    console.error(`Source files over ${MAX_CODE_LINES} code lines (split by responsibility):`);
    for (const { file, codeLines } of oversized) console.error(`  ${codeLines}\t${file}`);
    process.exitCode = 1;
    return;
  }
  console.log(`LOC check passed: every source file has at most ${MAX_CODE_LINES} code lines.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
