/**
 * Content hashing utilities for CSP and cache busting
 * @module content-hashing
 */

const crypto = require('crypto');

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
  return crypto.createHash('md5').update(JSON.stringify(data), 'utf-8').digest('hex');
}

module.exports = {
  generateHash,
  calculateDataHash,
};
