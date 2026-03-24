import assert from 'node:assert/strict';
import { describe, it, beforeEach, mock } from 'node:test';
import {
  readHot,
  readWarm,
  readCold,
  writeHot,
  writeWarm,
  writeCold,
  deleteHot,
  deleteWarm,
  deleteCold,
  ensureD1Schema,
} from '../tier-operations.js';

function createD1Mock(options = {}) {
  const calls = [];
  const d1 = {
    prepare: mock.fn((sql) => {
      calls.push(sql);
      if (options.prepareError && options.prepareError.test(sql)) {
        throw new Error('prepare-failed');
      }

      if (/SELECT value, expires_at/.test(sql)) {
        return {
          bind: mock.fn((...args) => ({
            first: mock.fn(async () => {
              if (options.selectError) {
                throw new Error('select-failed');
              }
              calls.push(args);
              return options.row ?? null;
            }),
          })),
        };
      }

      return {
        bind: mock.fn((...args) => ({
          first: mock.fn(async () => null),
          run: mock.fn(async () => {
            calls.push(args);
            if (options.runError && options.runError.test(sql)) {
              throw new Error('run-failed');
            }
            return { success: true };
          }),
        })),
        run: mock.fn(async () => {
          if (options.runError && options.runError.test(sql)) {
            throw new Error('run-failed');
          }
          return { success: true };
        }),
      };
    }),
  };
  return { d1, calls };
}

