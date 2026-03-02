/**
 * Environment variable validation
 * @module env
 */

const logger = require('../logger');

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
function validateEnv() {
  const required = ['NODE_ENV'];
  const optional = ['DEBUG', 'VERBOSE', 'DEPLOYED_AT'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logger.debug('Environment validation passed');
  logger.debug('Required variables:', required.filter(k => process.env[k]));
  logger.debug('Optional variables:', optional.filter(k => process.env[k]));
}

/**
 * Get environment with defaults
 * @returns {Object} Environment configuration
 */
function getEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DEBUG: process.env.DEBUG === '1' || process.env.DEBUG === 'true',
    VERBOSE: process.env.VERBOSE === '1' || process.env.VERBOSE === 'true',
    DEPLOYED_AT: process.env.DEPLOYED_AT || new Date().toISOString()
  };
}

module.exports = {
  validateEnv,
  getEnv
};
