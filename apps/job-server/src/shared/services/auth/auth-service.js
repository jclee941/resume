/**
 * Framework-agnostic Auth Service barrel.
 * Extracts business logic from server/routes/auth.js and dashboard/routes/auth.js.
 */
export { AuthService } from './auth-service/auth-service-core.js';
export { createAuthService, getAuthService } from './auth-service/factory.js';
export { default } from './auth-service/index.js';
