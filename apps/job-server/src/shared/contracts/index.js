export { API_CONTRACTS, COMMON_STATUSES, validateResponse } from './api.js';
export { AUTH_STRATEGY, createAuthMiddleware } from './auth.js';

export const SESSION_CONFIG = {
  TTL_MS: 24 * 60 * 60 * 1000,
  PLATFORMS: ['wanted', 'saramin', 'jobkorea', 'remember', 'linkedin'],
};
