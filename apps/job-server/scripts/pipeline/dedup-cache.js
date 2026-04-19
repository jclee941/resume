import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

import {
  APPLIED_CACHE_TTL_MS,
  DEDUP_CACHE_DIR,
  DEDUP_CACHE_PATH,
  DEDUP_CACHE_VERSION,
  SCORED_CACHE_TTL_MS,
  SCORED_RECENT_WINDOW_MS,
} from './constants.js';
import { isObjectLike } from './job-helpers.js';
import { log, summarizeError } from './logging.js';

export function getDedupKey(job) {
  if (job.source === 'jobkorea') {
    return job.sourceUrl;
  }

  return String(job.id);
}

export function getCrossRunDedupKey(job) {
  if (job.source === 'jobkorea') {
    return `${job.source}:${job.sourceId || job.id}`;
  }

  return `${job.source}:${job.id}`;
}

export function createDedupCache() {
  return {
    version: DEDUP_CACHE_VERSION,
    updatedAt: new Date().toISOString(),
    entries: {},
  };
}

export async function loadDedupCache() {
  try {
    await mkdir(DEDUP_CACHE_DIR, { recursive: true });
    const raw = await readFile(DEDUP_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: DEDUP_CACHE_VERSION,
      updatedAt:
        typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      entries: isObjectLike(parsed?.entries) ? parsed.entries : {},
    };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      log('dedup cache load failed', summarizeError(error));
    }
    return createDedupCache();
  }
}

export function getDedupSkipReason(entry, nowMs) {
  if (!isObjectLike(entry)) return null;

  const expiresAt = Date.parse(entry.expiresAt || '');
  const lastSeenAt = Date.parse(entry.lastSeenAt || '');

  if (entry.status === 'applied' && Number.isFinite(expiresAt) && expiresAt > nowMs) {
    return 'dedup_applied';
  }

  if (
    entry.status === 'scored' &&
    Number.isFinite(lastSeenAt) &&
    nowMs - lastSeenAt < SCORED_RECENT_WINDOW_MS
  ) {
    return 'dedup_scored_recent';
  }

  return null;
}

export function updateDedupEntry(cache, job, status, score, nowMs = Date.now()) {
  if (!isObjectLike(cache.entries)) {
    cache.entries = {};
  }

  const ttlMs = status === 'applied' ? APPLIED_CACHE_TTL_MS : SCORED_CACHE_TTL_MS;
  const nowIso = new Date(nowMs).toISOString();
  cache.entries[getCrossRunDedupKey(job)] = {
    status,
    score: Number.isFinite(score) ? score : Number(score) || 0,
    lastSeenAt: nowIso,
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
  };
  cache.updatedAt = nowIso;
}

export async function saveDedupCache(cache) {
  const nowMs = Date.now();
  const entries = isObjectLike(cache.entries) ? cache.entries : {};
  const prunedEntries = Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => {
      const expiresAt = Date.parse(entry?.expiresAt || '');
      return !Number.isFinite(expiresAt) || expiresAt > nowMs;
    })
  );

  const payload = {
    version: DEDUP_CACHE_VERSION,
    updatedAt: new Date(nowMs).toISOString(),
    entries: prunedEntries,
  };

  try {
    await mkdir(DEDUP_CACHE_DIR, { recursive: true });
    const tempPath = `${DEDUP_CACHE_PATH}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await rename(tempPath, DEDUP_CACHE_PATH);
  } catch (error) {
    log('dedup cache save failed', summarizeError(error));
  }
}
