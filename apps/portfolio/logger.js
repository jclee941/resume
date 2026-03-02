/**
 * Logger utility for build scripts
 * Suppresses console output during tests while maintaining visibility in production builds
 */

const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';
const IS_VERBOSE =
  process.env.VERBOSE === '1' || process.env.VERBOSE === 'true';

/**
 * Get formatted timestamp
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log message with level and timestamp
 * @param {string} level - Log level
 * @param {...any} args - Arguments to log
 * @returns {any[]} Formatted arguments
 */
function formatMessage(level, ...args) {
  if (IS_VERBOSE) {
    return [`[${getTimestamp()}] [${level}]`, ...args];
  }
  return args;
}

/**
 * Build logger with environment-aware output
 */
const logger = {
  /**
   * Log informational messages
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (!IS_TEST) {
      console.log(...formatMessage('INFO', ...args));
    }
  },

  /**
   * Log error messages (always shown, even in tests)
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    console.error(...formatMessage('ERROR', ...args));
  },

  /**
   * Log warning messages
   * @param {...any} args - Arguments to log
   */
  warn(...args) {
    if (!IS_TEST) {
      console.warn(...formatMessage('WARN', ...args));
    }
  },

  /**
   * Log debug messages (suppressed in test, only shown when DEBUG=1)
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (!IS_TEST && IS_DEBUG) {
      console.debug(...formatMessage('DEBUG', ...args));
    }
  },

  /**
   * Log verbose messages (only shown when VERBOSE=1)
   * @param {...any} args - Arguments to log
   */
  verbose(...args) {
    if (!IS_TEST && IS_VERBOSE) {
      console.log(...formatMessage('VERBOSE', ...args));
    }
  },

  /**
   * Log trace messages (only shown when DEBUG=1 and VERBOSE=1)
   * @param {...any} args - Arguments to log
   */
  trace(...args) {
    if (!IS_TEST && IS_DEBUG && IS_VERBOSE) {
      console.trace(...formatMessage('TRACE', ...args));
    }
  },
};

module.exports = logger;
