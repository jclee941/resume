/**
 * MCP Tool: Authentication
 * Backward-compatible barrel for Wanted authentication helpers.
 */

export { authTool } from './auth/auth-tool.js';
export * from './auth/handlers.js';
export * from './auth/session-actions.js';
export * from './auth/credential-actions.js';
export * from './auth/cookie-utils.js';

export { authTool as default } from './auth/auth-tool.js';
