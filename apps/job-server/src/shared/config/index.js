export { AutoApplyConfig, autoApplyConfig, createAutoApplyConfig } from './auto-apply-config.js';

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
} from './config-helpers.js';

export {
  isPositiveInteger,
  isNonNegativeInteger,
  isValidBoolean,
  validateAutoApplyConfig,
} from './config-validation.js';
