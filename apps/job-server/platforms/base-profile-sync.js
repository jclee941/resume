/**
 * BaseProfileSync — shared contract for all platform profile sync implementations.
 *
 * Subclasses must override:
 *   - init()
 *   - checkLogin()
 *   - waitForManualLogin()
 *   - getProfile()
 *   - close()
 *
 * Subclasses typically override syncProfile() to call section-specific fill methods.
 */
export class BaseProfileSync {
  /**
   * @param {Object} [options]
   * @param {boolean} [options.headless]
   * @param {number} [options.timeout]
   * @param {boolean} [options.debug]
   */
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    /** @type {import('playwright').Browser | null} */
    this.browser = null;
    /** @type {import('playwright').Page | null} */
    this.page = null;
    this.timeout = options.timeout || 30000;
    this.debug = options.debug ?? false;
  }

  /**
   * @param {...unknown} args
   */
  log(...args) {
    if (this.debug) {
      console.debug(`[${this.constructor.name}]`, ...args);
    }
  }

  /**
   * @returns {Promise<unknown>}
   */
  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  /**
   * @returns {Promise<boolean>}
   */
  async checkLogin() {
    throw new Error('checkLogin() must be implemented by subclass');
  }

  /**
   * @returns {Promise<unknown>}
   */
  async waitForManualLogin() {
    throw new Error('waitForManualLogin() must be implemented by subclass');
  }

  /**
   * @returns {Promise<unknown>}
   */
  async getProfile() {
    throw new Error('getProfile() must be implemented by subclass');
  }

  /**
   * @param {unknown} _sourceData
   * @param {Record<string, unknown>} [_options={}]
   * @returns {Promise<unknown>}
   */
  async syncProfile(_sourceData, _options = {}) {
    throw new Error('syncProfile() must be implemented by subclass');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.page = null;
  }
}

/**
 * Compute diff between source (SSoT) and current platform profile.
 * Returns an array of changed sections with before/after values.
 *
 * @param {Record<string, unknown>} source — canonical SSoT resume data
 * @param {Record<string, unknown>} current — platform-specific profile snapshot
 * @returns {Array<{section: string, field: string, from: unknown, to: unknown}>}
 */
export function diffProfileSections(source, current) {
  const changes = [];

  /** @type {Array<{ key: string, label: string, isArray?: boolean, idField?: string, fields?: string[] }>} */
  const sections = [
    { key: 'personal', label: 'personal', fields: ['name', 'email', 'phone'] },
    { key: 'careers', label: 'careers', isArray: true, idField: 'company' },
    { key: 'education', label: 'education', fields: ['school', 'major', 'status'] },
    { key: 'certifications', label: 'certifications', isArray: true, idField: 'name' },
    { key: 'skills', label: 'skills', isArray: true },
  ];

  for (const section of sections) {
    const sourceVal = source[section.key];
    const currentVal = current[section.key];

    if (section.isArray) {
      if (!Array.isArray(sourceVal) && !Array.isArray(currentVal)) continue;
      const sourceArr = Array.isArray(sourceVal) ? sourceVal : [];
      const currentArr = Array.isArray(currentVal) ? currentVal : [];

      if (sourceArr.length !== currentArr.length) {
        changes.push({
          section: section.label,
          field: 'count',
          from: currentArr.length,
          to: sourceArr.length,
        });
        continue;
      }

      for (let i = 0; i < sourceArr.length; i++) {
        const s = /** @type {Record<string, unknown>} */ (sourceArr[i]);
        const c = /** @type {Record<string, unknown> | undefined} */ (currentArr[i]);
        if (section.idField && s[section.idField] !== c?.[section.idField]) {
          changes.push({
            section: section.label,
            field: `${section.idField}[${i}]`,
            from: c?.[section.idField],
            to: s[section.idField],
          });
        }
      }
    } else if (section.fields) {
      for (const field of section.fields) {
        const s = /** @type {Record<string, unknown> | undefined} */ (sourceVal)?.[field];
        const c = /** @type {Record<string, unknown> | undefined} */ (currentVal)?.[field];
        if (s !== c) {
          changes.push({ section: section.label, field, from: c, to: s });
        }
      }
    }
  }

  return changes;
}

export default BaseProfileSync;
