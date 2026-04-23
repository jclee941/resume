import { isPlainObject } from './config-helpers.js';

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isValidBoolean(value) {
  return typeof value === 'boolean';
}

function validateAutoApplyConfig(candidateConfig) {
  const config = candidateConfig;
  const errors = [];

  const ensureRange = (value, min, max, label) => {
    if (!Number.isFinite(value) || value < min || value > max) {
      errors.push(`${label} must be a number between ${min} and ${max}`);
    }
  };

  ensureRange(config.thresholds?.review, 0, 100, 'thresholds.review');
  ensureRange(config.thresholds?.autoApply, 0, 100, 'thresholds.autoApply');
  ensureRange(config.thresholds?.minMatch, 0, 100, 'thresholds.minMatch');

  if (Number.isFinite(config.thresholds?.review) && Number.isFinite(config.thresholds?.autoApply)) {
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

export {
  isPositiveInteger,
  isNonNegativeInteger,
  isValidBoolean,
  validateAutoApplyConfig,
};