describe('tier-operations', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('readHot handles null, miss, invalid object, expired, hit, and errors', async () => {
    const logger = { warn: mock.fn() };

    assert.equal(await readHot(null, 'n:key', Date.now(), logger), null);

    const kv = {
      get: mock.fn(async () => null),
    };
    assert.equal(await readHot(kv, 'n:key', Date.now(), logger), null);

    kv.get.mock.mockImplementation(async () => 'bad');
    assert.equal(await readHot(kv, 'n:key', Date.now(), logger), null);

    kv.get.mock.mockImplementation(async () => ({ expiresAt: Date.now() - 100, value: 1 }));
    assert.equal(await readHot(kv, 'n:key', Date.now(), logger), null);

    const envelope = { expiresAt: Date.now() + 10000, value: { ok: true }, tier: 'hot' };
    kv.get.mock.mockImplementation(async () => envelope);
    assert.deepEqual(await readHot(kv, 'n:key', Date.now(), logger), envelope);

    kv.get.mock.mockImplementation(async () => {
      throw new Error('kv-fail');
    });
    assert.equal(await readHot(kv, 'n:key', Date.now(), logger), null);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('readWarm handles null, schema failure, miss, expired, hit, and errors', async () => {
    const logger = { warn: mock.fn() };

    assert.equal(
      await readWarm(null, 'n:key', Date.now(), 'cache_entries_readwarm_0', logger),
      null
    );

    const schemaFail = createD1Mock({ runError: /CREATE TABLE IF NOT EXISTS/ });
    assert.equal(
      await readWarm(schemaFail.d1, 'n:key', Date.now(), 'cache_entries_readwarm_fail', logger),
      null
    );

    const miss = createD1Mock({ row: null });
    assert.equal(
      await readWarm(miss.d1, 'n:key', Date.now(), 'cache_entries_readwarm_miss', logger),
      null
    );

    const expired = createD1Mock({
      row: {
        value: JSON.stringify({ x: 1 }),
        expires_at: Date.now() - 1,
        created_at: 1,
        updated_at: 2,
        last_accessed_at: 3,
      },
    });
    assert.equal(
      await readWarm(expired.d1, 'n:key', Date.now(), 'cache_entries_readwarm_expired', logger),
      null
    );

    const now = Date.now();
    const hit = createD1Mock({
      row: {
        value: JSON.stringify({ id: 7 }),
        expires_at: now + 10000,
        created_at: now - 100,
        updated_at: now - 50,
        last_accessed_at: now - 10,
      },
    });
    const hitEnvelope = await readWarm(hit.d1, 'n:key', now, 'cache_entries_readwarm_hit', logger);
    assert.deepEqual(hitEnvelope, {
      value: { id: 7 },
      tier: 'warm',
      expiresAt: now + 10000,
      createdAt: now - 100,
      updatedAt: now - 50,
      lastAccessedAt: now - 10,
    });

    const selectError = createD1Mock({ selectError: true });
    assert.equal(
      await readWarm(
        selectError.d1,
        'n:key',
        Date.now(),
        'cache_entries_readwarm_selecterr',
        logger
      ),
      null
    );
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('readCold handles null, miss, expired, hit, and errors', async () => {
    const logger = { warn: mock.fn() };

    assert.equal(await readCold(null, 'n/key.json', Date.now(), logger), null);

    const r2 = {
      get: mock.fn(async () => null),
    };
    assert.equal(await readCold(r2, 'n/key.json', Date.now(), logger), null);

    r2.get.mock.mockImplementation(async () => ({
      json: async () => ({ expiresAt: Date.now() - 1, value: 1, tier: 'cold' }),
    }));
    assert.equal(await readCold(r2, 'n/key.json', Date.now(), logger), null);

    r2.get.mock.mockImplementation(async () => ({
      json: async () => ({ expiresAt: Date.now() + 10000, value: { ok: true }, tier: 'hot' }),
    }));
    const hit = await readCold(r2, 'n/key.json', Date.now(), logger);
    assert.equal(hit.tier, 'cold');
    assert.deepEqual(hit.value, { ok: true });

    r2.get.mock.mockImplementation(async () => {
      throw new Error('r2-fail');
    });
    assert.equal(await readCold(r2, 'n/key.json', Date.now(), logger), null);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('writeHot handles null, success, and errors', async () => {
    const logger = { warn: mock.fn() };

    await writeHot(null, 'n:key', { value: 1 }, 10, logger);

    const kv = { put: mock.fn(async () => {}) };
    await writeHot(kv, 'n:key', { value: 1 }, 10, logger);
    assert.equal(kv.put.mock.callCount(), 1);
    assert.equal(kv.put.mock.calls[0].arguments[2].expirationTtl, 10);

    kv.put.mock.mockImplementation(async () => {
      throw new Error('put-fail');
    });
    await writeHot(kv, 'n:key', { value: 1 }, 10, logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('writeWarm handles null, schema failure, success, and errors', async () => {
    const logger = { warn: mock.fn() };
    const envelope = {
      value: { x: 1 },
      expiresAt: 10,
      createdAt: 1,
      updatedAt: 2,
      lastAccessedAt: 3,
      tier: 'warm',
    };

    await writeWarm(null, 'n:key', envelope, 'cache_entries_writewarm_0', logger);

    const schemaFail = createD1Mock({ runError: /CREATE TABLE IF NOT EXISTS/ });
    await writeWarm(schemaFail.d1, 'n:key', envelope, 'cache_entries_writewarm_fail', logger);

    const ok = createD1Mock();
    await writeWarm(ok.d1, 'n:key', envelope, 'cache_entries_writewarm_ok', logger);
    assert.ok(ok.calls.some((c) => typeof c === 'string' && /INSERT INTO/.test(c)));

    const fail = createD1Mock({ runError: /INSERT INTO/ });
    await writeWarm(fail.d1, 'n:key', envelope, 'cache_entries_writewarm_runfail', logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('writeCold handles null, success, and errors', async () => {
    const logger = { warn: mock.fn() };
    const envelope = { value: { ok: true }, expiresAt: Date.now() + 1000 };

    await writeCold(null, 'n/key.json', envelope, logger);

    const r2 = { put: mock.fn(async () => {}) };
    await writeCold(r2, 'n/key.json', envelope, logger);
    assert.equal(r2.put.mock.callCount(), 1);
    assert.equal(r2.put.mock.calls[0].arguments[2].httpMetadata.contentType, 'application/json');

    r2.put.mock.mockImplementation(async () => {
      throw new Error('r2-put-fail');
    });
    await writeCold(r2, 'n/key.json', envelope, logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('deleteHot handles null, success, and errors', async () => {
    const logger = { warn: mock.fn() };

    await deleteHot(null, 'n:key', logger);

    const kv = { delete: mock.fn(async () => {}) };
    await deleteHot(kv, 'n:key', logger);
    assert.equal(kv.delete.mock.callCount(), 1);

    kv.delete.mock.mockImplementation(async () => {
      throw new Error('kv-delete-fail');
    });
    await deleteHot(kv, 'n:key', logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('deleteWarm handles null, schema failure, success, and errors', async () => {
    const logger = { warn: mock.fn() };

    await deleteWarm(null, 'n:key', 'cache_entries_deletewarm_0', logger);

    const schemaFail = createD1Mock({ runError: /CREATE TABLE IF NOT EXISTS/ });
    await deleteWarm(schemaFail.d1, 'n:key', 'cache_entries_deletewarm_fail', logger);

    const ok = createD1Mock();
    await deleteWarm(ok.d1, 'n:key', 'cache_entries_deletewarm_ok', logger);
    assert.ok(ok.calls.some((c) => typeof c === 'string' && /DELETE FROM/.test(c)));

    const fail = createD1Mock({ runError: /DELETE FROM/ });
    await deleteWarm(fail.d1, 'n:key', 'cache_entries_deletewarm_runfail', logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('deleteCold handles null, success, and errors', async () => {
    const logger = { warn: mock.fn() };

    await deleteCold(null, 'n/key.json', logger);

    const r2 = { delete: mock.fn(async () => {}) };
    await deleteCold(r2, 'n/key.json', logger);
    assert.equal(r2.delete.mock.callCount(), 1);

    r2.delete.mock.mockImplementation(async () => {
      throw new Error('r2-delete-fail');
    });
    await deleteCold(r2, 'n/key.json', logger);
    assert.equal(logger.warn.mock.callCount(), 1);
  });

  it('ensureD1Schema handles null, success, cache hit, and failure', async () => {
    assert.equal(await ensureD1Schema(null, 'cache_entries'), false);

    const ok = createD1Mock();
    assert.equal(await ensureD1Schema(ok.d1, 'cache_entries'), true);
    const firstPrepareCount = ok.d1.prepare.mock.callCount();
    assert.equal(await ensureD1Schema(ok.d1, 'cache_entries'), true);
    assert.equal(ok.d1.prepare.mock.callCount(), firstPrepareCount);

    const fail = createD1Mock({ runError: /CREATE TABLE IF NOT EXISTS/ });
    assert.equal(await ensureD1Schema(fail.d1, 'cache_entries_2'), false);
  });
});
