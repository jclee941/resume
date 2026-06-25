import { existsSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { DEFAULT_DATA_DIR, ensureDirSync } from './common.js';
import { MockD1Database } from './d1.js';
import { MockKVNamespace } from './kv.js';
import { MockQueue } from './queue.js';
import { MockR2Bucket } from './r2-bucket.js';

export function createMockEnv(options = {}) {
  const dataDir = options.dataDir || DEFAULT_DATA_DIR;
  ensureDirSync(dataDir);

  const db = new MockD1Database({ filePath: resolve(dataDir, 'd1.sqlite') });
  const sessionsKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-sessions.json') });
  const rateLimitKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-rate-limit.json') });
  const nonceKv = new MockKVNamespace({ filePath: resolve(dataDir, 'kv-nonce.json') });
  const r2 = new MockR2Bucket({ baseDir: resolve(dataDir, 'r2') });
  const queue = new MockQueue({ name: 'crawl-tasks', worker: options.queueWorker });

  const env = {
    DB: db,
    SESSIONS: sessionsKv,
    RATE_LIMIT_KV: rateLimitKv,
    NONCE_KV: nonceKv,
    R2: r2,
    CRAWL_TASKS: queue,
  };

  for (const bindingName of options.kvBindings || []) {
    if (!env[bindingName]) {
      env[bindingName] = new MockKVNamespace({
        filePath: resolve(dataDir, `kv-${bindingName.toLowerCase()}.json`),
      });
    }
  }

  if (options.includeDefaultAliases !== false) {
    env.job_dashboard_db = db;
    env.JOB_DASHBOARD_DB = db;
    env.BUCKET = r2;
  }

  return env;
}

export function resetMockData(dataDir = DEFAULT_DATA_DIR) {
  if (!existsSync(dataDir)) return;
  const entries = readdirSync(dataDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = join(dataDir, entry.name);
    if (entry.isDirectory()) {
      rmSync(target, { recursive: true, force: true });
    } else {
      unlinkSync(target);
    }
  }
}
