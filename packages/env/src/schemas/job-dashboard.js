/**
 * Env schema for the apps/job-dashboard Cloudflare Worker.
 *
 * Authoritative list of required + optional env vars. Boot fails (via
 * @resume/env's validateEnv) when a required value is missing.
 */

import { z } from 'zod';

export const jobDashboardEnvSchema = z.object({
  // ===== Required =====
  // Used to sign / decrypt session payloads. 32 raw bytes encoded as base64.
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),

  // ===== Optional logging =====
  LOKI_URL: z.string().url().optional(),
  LOKI_API_KEY: z.string().optional(),
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  // ===== Optional Google OAuth (only required when /api/auth/login is in use) =====
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  TEST_GOOGLE_ALLOWED_EMAILS: z.string().optional(),

  // ===== Optional webhook =====
  WEBHOOK_SECRET: z.string().optional(),

  // ===== Test-only bypass (refused unless explicitly set) =====
  ENABLE_TEST_AUTH_MOCK: z.enum(['1', 'true']).optional(),

  // ===== Bindings are object-typed; not validated here =====
});

/**
 * @typedef {z.infer<typeof jobDashboardEnvSchema>} JobDashboardEnv
 */
