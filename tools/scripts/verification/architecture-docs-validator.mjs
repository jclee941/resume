import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { validateAdrSupersession } from './architecture-docs-adr-links.mjs';
import { CURRENT_DOCS, validateCurrentDocs } from './architecture-docs-current-state.mjs';
import { validateIndex } from './architecture-docs-index.mjs';

const EXPECTED_IDS = Array.from({ length: 9 }, (_, index) => String(index + 1).padStart(4, '0'));

function diagnostic(code, file, message) {
  return { code, file, message };
}

function metadataValue(text, name) {
  const escaped = name.replaceAll('*', '\\*');
  const match = text.match(new RegExp(`^(?:- ${escaped}:|\\*\\*${escaped}:\\*\\*)\\s*(.+)$`, 'mi'));
  return match?.[1]?.replace(/^\*\*(.*)\*\*$/, '$1').trim();
}

function markdownLinks(text) {
  return [...text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]);
}

function relativeLinkTarget(file, target) {
  if (/^(?:[a-z]+:|#)/i.test(target)) return undefined;
  try {
    const cleanTarget = decodeURIComponent(target.split('#', 1)[0].split('?', 1)[0]);
    return resolve(dirname(file), cleanTarget);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
}

function parseAdr(root, file, diagnostics) {
  const text = readFileSync(file, 'utf8');
  const repoFile = relative(root, file);
  const id = text.match(/^# ADR (\d{4})\b/m)?.[1];
  const rawStatus = metadataValue(text, 'Status');
  const date = metadataValue(text, 'Date');
  const simpleStatus = rawStatus?.match(/^(Proposed|Accepted|Deprecated)$/)?.[1];
  const status =
    simpleStatus ??
    (id === '0001' && rawStatus === 'Accepted (Bazel facade portion superseded by ADR-0008)'
      ? 'Accepted'
      : /^Superseded by \[ADR[- ]?\d{4}[^\]]*\]\([^)]+\)$/.test(rawStatus ?? '')
        ? 'Superseded'
        : undefined);
  if (!id)
    diagnostics.push(
      diagnostic('missing-id', repoFile, 'ADR heading must declare a four-digit ID')
    );
  if (!status)
    diagnostics.push(
      diagnostic('invalid-status', repoFile, 'Status must use a normalized architecture state')
    );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ''))
    diagnostics.push(diagnostic('missing-date', repoFile, 'ADR must declare an ISO date'));
  return { id, status, rawStatus, file: repoFile, absoluteFile: file, text };
}

function validateLinks(root, files, diagnostics) {
  for (const file of files) {
    const repoFile = relative(root, file);
    for (const target of markdownLinks(readFileSync(file, 'utf8'))) {
      const resolved = relativeLinkTarget(file, target);
      if (resolved === null || (resolved && !existsSync(resolved)))
        diagnostics.push(
          diagnostic('broken-link', repoFile, `Relative link does not resolve: ${target}`)
        );
    }
  }
}

function validateIds(adrs, diagnostics) {
  const counts = new Map();
  for (const { id } of adrs) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts)
    if (count > 1)
      diagnostics.push(
        diagnostic('duplicate-id', 'docs/adr', `ADR ${id} is declared ${count} times`)
      );
  for (const id of EXPECTED_IDS)
    if (!counts.has(id))
      diagnostics.push(diagnostic('missing-id', 'docs/adr', `ADR ${id} is missing`));
  for (const id of counts.keys())
    if (!EXPECTED_IDS.includes(id))
      diagnostics.push(diagnostic('nonsequential-id', 'docs/adr', `Unexpected ADR ID ${id}`));
}

export function validateArchitectureDocs(root, mode) {
  const diagnostics = [];
  const adrDir = join(root, 'docs/adr');
  const adrFiles = readdirSync(adrDir)
    .filter((name) => /^\d{4}-.*\.md$/.test(name))
    .sort()
    .map((name) => join(adrDir, name));
  const adrs = adrFiles.map((file) => parseAdr(root, file, diagnostics));
  const governanceFiles = [join(root, 'docs/README.md'), ...adrFiles];
  validateIds(adrs, diagnostics);
  validateAdrSupersession(adrs, adrDir, diagnostics);
  validateIndex(root, adrs, diagnostics);
  validateLinks(root, governanceFiles, diagnostics);
  const currentFiles = mode === 'full' ? CURRENT_DOCS.map((file) => join(root, file)) : [];
  if (mode === 'full') {
    validateLinks(root, currentFiles, diagnostics);
    validateCurrentDocs(root, currentFiles, diagnostics);
  }
  return {
    status: diagnostics.length === 0 ? 'ok' : 'error',
    mode,
    adrs: adrs.map(({ id, status, file }) => ({ id, status, file })),
    checkedFiles: [...governanceFiles, ...currentFiles].map((file) => relative(root, file)),
    diagnostics,
  };
}
