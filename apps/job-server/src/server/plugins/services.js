import fp from 'fastify-plugin';
import { ApplicationManager } from '../../auto-apply/application-manager.js';
import { SecretsClient } from '../../shared/clients/secrets/index.js';
import { UnifiedJobCrawler } from '../../crawlers/index.js';
import { AutoApplier } from '../../auto-apply/auto-applier.js';
import { ProfileAggregator } from '../../shared/services/profile/index.js';
import { D1Client } from '../../shared/clients/d1/index.js';
import { OAuth2Client } from 'google-auth-library';

const SESSION_TTL = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

async function servicesPlugin(fastify) {
  const secretsClient = SecretsClient.fromEnv();
  const appManager = new ApplicationManager();
  const crawler = new UnifiedJobCrawler({ secretsClient });
  const autoApplier = new AutoApplier({ secretsClient, dryRun: true });
  const profileAggregator = new ProfileAggregator(crawler.crawlers);
  const d1Client = new D1Client();
  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const authSessions = new Map();
  const csrfTokens = new Map();

  fastify.decorate('secretsClient', secretsClient);
  fastify.decorate('appManager', appManager);
  fastify.decorate('crawler', crawler);
  fastify.decorate('autoApplier', autoApplier);
  fastify.decorate('profileAggregator', profileAggregator);
  fastify.decorate('d1Client', d1Client);
  fastify.decorate('googleClient', googleClient);
  fastify.decorate('authSessions', authSessions);
  fastify.decorate('csrfTokens', csrfTokens);

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of authSessions) {
      if (now > session.expiresAt) authSessions.delete(id);
    }
    for (const [id, data] of csrfTokens) {
      if (now - data.createdAt > SESSION_TTL) csrfTokens.delete(id);
    }
  }, CLEANUP_INTERVAL);

  fastify.addHook('onClose', () => clearInterval(cleanupTimer));

  fastify.log.info(
    'Services plugin initialized (SecretsClient, ApplicationManager, UnifiedJobCrawler, AutoApplier, ProfileAggregator, D1Client, GoogleClient)',
  );
}

export default fp(servicesPlugin, { name: 'services' });
