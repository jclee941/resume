import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));
const DEFAULT_CONFIG_PATH = resolve(MODULE_DIR, '../../../config.json');
const DEFAULT_CONFIG = {
  thresholds: {
    review: 60,
    autoApply: 75,
    minMatch: 60,
  },
  limits: {
    maxDaily: 10,
    maxPerPlatform: {
      wanted: 5,
      jobkorea: 3,
      saramin: 2,
    },
    delayBetweenApps: 5000,
  },
  ai: {
    enabled: true,
    batchSize: 5,
    cacheTtl: 24,
    minConfidence: 0.7,
    apiKey: null,
  },
  approval: {
    timeoutHours: 24,
    reminderIntervalHours: 6,
    maxReminders: 3,
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    circuit: {
      failureThreshold: 5,
      resetTimeout: 60000,
    },
  },
  notifications: {
    telegram: {
      enabled: true,
      rateLimitPerMinute: 20,
      botToken: null,
      chatId: null,
    },
    n8n: {
      enabled: false,
      webhookUrl: null,
    },
  },
  platforms: {
    wanted: { enabled: true, priority: 1 },
    jobkorea: { enabled: true, priority: 2 },
    saramin: { enabled: true, priority: 3 },
    linkedin: { enabled: false, priority: 4 },
  },
};

const ENV_MAPPINGS = {
  AUTO_APPLY_MAX_DAILY: { path: 'limits.maxDaily', parser: parseInteger },
  AUTO_APPLY_REVIEW_THRESHOLD: { path: 'thresholds.review', parser: parseNumber },
  AUTO_APPLY_AUTO_THRESHOLD: { path: 'thresholds.autoApply', parser: parseNumber },
  TELEGRAM_BOT_TOKEN: { path: 'notifications.telegram.botToken', parser: parseString },
  TELEGRAM_CHAT_ID: { path: 'notifications.telegram.chatId', parser: parseString },
  CLAUDE_API_KEY: { path: 'ai.apiKey', parser: parseString },
};
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(...sources) {
  const result = {};

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      if (isPlainObject(value) && isPlainObject(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else if (isPlainObject(value)) {
        result[key] = deepMerge({}, value);
      } else {
        result[key] = deepClone(value);
      }
    }
  }

  return result;
}

