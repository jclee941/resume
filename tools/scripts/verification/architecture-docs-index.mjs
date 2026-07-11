import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function linkedFiles(file, text) {
  return [...text.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) =>
    resolve(dirname(file), match[1].split('#', 1)[0])
  );
}

function section(text, heading) {
  const marker = `## ${heading}`;
  const headingStart = text.indexOf(marker);
  if (headingStart < 0) return '';
  const contentStart = text.indexOf('\n', headingStart) + 1;
  const nextHeading = text.indexOf('\n## ', contentStart);
  return text.slice(contentStart, nextHeading < 0 ? undefined : nextHeading);
}

export function validateIndex(root, adrs, diagnostics) {
  const file = join(root, 'docs/README.md');
  const text = readFileSync(file, 'utf8');
  const allLinks = linkedFiles(file, text);
  const statusLinks = {
    Accepted: linkedFiles(file, section(text, 'Accepted')),
    Superseded: linkedFiles(file, section(text, 'Superseded')),
  };
  for (const adr of adrs) {
    const count = allLinks.filter((target) => target === adr.absoluteFile).length;
    if (count === 0) {
      diagnostics.push({
        code: 'missing-index',
        file: 'docs/README.md',
        message: `${adr.id} is absent from the documentation index`,
      });
    } else if (count > 1) {
      diagnostics.push({
        code: 'duplicate-index',
        file: 'docs/README.md',
        message: `${adr.id} appears more than once in the documentation index`,
      });
    } else if (adr.status in statusLinks && !statusLinks[adr.status].includes(adr.absoluteFile)) {
      diagnostics.push({
        code: 'index-status-mismatch',
        file: 'docs/README.md',
        message: `${adr.id} is not listed under ${adr.status}`,
      });
    }
  }
}
