/**
 * Env schema for the apps/job-server Node.js MCP runtime.
 *
 * Required values cause boot failure when absent.
 */

import { z } from 'zod';

export const jobServerEnvSchema = z.object({
  // ===== Required at runtime, but tolerated for tests =====
  SESSION_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'must be a 64-character hex string')
    .optional(),

  // ===== Optional logging =====
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  // ===== Wanted platform =====
  WANTED_USER_AGENT: z.string().optional(),

  // ===== GitLab integration (homelab) =====
  GITLAB_URL: z.string().url().optional(),
  GITLAB_OAUTH_APP_ID: z.string().optional(),
  GITLAB_OAUTH_CLIENT_SECRET: z.string().optional(),

  // ===== AI =====
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // ===== Test environment toggles =====
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

/**
 * @typedef {z.infer<typeof jobServerEnvSchema>} JobServerEnv
 */