function parseString(value) {
  return value === undefined || value === null || value === '' ? null : String(value);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getAtPath(object, path) {
  if (!path) return object;

  const parts = path.split('.').filter(Boolean);
  let current = object;

  for (const part of parts) {
    if (!isPlainObject(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function setAtPath(object, path, value) {
  const parts = path.split('.').filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Path cannot be empty');
  }

  let current = object;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!isPlainObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[parts[parts.length - 1]] = value;
}

function collectEnvOverrides(env = process.env) {
  const overrides = {};

  for (const [envName, mapping] of Object.entries(ENV_MAPPINGS)) {
    const raw = env?.[envName];
    if (raw === undefined) continue;

    const parsed = mapping.parser(raw);
    if (parsed === undefined) continue;

    setAtPath(overrides, mapping.path, parsed);
  }

  return overrides;
}

function normalizeLegacyConfig(rawConfig) {
  if (!isPlainObject(rawConfig)) {
    return {};
  }

  const normalized = {};

  if (isPlainObject(rawConfig.thresholds)) {
    normalized.thresholds = { ...rawConfig.thresholds };
  }
  if (isPlainObject(rawConfig.limits)) {
    normalized.limits = { ...rawConfig.limits };
  }
  if (isPlainObject(rawConfig.ai)) {
    normalized.ai = { ...rawConfig.ai };
  }
  if (isPlainObject(rawConfig.approval)) {
    normalized.approval = { ...rawConfig.approval };
  }
  if (isPlainObject(rawConfig.retry)) {
    normalized.retry = { ...rawConfig.retry };
  }
  if (isPlainObject(rawConfig.notifications)) {
    normalized.notifications = { ...rawConfig.notifications };
  }
  if (isPlainObject(rawConfig.platforms)) {
    normalized.platforms = { ...rawConfig.platforms };
  }

  if (isPlainObject(rawConfig.autoApply)) {
    const { autoApply } = rawConfig;
    normalized.thresholds = deepMerge(normalized.thresholds, {
      minMatch: autoApply.minMatchScore,
    });
    normalized.limits = deepMerge(normalized.limits, {
      maxDaily: autoApply.maxDailyApplications,
    });
  }

  return normalized;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isValidBoolean(value) {
  return typeof value === 'boolean';
}

export class AutoApplyConfig {
  #config;
  #runtimeOverrides;
  #configPath;
  #env;
  #logger;
  #loaded;

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
      const error = new Error(`Invalid auto-apply configuration: ${validation.errors.join('; ')}`);
      error.validationErrors = validation.errors;
      throw error;
    }

    this.#config = merged;
    this.#loaded = true;
    return this.toJSON();
  }

  get(path = '', fallbackValue = undefined) {
    if (!this.#loaded) {
      this.load();
    }

    const value = getAtPath(this.#config, path);
    return value === undefined ? fallbackValue : deepClone(value);
  }

  set(path, value) {
    if (typeof path !== 'string' || path.trim() === '') {
      throw new Error('set(path, value) requires a non-empty path string');
    }

    if (!this.#loaded) {
      this.load();
    }

    const currentSnapshot = this.toJSON();
    const overridesSnapshot = deepClone(this.#runtimeOverrides);

    try {
      setAtPath(this.#config, path, value);
      setAtPath(this.#runtimeOverrides, path, value);

      const validation = this.validate(this.#config);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      return this.get(path);
    } catch (error) {
      this.#config = currentSnapshot;
      this.#runtimeOverrides = overridesSnapshot;
      throw new Error(`Failed to set config path "${path}": ${error.message}`);
    }
  }

  update(updates = {}) {
    if (!isPlainObject(updates)) {
      throw new Error('update(updates) requires a plain object');
    }

    if (!this.#loaded) {
      this.load();
    }

    const currentSnapshot = this.toJSON();
    const overridesSnapshot = deepClone(this.#runtimeOverrides);

    try {
      this.#config = deepMerge(this.#config, updates);
      this.#runtimeOverrides = deepMerge(this.#runtimeOverrides, updates);

      const validation = this.validate(this.#config);
      if (!validation.valid) {
        throw new Error(validation.errors.join('; '));
      }

      return this.toJSON();
    } catch (error) {
      this.#config = currentSnapshot;
      this.#runtimeOverrides = overridesSnapshot;
      throw new Error(`Failed to update config: ${error.message}`);
    }
  }

  validate(candidateConfig = this.#config) {
    const config = candidateConfig || this.#config;
    const errors = [];

    const ensureRange = (value, min, max, label) => {
      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${label} must be a number between ${min} and ${max}`);
      }
    };

    ensureRange(config.thresholds?.review, 0, 100, 'thresholds.review');
    ensureRange(config.thresholds?.autoApply, 0, 100, 'thresholds.autoApply');
    ensureRange(config.thresholds?.minMatch, 0, 100, 'thresholds.minMatch');

    if (
      Number.isFinite(config.thresholds?.review) &&
      Number.isFinite(config.thresholds?.autoApply)
    ) {
      if (config.thresholds.review > config.thresholds.autoApply) {
        errors.push('thresholds.review cannot be greater than thresholds.autoApply');
      }
    }

    if (!isPositiveInteger(config.limits?.maxDaily)) {
      errors.push('limits.maxDaily must be a positive integer');
    }
    if (!isPositiveInteger(config.limits?.delayBetweenApps)) {
      errors.push('limits.delayBetweenApps must be a positive integer (milliseconds)');
    }

    if (!isPlainObject(config.limits?.maxPerPlatform)) {
      errors.push('limits.maxPerPlatform must be an object');
    } else {
      for (const [platform, limit] of Object.entries(config.limits.maxPerPlatform)) {
        if (!isNonNegativeInteger(limit)) {
          errors.push(`limits.maxPerPlatform.${platform} must be a non-negative integer`);
        }
      }
    }

    if (!isValidBoolean(config.ai?.enabled)) {
      errors.push('ai.enabled must be boolean');
    }
    if (!isPositiveInteger(config.ai?.batchSize)) {
      errors.push('ai.batchSize must be a positive integer');
    }
    if (!isPositiveInteger(config.ai?.cacheTtl)) {
      errors.push('ai.cacheTtl must be a positive integer (hours)');
    }
    ensureRange(config.ai?.minConfidence, 0, 1, 'ai.minConfidence');

    if (!isPositiveInteger(config.approval?.timeoutHours)) {
      errors.push('approval.timeoutHours must be a positive integer');
    }
    if (!isPositiveInteger(config.approval?.reminderIntervalHours)) {
      errors.push('approval.reminderIntervalHours must be a positive integer');
    }
    if (!isNonNegativeInteger(config.approval?.maxReminders)) {
      errors.push('approval.maxReminders must be a non-negative integer');
    }

    if (!isNonNegativeInteger(config.retry?.maxRetries)) {
      errors.push('retry.maxRetries must be a non-negative integer');
    }
    if (!isPositiveInteger(config.retry?.baseDelay)) {
      errors.push('retry.baseDelay must be a positive integer');
    }
    if (!isPositiveInteger(config.retry?.maxDelay)) {
      errors.push('retry.maxDelay must be a positive integer');
    }
    if (
      Number.isFinite(config.retry?.baseDelay) &&
      Number.isFinite(config.retry?.maxDelay) &&
      config.retry.baseDelay > config.retry.maxDelay
    ) {
      errors.push('retry.baseDelay cannot be greater than retry.maxDelay');
    }

    if (!isPlainObject(config.retry?.circuit)) {
      errors.push('retry.circuit must be an object');
    } else {
      if (!isPositiveInteger(config.retry.circuit.failureThreshold)) {
        errors.push('retry.circuit.failureThreshold must be a positive integer');
      }
      if (!isPositiveInteger(config.retry.circuit.resetTimeout)) {
        errors.push('retry.circuit.resetTimeout must be a positive integer (ms)');
      }
    }

    if (!isPlainObject(config.notifications?.telegram)) {
      errors.push('notifications.telegram must be an object');
    } else {
      if (!isValidBoolean(config.notifications.telegram.enabled)) {
        errors.push('notifications.telegram.enabled must be boolean');
      }
      if (!isPositiveInteger(config.notifications.telegram.rateLimitPerMinute)) {
        errors.push('notifications.telegram.rateLimitPerMinute must be a positive integer');
      }
    }

    if (!isPlainObject(config.notifications?.n8n)) {
      errors.push('notifications.n8n must be an object');
    } else {
      if (!isValidBoolean(config.notifications.n8n.enabled)) {
        errors.push('notifications.n8n.enabled must be boolean');
      }
      const webhookUrl = config.notifications.n8n.webhookUrl;
      const validWebhookType = webhookUrl === null || typeof webhookUrl === 'string';
      if (!validWebhookType) {
        errors.push('notifications.n8n.webhookUrl must be a string or null');
      }
      if (
        config.notifications.n8n.enabled &&
        (typeof webhookUrl !== 'string' || webhookUrl.trim() === '')
      ) {
        errors.push('notifications.n8n.webhookUrl is required when notifications.n8n.enabled=true');
      }
    }

    if (!isPlainObject(config.platforms)) {
      errors.push('platforms must be an object');
    } else {
      const priorities = [];
      for (const [platform, settings] of Object.entries(config.platforms)) {
        if (!isPlainObject(settings)) {
          errors.push(`platforms.${platform} must be an object`);
          continue;
        }
        if (!isValidBoolean(settings.enabled)) {
          errors.push(`platforms.${platform}.enabled must be boolean`);
        }
        if (!isPositiveInteger(settings.priority)) {
          errors.push(`platforms.${platform}.priority must be a positive integer`);
        } else {
          priorities.push(settings.priority);
        }
      }

      const uniqueCount = new Set(priorities).size;
      if (uniqueCount !== priorities.length) {
        errors.push('platform priorities must be unique');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  toJSON() {
    if (!this.#loaded) {
      this.load();
    }
    return deepClone(this.#config);
  }

  #loadFromFile() {
    if (!existsSync(this.#configPath)) {
      return {};
    }

    try {
      const raw = JSON.parse(readFileSync(this.#configPath, 'utf-8'));
      return normalizeLegacyConfig(raw);
    } catch (error) {
      this.#logger.error('Failed to load auto-apply config file:', error);
      return {};
    }
  }
}

export function createAutoApplyConfig(options = {}) {
  return new AutoApplyConfig(options);
}
export const autoApplyConfig = new AutoApplyConfig();
export default autoApplyConfig;
