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

/**
 * @typedef {Object} PinnedDirectoryBinding
 * @property {number} descriptor
 * @property {string} fdPath
 * @property {import('node:fs').Stats} identity
 * @property {string} originalPath
 */

/**
 * @param {import('node:fs').Stats | { dev: number, ino: number }} left
 * @param {import('node:fs').Stats | { dev: number, ino: number }} right
 * @returns {boolean}
 */
function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

/**
 * @param {string} directoryPath
 * @param {string} [originalPath]
 * @returns {PinnedDirectoryBinding}
 */
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

/**
 * @param {PinnedDirectoryBinding} binding
 * @returns {boolean}
 */
function matchesOriginal(binding) {
  try {
    const current = fs.lstatSync(binding.originalPath);
    return current.isDirectory() && sameIdentity(binding.identity, current);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
}

/**
 * @param {PinnedDirectoryBinding} binding
 * @param {string} name
 * @returns {string}
 */
function leafPath(binding, name) {
  if (path.basename(name) !== name) throw new Error(`Directory-FD path must be a leaf: ${name}`);
  return path.join(binding.fdPath, name);
}

/**
 * @param {PinnedDirectoryBinding} binding
 * @returns {void}
 */
function closePinnedDirectory(binding) {
  fs.closeSync(binding.descriptor);
}

module.exports = {
  closePinnedDirectory,
  leafPath,
  matchesOriginal,
  openPinnedDirectory,
  requireFdRelativeSupport,
};
