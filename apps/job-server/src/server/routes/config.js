import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const configPath = join(__dirname, '..', '..', '..', 'config.json');

function getDefaultConfig() {
  return {
    autoApply: {
      enabled: false,
      maxDailyApplications: 10,
      minMatchScore: 60,
      excludeCompanies: [],
      preferredCompanies: [],
    },
    notifications: {
      email: { enabled: false, address: '' },
    },
    schedule: { enabled: false },
  };
}

/**
 * @typedef {ReturnType<typeof getDefaultConfig>} ServerConfig
 */

/**
 * @param {{ error: (...args: unknown[]) => void }} [logger]
 * @returns {ServerConfig | Record<string, unknown>}
 */
function loadConfig(logger = console) {
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) {
      logger.error('Failed to parse config file:', e);
      return getDefaultConfig();
    }
  }
  return getDefaultConfig();
}

/**
 * @param {Record<string, unknown>} config
 */
function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function configRoutes(fastify) {
  fastify.get('/', async () => {
    return loadConfig(fastify.log);
  });

  fastify.put(
    '/',
    async (
      /** @type {import('fastify').FastifyRequest<{ Body: Record<string, unknown> }>} */ request
    ) => {
      const newConfig = request.body;
      saveConfig(newConfig);
      return { success: true };
    }
  );
}
