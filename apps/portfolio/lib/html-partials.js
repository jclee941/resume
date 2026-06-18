const fs = require('fs');
const path = require('path');

const INCLUDE_PATTERN = /<!--\s*@include\s+([^\s]+)\s*-->/g;
const MAX_INCLUDE_DEPTH = 20;

function resolveIncludePath(baseDir, fromPath, includePath) {
  const resolved = path.resolve(path.dirname(fromPath), includePath);
  const normalizedBase = path.resolve(baseDir);

  if (resolved !== normalizedBase && !resolved.startsWith(`${normalizedBase}${path.sep}`)) {
    throw new Error(`HTML include escapes portfolio root: ${includePath}`);
  }

  return resolved;
}

function expandHtmlIncludes(html, options, depth = 0) {
  if (typeof html !== 'string') {
    return html;
  }

  const { baseDir, sourcePath } = options;

  if (depth > MAX_INCLUDE_DEPTH) {
    throw new Error(`HTML include nesting exceeded ${MAX_INCLUDE_DEPTH}: ${sourcePath}`);
  }

  return html.replace(INCLUDE_PATTERN, (_match, includePath) => {
    const resolved = resolveIncludePath(baseDir, sourcePath, includePath);
    const included = fs.readFileSync(resolved, 'utf-8');
    return expandHtmlIncludes(included, { baseDir, sourcePath: resolved }, depth + 1);
  });
}

module.exports = { expandHtmlIncludes };
