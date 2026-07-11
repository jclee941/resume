const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function copyCanonicalSources(root, sources) {
  const sourceDir = path.join(root, 'sources');
  fs.mkdirSync(sourceDir, { recursive: true });
  for (const source of sources) {
    fs.copyFileSync(source.sourcePath, path.join(sourceDir, path.basename(source.sourcePath)));
  }
  return sourceDir;
}

function preserveFiles(paths) {
  const previous = new Map(
    paths.map((filePath) => [filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath) : null])
  );
  return () => {
    for (const [filePath, bytes] of previous) {
      if (bytes === null) fs.rmSync(filePath, { force: true });
      else fs.writeFileSync(filePath, bytes);
    }
  };
}

const isolatedRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'resume-sync-contract-'));

module.exports = { copyCanonicalSources, isolatedRoot, preserveFiles };
