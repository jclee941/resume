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

function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export default async function configRoutes(fastify) {
  fastify.get('/', async () => {
    return loadConfig(fastify.log);
  });

  fastify.put('/', async (request) => {
    const newConfig = request.body;
    saveConfig(newConfig);
    return { success: true };
  });
}
