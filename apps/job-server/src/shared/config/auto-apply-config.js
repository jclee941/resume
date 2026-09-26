import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  collectEnvOverrides,
  deepClone,
  deepMerge,
  getAtPath,
  isPlainObject,
  normalizeLegacyConfig,
  setAtPath,
} from './config-helpers.js';
import { validateAutoApplyConfig } from './config-validation.js';

const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(MODULE_DIR, '../../../config.json');
const DEFAULT_CONFIG = {
  thresholds: { review: 60, autoApply: 75, minMatch: 60 },
  limits: {
    maxDaily: 10,
    maxPerPlatform: { wanted: 5, jobkorea: 3, saramin: 2 },
    delayBetweenApps: 5000,
  },
  ai: { enabled: true, batchSize: 5, cacheTtl: 24, minConfidence: 0.7, apiKey: null },
  approval: { timeoutHours: 24, reminderIntervalHours: 6, maxReminders: 3 },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    circuit: { failureThreshold: 5, resetTimeout: 60000 },
  },
  notifications: {
    telegram: { enabled: true, rateLimitPerMinute: 20, botToken: null, chatId: null },
    webhook: { enabled: false, url: null },
  },
  platforms: {
    wanted: { enabled: true, priority: 1 },
    jobkorea: { enabled: true, priority: 2 },
    saramin: { enabled: true, priority: 3 },
    linkedin: { enabled: false, priority: 4 },
  },
};

/**
 * @typedef {{ configPath?: string; env?: Record<string, string | undefined>; logger?: Pick<Console, 'error'> }} AutoApplyConfigOptions
 * @typedef {import('./config-validation.js').CandidateConfig} AutoApplyConfigData
 */
export class AutoApplyConfig {
  /** @type {AutoApplyConfigData} */
  #config;
  #runtimeOverrides;
  #configPath;
  #env;
  #logger;
  #loaded;

  /** @param {AutoApplyConfigOptions} [options] */
  constructor(options = {}) {
    this.#configPath = options.configPath || DEFAULT_CONFIG_PATH;
    this.#env = options.env || process.env;
    this.#logger = options.logger || console;
    this.#runtimeOverrides = {};
    this.#config = deepClone(DEFAULT_CONFIG);
    this.#loaded = false;
  }

  load() {
    const fileConfig = this.#loadFromFile();
    const envOverrides = collectEnvOverrides(this.#env);
    const merged = deepMerge(DEFAULT_CONFIG, fileConfig, envOverrides, this.#runtimeOverrides);
    const validation = this.validate(merged);

    if (!validation.valid) {
      /** @type {Error & { validationErrors?: string[] }} */
      const error = new Error(`Invalid auto-apply configuration: ${validation.errors.join('; ')}`);
      error.validationErrors = validation.errors;
      throw error;
    }

    this.#config = /** @type {AutoApplyConfigData} */ (merged);
    this.#loaded = true;
    return this.toJSON();
  }

  /**
   * @param {string} [path]
   * @param {unknown} [fallbackValue]
   */
  get(path = '', fallbackValue = undefined) {
    if (!this.#loaded) this.load();
    const value = getAtPath(this.#config, path);
    return value === undefined ? fallbackValue : deepClone(value);
  }

  /**
   * @param {string} path
   * @param {unknown} value
   */
  set(path, value) {
    if (typeof path !== 'string' || path.trim() === '') {
      throw new Error('set(path, value) requires a non-empty path string');
    }

    if (!this.#loaded) this.load();

    const currentSnapshot = this.toJSON();
    const overridesSnapshot = deepClone(this.#runtimeOverrides);

    try {
      setAtPath(this.#config, path, value);
      setAtPath(this.#runtimeOverrides, path, value);
      const validation = this.validate(this.#config);
      if (!validation.valid) throw new Error(validation.errors.join('; '));
      return this.get(path);
    } catch (error) {
      this.#config = currentSnapshot;
      this.#runtimeOverrides = overridesSnapshot;
      throw new Error(
        `Failed to set config path "${path}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  /** @param {Record<string, unknown>} [updates] */
  update(updates = {}) {
    if (!isPlainObject(updates)) {
      throw new Error('update(updates) requires a plain object');
    }

    if (!this.#loaded) this.load();

    const currentSnapshot = this.toJSON();
    const overridesSnapshot = deepClone(this.#runtimeOverrides);

    try {
      this.#config = /** @type {AutoApplyConfigData} */ (deepMerge(this.#config, updates));
      this.#runtimeOverrides = deepMerge(this.#runtimeOverrides, updates);
      const validation = this.validate(this.#config);
      if (!validation.valid) throw new Error(validation.errors.join('; '));
      return this.toJSON();
    } catch (error) {
      this.#config = currentSnapshot;
      this.#runtimeOverrides = overridesSnapshot;
      throw new Error(
        `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error }
      );
    }
  }

  /** @param {Record<string, unknown>} [candidateConfig] */
  validate(candidateConfig = this.#config) {
    return validateAutoApplyConfig(
      /** @type {import('./config-validation.js').CandidateConfig} */ (
        candidateConfig || this.#config
      )
    );
  }

  toJSON() {
    if (!this.#loaded) this.load();
    return deepClone(this.#config);
  }

  #loadFromFile() {
    if (!existsSync(this.#configPath)) return {};

    try {
      const raw = JSON.parse(readFileSync(this.#configPath, 'utf-8'));
      return normalizeLegacyConfig(raw);
    } catch (error) {
      this.#logger.error('Failed to load auto-apply config file:', error);
      return {};
    }
  }
}

/** @param {AutoApplyConfigOptions} [options] */
export function createAutoApplyConfig(options = {}) {
  return new AutoApplyConfig(options);
}

export const autoApplyConfig = new AutoApplyConfig();
export default autoApplyConfig;
