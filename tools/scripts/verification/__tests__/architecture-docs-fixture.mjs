import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ADRS = [
  ['0001', '- Status: Accepted (Bazel facade portion superseded by ADR-0008)'],
  ['0002', '- Status: Accepted'],
  ['0003', '- Status: Accepted'],
  ['0004', '- Status: Accepted'],
  ['0005', '- Status: Accepted'],
  ['0006', '- Status: Superseded by [ADR 0007](0007-decision.md)'],
  [
    '0007',
    '- Status: **Superseded by [ADR 0009](0009-decision.md)**\n- Supersedes: [ADR 0006](0006-decision.md)',
  ],
  ['0008', '**Status:** Accepted\n**Supersedes:** legacy files in the repository'],
  ['0009', '**Status:** Accepted\n**Supersedes:** [ADR 0007](./0007-decision.md)'],
];

export function createFixture(root, options = {}) {
  const docs = join(root, 'docs');
  const adrDir = join(docs, 'adr');
  mkdirSync(adrDir, { recursive: true });
  const entries = ADRS.map(([id, metadata]) => {
    const filename = `${id}-decision.md`;
    const body = `# ADR ${id}: Decision\n\n${metadata}\n- Date: 2026-01-01\n\n[Architecture](../ARCHITECTURE.md)\n`;
    writeFileSync(join(adrDir, filename), options.adrBodies?.[id] ?? body);
    return [id, filename];
  });
  writeFileSync(
    join(adrDir, 'template.md'),
    '# ADR Template\n\n- Status: Proposed\n- Date: YYYY-MM-DD\n'
  );
  const indexedEntries = entries.filter(([id]) => id !== options.missingIndex);
  const accepted = indexedEntries.filter(
    ([id]) => !['0006', '0007'].includes(id) || options.statusMismatch === id
  );
  const superseded = indexedEntries.filter(
    ([id]) => ['0006', '0007'].includes(id) && options.statusMismatch !== id
  );
  const links = (items) => items.map(([id, filename]) => `- [${id}](adr/${filename})`).join('\n');
  writeFileSync(
    join(docs, 'README.md'),
    `# Index\n\n## Accepted\n\n${links(accepted)}\n\n## Superseded\n\n${links(superseded)}\n`
  );
  writeFileSync(
    join(docs, 'ARCHITECTURE.md'),
    options.architecture ?? '# Architecture\n\nCurrent merged Worker.\n'
  );
  const architectureDir = join(docs, 'architecture');
  mkdirSync(architectureDir, { recursive: true });
  for (const name of [
    'system-overview.md',
    'component-inventory.md',
    'DEPLOYMENT_PIPELINE.md',
    'kv-ownership.md',
  ]) {
    writeFileSync(join(architectureDir, name), `# ${name}\n\n[Architecture](../ARCHITECTURE.md)\n`);
  }
}
