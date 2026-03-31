/**
 * Migration Runner Tests - Simplified for modular structure
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { MigrationRunner } = await import('../migration-runner.js');
const { computeChecksum, parseMigrationFilename, splitStatements } = await import('../discovery.js');
const { validate } = await import('../validation.js');
const { applyMigration, rollbackMigration, MIGRATIONS_TABLE } = await import('../execution.js');

describe('MigrationRunner', () => {
  it('should be defined', () => {
    assert.ok(MigrationRunner);
  });

  it('should create instance with config', () => {
    const mockDb = { exec: async () => {}, prepare: () => ({}) };
    const runner = new MigrationRunner({
      db: mockDb,
      migrationsDir: '/tmp/migrations',
      dryRun: true,
    });
    assert.ok(runner);
    assert.strictEqual(runner.dryRun, true);
  });

  it('should have required methods', () => {
    const mockDb = { exec: async () => {}, prepare: () => ({}) };
    const runner = new MigrationRunner({
      db: mockDb,
      migrationsDir: '/tmp/migrations',
      dryRun: true,
    });
    assert.ok(typeof runner.migrate === 'function');
    assert.ok(typeof runner.rollback === 'function');
    assert.ok(typeof runner.status === 'function');
    assert.ok(typeof runner.seed === 'function');
    assert.ok(typeof runner.validate === 'function');
  });
});

describe('Discovery Module', () => {
  it('computeChecksum returns consistent hashes', () => {
    const hash1 = computeChecksum('test');
    const hash2 = computeChecksum('test');
    const hash3 = computeChecksum('different');
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
  });

  it('parseMigrationFilename parses valid names', () => {
    const result = parseMigrationFilename('0001_initial.sql');
    assert.deepStrictEqual(result, { version: '0001', name: 'initial' });
  });

  it('parseMigrationFilename returns null for invalid', () => {
    assert.strictEqual(parseMigrationFilename('invalid.txt'), null);
  });

  it('splitStatements handles SQL', () => {
    const stmts = splitStatements('SELECT 1; SELECT 2;');
    assert.ok(stmts.length >= 1);
  });
});

describe('Validation Module', () => {
  it('validate is exported', () => {
    assert.ok(typeof validate === 'function');
  });
});

describe('Execution Module', () => {
  it('exports applyMigration and rollbackMigration', () => {
    assert.ok(typeof applyMigration === 'function');
    assert.ok(typeof rollbackMigration === 'function');
    assert.strictEqual(MIGRATIONS_TABLE, '_migrations');
  });
});

describe('Index Module', () => {
  it('exports all public APIs', async () => {
    const index = await import('../index.js');
    assert.ok(index.MigrationRunner);
    assert.ok(index.computeChecksum);
    assert.ok(index.validate);
    assert.ok(index.applyMigration);
    assert.ok(index.MIGRATIONS_TABLE);
  });
});
