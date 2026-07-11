const fs = require('node:fs');
const path = require('node:path');

function requireFdRelativeSupport() {
  const { O_DIRECTORY, O_NOFOLLOW } = fs.constants;
  if (
    process.platform !== 'linux' ||
    typeof O_DIRECTORY !== 'number' ||
    typeof O_NOFOLLOW !== 'number' ||
    !fs.existsSync('/proc/self/fd')
  ) {
    throw new Error('Secure directory-FD relative access is unavailable on this platform');
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function openPinnedDirectory(directoryPath, originalPath = directoryPath) {
  requireFdRelativeSupport();
  const descriptor = fs.openSync(
    directoryPath,
    fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
  );
  try {
    const identity = fs.fstatSync(descriptor);
    const fdPath = `/proc/self/fd/${descriptor}`;
    const fdIdentity = fs.statSync(fdPath);
    if (!identity.isDirectory() || !sameIdentity(identity, fdIdentity)) {
      throw new Error(`Failed to pin directory identity: ${originalPath}`);
    }
    return {
      descriptor,
      fdPath,
      identity,
      originalPath: path.resolve(originalPath),
    };
  } catch (error) {
    fs.closeSync(descriptor);
    throw error;
  }
}

function matchesOriginal(binding) {
  try {
    const current = fs.lstatSync(binding.originalPath);
    return current.isDirectory() && sameIdentity(binding.identity, current);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

function leafPath(binding, name) {
  if (path.basename(name) !== name) throw new Error(`Directory-FD path must be a leaf: ${name}`);
  return path.join(binding.fdPath, name);
}

function closePinnedDirectory(binding) {
  fs.closeSync(binding.descriptor);
}

module.exports = {
  closePinnedDirectory,
  leafPath,
  matchesOriginal,
  openPinnedDirectory,
  requireFdRelativeSupport,
  sameIdentity,
};
