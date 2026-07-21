import fp from 'fastify-plugin';
import { ApplicationManager } from '../../auto-apply/application-manager.js';
import { SecretsClient } from '../../shared/clients/secrets/index.js';
import { createApplicationService } from '../../shared/services/applications/application-service.js';
import { createStatsService } from '../../shared/services/stats/stats-service.js';
import { UnifiedJobCrawler } from '../../crawlers/unified/unified-job-crawler.js';
import { AutoApplier } from '../../auto-apply/auto-applier.js';
import { ProfileAggregator } from '../../shared/services/profile/index.js';
import { SessionManager } from '../../shared/services/session/index.js';
import { createAuthService } from '../../shared/services/auth/auth-service.js';
import { D1Client } from '../../shared/clients/d1/index.js';
import { CloudflareAnalyticsService } from '../../shared/services/analytics/cloudflare-analytics.js';
import { ApplicationAnalytics } from '../../shared/services/analytics/application-analytics.js';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/index.js';

const SESSION_TTL = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

async function servicesPlugin(fastify) {
  const secretsClient = SecretsClient.fromEnv();
  const appManager = new ApplicationManager();
  const applicationService = createApplicationService({ manager: appManager });
  const statsService = createStatsService({ appService: applicationService });
  const crawler = new UnifiedJobCrawler({ secretsClient });
  const autoApplier = new AutoApplier({ secretsClient, dryRun: true });
  const sessionStore = SessionManager.getInstance();
  const profileAggregator = new ProfileAggregator(crawler.crawlers, { sessionStore });
  const d1Client = new D1Client();
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const cloudflareAnalytics = new CloudflareAnalyticsService({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiKey: process.env.CLOUDFLARE_API_KEY,
    fetchFn: globalThis.fetch,
  });
  const applicationAnalytics = new ApplicationAnalytics({ applicationService });

  const authService = createAuthService({
    googleClientId: config.googleClientId,
    adminEmail: config.adminEmail,
    sessionTTL: config.sessionTTL,
    logger: fastify.log,
    store: {
      sessions: fastify.sessions,
      csrfTokens: fastify.csrfTokens,
    },
    sessionStore,
  });

  fastify.decorate('secretsClient', secretsClient);
  fastify.decorate('appManager', appManager);
  fastify.decorate('applicationService', applicationService);
  fastify.decorate('statsService', statsService);
  fastify.decorate('crawler', crawler);
  fastify.decorate('autoApplier', autoApplier);
  fastify.decorate('sessionStore', sessionStore);
  fastify.decorate('profileAggregator', profileAggregator);
  fastify.decorate('d1Client', d1Client);
  fastify.decorate('googleClient', googleClient);
  fastify.decorate('authService', authService);
  fastify.decorate('cloudflareAnalytics', cloudflareAnalytics);
  fastify.decorate('applicationAnalytics', applicationAnalytics);

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of fastify.sessions) {
      if (now > session.expiresAt) fastify.sessions.delete(id);
    }
    for (const [id, data] of fastify.csrfTokens) {
      if (now - data.createdAt > SESSION_TTL) fastify.csrfTokens.delete(id);
    }
  }, CLEANUP_INTERVAL);

  fastify.addHook('onClose', () => clearInterval(cleanupTimer));

  fastify.log.info(
    'Services plugin initialized (SecretsClient, ApplicationManager, ApplicationService, StatsService, UnifiedJobCrawler, AutoApplier, SessionStore, ProfileAggregator, D1Client, GoogleClient, AuthService, CloudflareAnalytics, ApplicationAnalytics)'
  );
}

export default fp(servicesPlugin, { name: 'services' });
