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
  constructor(options = {}) {
    this.headless = options.headless ?? false;
    this.browser = null;
    this.page = null;
    this.timeout = options.timeout || 30000;
    this.debug = options.debug ?? false;
  }

  log(...args) {
    if (this.debug) {
      console.debug(`[${this.constructor.name}]`, ...args);
    }
  }

  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  async checkLogin() {
    throw new Error('checkLogin() must be implemented by subclass');
  }

  async waitForManualLogin() {
    throw new Error('waitForManualLogin() must be implemented by subclass');
  }

  async getProfile() {
    throw new Error('getProfile() must be implemented by subclass');
  }

  async syncProfile(sourceData, _options = {}) {
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
 * @param {object} source — canonical SSoT resume data
 * @param {object} current — platform-specific profile snapshot
 * @returns {Array<{section: string, field: string, from: any, to: any}>}
 */
export function diffProfileSections(source, current) {
  const changes = [];

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
        const s = sourceArr[i];
        const c = currentArr[i];
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
        const s = sourceVal?.[field];
        const c = currentVal?.[field];
        if (s !== c) {
          changes.push({ section: section.label, field, from: c, to: s });
        }
      }
    }
  }

  return changes;
}

export default BaseProfileSync;
