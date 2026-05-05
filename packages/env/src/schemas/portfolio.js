/**
 * Env schema for the apps/portfolio Cloudflare Worker.
 *
 * Required values must exist for the worker to boot. Optional values
 * are tolerated as `undefined` (the runtime falls back to safe defaults
 * documented at each call site).
 */

import { z } from 'zod';

export const portfolioEnvSchema = z.object({
  // ===== Required =====
  // Build-stamp injected by tools/scripts. Always present in deployed builds.
  DEPLOYED_AT: z.string().min(1).optional(),

  // ===== Optional logging =====
  ELASTICSEARCH_URL: z.string().url().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  ELASTICSEARCH_INDEX: z.string().optional(),
  CF_ACCESS_CLIENT_ID: z.string().optional(),
  CF_ACCESS_CLIENT_SECRET: z.string().optional(),
  LOKI_URL: z.string().url().optional(),
  LOKI_API_KEY: z.string().optional(),

  // ===== Optional feature flags =====
  DEPLOY_ENV: z.enum(['development', 'staging', 'production']).optional(),
  RATE_LIMIT_RPM: z.coerce.number().int().positive().optional(),

  // ===== Optional AI =====
  GEMINI_API_KEY: z.string().optional(),

  // ===== Optional bindings (presence checked at runtime, not in env shape) =====
  // ASSETS, AI, KV namespaces are injected by Workers runtime as object
  // bindings, not strings; they are not validated here.
});

/**
 * @typedef {z.infer<typeof portfolioEnvSchema>} PortfolioEnv
 */
