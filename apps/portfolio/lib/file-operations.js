/**
 * File operations with detailed error handling
 * @module file-operations
 */

const fs = require('fs');
const path = require('path');
const logger = require('../logger');

/**
 * Custom error class for file operations
 */
class FileOperationError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} filePath - Path to the file
   * @param {string} operation - Operation that failed
   * @param {Error} [cause] - Original error
   */
  constructor(message, filePath, operation, cause) {
    super(message);
    this.name = 'FileOperationError';
    this.filePath = filePath;
    this.operation = operation;
    this.cause = cause;
  }
}

/**
 * Safely read a file with detailed error handling
 * @param {string} filePath - Path to the file
 * @param {string|null} encoding - File encoding (default: 'utf-8', null for binary)
 * @returns {string|Buffer} File contents
 * @throws {FileOperationError} If file reading fails
 */
function safeReadFile(filePath, encoding = 'utf-8') {
  const fileName = path.basename(filePath);

  // Check if file exists first
  if (!fs.existsSync(filePath)) {
    throw new FileOperationError(`File not found: ${fileName}`, filePath, 'read');
  }

  try {
    const stats = fs.statSync(filePath);

    // Warn if file is unusually large (> 5MB)
    if (stats.size > 5 * 1024 * 1024) {
      logger.warn(`Large file detected: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    return fs.readFileSync(filePath, encoding);
  } catch (err) {
    throw new FileOperationError(
      `Failed to read ${fileName}: ${err.message}`,
      filePath,
      'read',
      err
    );
  }
}

/**
 * Read multiple files safely with parallel processing for better performance.
 * @param {Array<{path: string, encoding: string|null, name: string, optional?: boolean}>} files
 *   File descriptors. If `optional: true` is set on a file and the read fails
 *   because the path does not exist, the value resolves to `null` (binary) or
 *   `''` (utf-8) instead of raising. This lets the build proceed when generated
 *   artefacts (e.g. `resume_final.pdf` produced by tools/scripts/build/pdf-generator/)
 *   are not present in the working tree — the worker still serves an empty
 *   buffer until the next CI build that produces them.
 * @returns {Object} An object with file contents, keyed by their `name`.
 * @throws {FileOperationError} If any required file fails to read.
 */
function readAllFiles(files) {
  const contents = {};
  const errors = [];

  for (const file of files) {
    try {
      contents[file.name] = safeReadFile(file.path, file.encoding);
    } catch (err) {
      const isMissing =
        err && (err.message?.startsWith('File not found:') || err?.cause?.code === 'ENOENT');
      if (file.optional && isMissing) {
        contents[file.name] = file.encoding === null ? Buffer.alloc(0) : '';
        continue;
      }
      errors.push(err);
    }
  }

  // Report all errors at once for better debugging
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => e.message).join('\n  - ');
    throw new FileOperationError(
      `Failed to read ${errors.length} file(s):\n  - ${errorMessages}`,
      errors[0].filePath,
      'readAll'
    );
  }

  return contents;
}

module.exports = {
  safeReadFile,
  readAllFiles,
  FileOperationError,
};
