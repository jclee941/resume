/**
 * Utility functions for resume worker generation
 * @module utils
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
    throw new FileOperationError(
      `File not found: ${fileName}`,
      filePath,
      'read'
    );
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
 * Generate SHA-256 hash for CSP
 * @param {string} content - Content to hash
 * @returns {string} Base64-encoded SHA-256 hash
 */
function generateHash(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('base64');
}

/**
 * Calculate MD5 hash for data caching
 * @param {Object} data - Data to hash
 * @returns {string} MD5 hash
 */
function calculateDataHash(data) {
  return crypto.createHash('md5')
    .update(JSON.stringify(data), 'utf-8')
    .digest('hex');
}

/**
 * Read multiple files safely with parallel processing for better performance.
 * @param {Array<Object>} files - An array of file objects { path: string, encoding: string | null, name: string }.
 * @returns {Object} An object with file contents, keyed by their `name`.
 * @throws {FileOperationError} If any file reading fails via `safeReadFile`.
 */
function readAllFiles(files) {
  const contents = {};
  const errors = [];
  
  for (const file of files) {
    try {
      contents[file.name] = safeReadFile(file.path, file.encoding);
    } catch (err) {
      errors.push(err);
    }
  }
  
  // Report all errors at once for better debugging
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.message).join('\n  - ');
    throw new FileOperationError(
      `Failed to read ${errors.length} file(s):\n  - ${errorMessages}`,
      errors[0].filePath,
      'readAll'
    );
  }
  
  return contents;
}

/**
 * Validate JSON string and parse it safely
 * @param {string} jsonString - JSON string to parse
 * @param {string} [source='unknown'] - Source identifier for error messages
 * @returns {Object} Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
function safeParseJSON(jsonString, source = 'unknown') {
  try {
    return JSON.parse(jsonString);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Try to find the error location
      const match = err.message.match(/position (\d+)/);
      const position = match ? parseInt(match[1], 10) : -1;
      const context = position > 0 
        ? `...${jsonString.substring(Math.max(0, position - 20), position + 20)}...`
        : '';
      throw new Error(`Invalid JSON in ${source}: ${err.message}${context ? ` near: ${context}` : ''}`);
    }
    throw err;
  }
}

/**
 * Sanitize string for safe embedding in template literals
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForTemplate(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} unsafe - Potentially unsafe string
 * @returns {string} HTML-escaped safe string
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return String(unsafe || '');
  }
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  safeReadFile,
  generateHash,
  calculateDataHash,
  readAllFiles,
  safeParseJSON,
  sanitizeForTemplate,
  escapeHtml,
  FileOperationError,
};
