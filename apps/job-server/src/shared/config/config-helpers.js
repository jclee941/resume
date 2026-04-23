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

const ENV_MAPPINGS = {
  AUTO_APPLY_MAX_DAILY: { path: 'limits.maxDaily', parser: parseInteger },
  AUTO_APPLY_REVIEW_THRESHOLD: { path: 'thresholds.review', parser: parseNumber },
  AUTO_APPLY_AUTO_THRESHOLD: { path: 'thresholds.autoApply', parser: parseNumber },
  TELEGRAM_BOT_TOKEN: { path: 'notifications.telegram.botToken', parser: parseString },
  TELEGRAM_CHAT_ID: { path: 'notifications.telegram.chatId', parser: parseString },
  CLAUDE_API_KEY: { path: 'ai.apiKey', parser: parseString },
};

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

  if (isPlainObject(rawConfig.thresholds)) normalized.thresholds = { ...rawConfig.thresholds };
  if (isPlainObject(rawConfig.limits)) normalized.limits = { ...rawConfig.limits };
  if (isPlainObject(rawConfig.ai)) normalized.ai = { ...rawConfig.ai };
  if (isPlainObject(rawConfig.approval)) normalized.approval = { ...rawConfig.approval };
  if (isPlainObject(rawConfig.retry)) normalized.retry = { ...rawConfig.retry };
  if (isPlainObject(rawConfig.notifications)) {
    normalized.notifications = { ...rawConfig.notifications };
  }
  if (isPlainObject(rawConfig.platforms)) normalized.platforms = { ...rawConfig.platforms };

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

export {
  isPlainObject,
  deepClone,
  deepMerge,
  parseString,
  parseNumber,
  parseInteger,
  getAtPath,
  setAtPath,
  collectEnvOverrides,
  normalizeLegacyConfig,
};
