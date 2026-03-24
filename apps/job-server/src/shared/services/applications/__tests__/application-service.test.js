import { readFileSync } from 'node:fs';
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

class MockApplicationManager {
  constructor() {
    this.listApplications = mock.fn(() => []);
    this.getApplication = mock.fn(() => null);
    this.addApplication = mock.fn(() => ({}));
    this.save = mock.fn(() => {});
    this.updateStatus = mock.fn(() => ({ success: true }));
    this.deleteApplication = mock.fn(() => ({ success: true }));
    this.cleanupExpired = mock.fn(() => ({ cleaned: 0 }));
  }
}

globalThis.__mockApplicationManager = MockApplicationManager;

const applicationServiceSource = readFileSync(
  new URL('../application-service.js', import.meta.url),
  'utf8'
).replace(
  /import\s*\{\s*ApplicationManager\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/auto-apply\/application-manager\.js['"]\s*;?/,
  'const { ApplicationManager } = { ApplicationManager: globalThis.__mockApplicationManager };'
);
const applicationServiceEncoded = Buffer.from(applicationServiceSource).toString('base64');
const { ApplicationService } = await import(
  `data:text/javascript;base64,${applicationServiceEncoded}`
);

function createManager() {
  return {
    listApplications: mock.fn(() => []),
    getApplication: mock.fn(() => null),
    addApplication: mock.fn(() => ({})),
    save: mock.fn(() => {}),
    updateStatus: mock.fn(() => ({ success: true })),
    deleteApplication: mock.fn(() => ({ success: true })),
    cleanupExpired: mock.fn(() => ({ cleaned: 0 })),
  };
}

describe('ApplicationService', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('lists applications and parses string pagination options', async () => {
    const manager = createManager();
    manager.listApplications.mock.mockImplementation(() => [{ id: '1' }, { id: '2' }]);

    const service = new ApplicationService(manager);
    const result = service.list({ status: 'pending', limit: '50', offset: '7' });

    assert.equal(manager.listApplications.mock.calls.length, 1);
    assert.deepEqual(manager.listApplications.mock.calls[0].arguments[0], {
      status: 'pending',
      source: undefined,
      company: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit: 50,
      offset: 7,
      fromDate: undefined,
    });
    assert.equal(result.success, true);
    assert.equal(result.total, 2);
    assert.equal(result.limit, 50);
    assert.equal(result.offset, 7);
  });

  it('gets application success and not found responses', async () => {
    const manager = createManager();
    manager.getApplication.mock.mockImplementation((id) => (id === 'ok' ? { id } : null));

    const service = new ApplicationService(manager);

    const found = service.get('ok');
    const missing = service.get('missing');

    assert.deepEqual(found, { success: true, application: { id: 'ok' } });
    assert.deepEqual(missing, {
      success: false,
      error: 'Application not found',
      statusCode: 404,
    });
  });

  it('creates application with 201 status code', async () => {
    const manager = createManager();
    manager.addApplication.mock.mockImplementation(() => ({ id: 'new-app' }));

    const service = new ApplicationService(manager);
    const result = service.create({ id: 'job-1' }, { source: 'wanted' });

    assert.equal(manager.addApplication.mock.calls.length, 1);
    assert.deepEqual(manager.addApplication.mock.calls[0].arguments, [
      { id: 'job-1' },
      { source: 'wanted' },
    ]);
    assert.deepEqual(result, {
      success: true,
      application: { id: 'new-app' },
      statusCode: 201,
    });
  });

  it('updates found application fields and persists', async () => {
    const manager = createManager();
    const app = { id: 'a1', notes: 'old', priority: 'low', resumeId: 'r1' };
    manager.getApplication.mock.mockImplementation(() => app);

    const service = new ApplicationService(manager);
    const result = service.update('a1', { notes: 'new', priority: 'high', resumeId: 'r2' });

    assert.equal(result.success, true);
    assert.equal(result.application.notes, 'new');
    assert.equal(result.application.priority, 'high');
    assert.equal(result.application.resumeId, 'r2');
    assert.ok(typeof result.application.updatedAt === 'string');
    assert.equal(manager.save.mock.calls.length, 1);
  });

  it('returns not found when update target does not exist', async () => {
    const manager = createManager();
    manager.getApplication.mock.mockImplementation(() => null);

    const service = new ApplicationService(manager);
    const result = service.update('missing', { notes: 'x' });

    assert.deepEqual(result, {
      success: false,
      error: 'Application not found',
      statusCode: 404,
    });
    assert.equal(manager.save.mock.calls.length, 0);
  });

  it('updates status and maps status code for success and failure', async () => {
    const manager = createManager();
    manager.updateStatus.mock.mockImplementation((id) => {
      if (id === 'ok') return { success: true, application: { id } };
      return { success: false, error: 'bad status' };
    });

    const service = new ApplicationService(manager);
    const ok = service.updateStatus('ok', 'interviewing', 'note');
    const bad = service.updateStatus('bad', 'invalid', 'note');

    assert.equal(ok.statusCode, 200);
    assert.equal(bad.statusCode, 400);
    assert.equal(manager.updateStatus.mock.calls.length, 2);
  });

  it('deletes application and maps status code', async () => {
    const manager = createManager();
    manager.deleteApplication.mock.mockImplementation((id) =>
      id === 'ok' ? { success: true } : { success: false, error: 'not found' }
    );

    const service = new ApplicationService(manager);
    const ok = service.delete('ok');
    const missing = service.delete('missing');

    assert.equal(ok.statusCode, 200);
    assert.equal(missing.statusCode, 404);
  });

  it('runs cleanup and exposes manager instance', async () => {
    const manager = createManager();
    manager.cleanupExpired.mock.mockImplementation(() => ({ cleaned: 3 }));

    const service = new ApplicationService(manager);

    assert.deepEqual(service.cleanup(), { cleaned: 3 });
    assert.equal(service.getManager(), manager);
  });
});
