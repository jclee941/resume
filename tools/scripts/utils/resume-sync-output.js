const fs = require('node:fs');
const path = require('node:path');

const secureDirectory = require('./secure-directory.js');

function assertNoSymbolicLinkTraversal(directoryPath) {
  const absolute = path.resolve(directoryPath);
  const { root } = path.parse(absolute);
  const segments = absolute.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing symbolic link in output directory path: ${current}`);
    }
  }
}

function prepareOutputDirectories(outputPaths) {
  secureDirectory.requireFdRelativeSupport();
  const directories = [
    ...new Set(outputPaths.map((outputPath) => path.resolve(path.dirname(outputPath)))),
  ];
  const bindings = new Map();
  try {
    for (const directory of directories) assertNoSymbolicLinkTraversal(directory);
    for (const directory of directories) fs.mkdirSync(directory, { recursive: true });
    for (const directory of directories) {
      assertNoSymbolicLinkTraversal(directory);
      bindings.set(directory, secureDirectory.openPinnedDirectory(directory));
    }
    return bindings;
  } catch (error) {
    closeOutputDirectories(bindings);
    throw new Error(error.message, { cause: error });
  }
}

function bindingForOutput(bindings, outputPath) {
  const directory = path.resolve(path.dirname(outputPath));
  const binding = bindings.get(directory);
  if (!binding) throw new Error(`Output directory is not pinned: ${directory}`);
  return binding;
}

function writeGeneratedSnapshot(binding, outputName, data) {
  let descriptor;
  try {
    descriptor = fs.openSync(
      secureDirectory.leafPath(binding, outputName),
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_NOFOLLOW,
      0o644
    );
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ELOOP') {
      throw new Error(`Refusing to overwrite generated output symbolic link: ${outputName}`, {
        cause: error,
      });
    }
    throw error;
  }
  try {
    fs.writeFileSync(descriptor, data);
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertOutputDirectoriesCurrent(bindings) {
  for (const binding of bindings.values()) {
    if (!secureDirectory.matchesOriginal(binding)) {
      throw new Error(
        `Output directory identity changed during generation: ${binding.originalPath}`
      );
    }
  }
}

function cleanupWrittenSnapshots(written) {
  for (const { binding, outputName } of written) {
    try {
      fs.unlinkSync(secureDirectory.leafPath(binding, outputName));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
}

function closeOutputDirectories(bindings) {
  for (const binding of bindings.values()) secureDirectory.closePinnedDirectory(binding);
}

module.exports = {
  assertOutputDirectoriesCurrent,
  bindingForOutput,
  cleanupWrittenSnapshots,
  closeOutputDirectories,
  prepareOutputDirectories,
  writeGeneratedSnapshot,
};
