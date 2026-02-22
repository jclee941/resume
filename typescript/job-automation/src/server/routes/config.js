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
      slack: { enabled: false, webhookUrl: '' },
      email: { enabled: false, address: '' },
    },
    schedule: { enabled: false },
  };
}

function loadConfig() {
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
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
    return loadConfig();
  });

  fastify.put('/', async (request) => {
    const newConfig = request.body;
    saveConfig(newConfig);
    return { success: true };
  });
}
