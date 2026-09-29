/**
 * Worker bindings the dashboard entry hands to every consumer. Each consumer
 * declares the binding contract it needs, so the env has to meet all of them
 * (every binding named here is bound in wrangler.jsonc).
 *
 * @typedef {Parameters<typeof import('@resume/shared/logger').default.create>[0]
 *   & NonNullable<Parameters<typeof import('./middleware/cors.js').addCorsHeaders>[2]>
 *   & NonNullable<
 *     Parameters<typeof import('@resume/shared/rate-limit').checkKvSlidingWindowRateLimit>[2]
 *   >
 *   & NonNullable<Parameters<typeof import('./services/auth.js').verifyAdminAuth>[1]>
 *   & Parameters<typeof import('./services/auth.js').verifyWebhookSignature>[1]
 *   & ConstructorParameters<typeof import('./handlers/auth.js').AuthHandler>[0]
 *   & {
 *     JOB_DB: ConstructorParameters<typeof import('./handlers/applications/index.js').ApplicationsHandler>[0]
 *       & ConstructorParameters<typeof import('./handlers/stats.js').StatsHandler>[0];
 *   }
 *   & ConstructorParameters<typeof import('./handlers/webhooks.js').WebhookHandler>[0]
 *   & ConstructorParameters<typeof import('./handlers/auto-apply/handler.js').AutoApplyHandler>[0]
 *   & ConstructorParameters<typeof import('./handlers/diagnostics.js').DiagnosticsHandler>[0]
 *   & ConstructorParameters<typeof import('./handlers/resume-master-handler.js').ResumeMasterHandler>[0]
 *   & Parameters<typeof import('./routes/health.js').registerHealthRoutes>[1]['env']
 *   & Parameters<typeof import('./routes/auth.js').registerAuthRoutes>[1]['env']
 *   & Parameters<typeof import('./routes/workflows.js').registerWorkflowRoutes>[1]['env']
 *   & Parameters<typeof import('./routes/admin.js').registerAdminRoutes>[1]['env']
 *   & ConstructorParameters<typeof import('./queues/queue-consumer.js').QueueConsumer>[0]
 *   & Parameters<typeof import('./handlers/scheduled/cron-router.js').scheduled>[1]} DashboardEnv
 *
 * @typedef {{ waitUntil(promise: Promise<unknown>): void }} DashboardContext
 *
 * @typedef {{
 *   fetch(request: Request, env: DashboardEnv, ctx: DashboardContext): Promise<Response>;
 *   queue(
 *     batch: Parameters<import('./queues/queue-consumer.js').QueueConsumer['processBatch']>[0],
 *     env: DashboardEnv,
 *     ctx: DashboardContext
 *   ): Promise<void>;
 *   scheduled(
 *     controller: Parameters<typeof import('./handlers/scheduled/cron-router.js').scheduled>[0],
 *     env: DashboardEnv,
 *     ctx: DashboardContext
 *   ): Promise<void>;
 * }} DashboardWorker
 */

export {};
