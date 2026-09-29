/** Cloudflare-native console transport: Workers Logs persists console output. */

/**
 * @typedef {Object} ConsoleEntry
 * @property {string} level
 * @property {string} message
 * @property {string} [service]
 * @property {Record<string, unknown>} [labels]
 */

/**
 * @returns {{ name: string, send: (entry: ConsoleEntry) => void }}
 */
export function createConsoleTransport() {
  return {
    name: 'console',

    /** @param {ConsoleEntry} entry */
    send(entry) {
      if (entry.level === 'DEBUG') console.debug(serialize(entry));
      else if (entry.level === 'INFO') console.log(serialize(entry));
      else if (entry.level === 'WARN') console.warn(serialize(entry));
    },
  };
}

/**
 * @param {ConsoleEntry} entry
 * @returns {string}
 */
function serialize(entry) {
  return JSON.stringify({
    level: entry.level,
    service: entry.service,
    message: entry.message,
    ...entry.labels,
  });
}

export default createConsoleTransport;
