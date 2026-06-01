#!/usr/bin/env node
/**
 * Dev-only helper: extract inlined INDEX_HTML / INDEX_EN_HTML / INDEX_JA_HTML
 * from the generated worker.js into standalone .html files so the layout can
 * be visually verified with a browser (file://). NOT part of the build.
 *
 * Usage: node extract-html.js  →  writes /tmp/opencode/portfolio-shots/{ko,en,ja}.html
 */
const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, 'worker.js');
const src = fs.readFileSync(workerPath, 'utf-8');

function extractConst(name) {
  // Match: const NAME = `...`; capturing the template literal body.
  const marker = `const ${name} = \``;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`${name} not found`);
  const bodyStart = start + marker.length;
  // Find the closing backtick that ends the template literal: the first
  // unescaped backtick after bodyStart. The build escapes inner backticks as \`.
  let i = bodyStart;
  while (i < src.length) {
    if (src[i] === '`' && src[i - 1] !== '\\') break;
    i += 1;
  }
  const raw = src.slice(bodyStart, i);
  // Unescape the template-literal escaping the build applied.
  return raw
    .replace(/\\`/g, '`')
    .replace(/\\\$\{/g, '${')
    .replace(/\\\\/g, '\\');
}

const outDir = process.argv[2] || '/tmp/opencode/portfolio-shots';
fs.mkdirSync(outDir, { recursive: true });

for (const [name, file] of [
  ['INDEX_HTML', 'ko.html'],
  ['INDEX_EN_HTML', 'en.html'],
  ['INDEX_JA_HTML', 'ja.html'],
]) {
  let html = extractConst(name);
  // Replace CSP nonce placeholder so inline scripts/styles run under file://.
  html = html.replace(/__CSP_NONCE__/g, 'devnonce');
  fs.writeFileSync(path.join(outDir, file), html, 'utf-8');
  console.log(`wrote ${path.join(outDir, file)} (${html.length} bytes)`);
}

// Extract the bundled main.js so the static preview can run client JS.
try {
  const mainJs = extractConst('MAIN_JS').replace(/__CSP_NONCE__/g, 'devnonce');
  fs.writeFileSync(path.join(outDir, 'main.js'), mainJs, 'utf-8');
  console.log(`wrote ${path.join(outDir, 'main.js')} (${mainJs.length} bytes)`);
} catch (err) {
  console.warn('main.js not extracted:', err.message);
}
