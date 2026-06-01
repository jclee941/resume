import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

let importCounter = 0;

async function loadModule() {
  importCounter += 1;
  return import(`../jobkorea-sync.js?test=${importCounter}`);
}

describe('jobkorea sync platform', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('keeps the dry-run response shape in api-only mode', async () => {
    const { syncToJobKorea } = await loadModule();
    const data = {
      personal: { name: 'Test User', email: '', phone: '' },
      careers: [],
      education: { school: '', major: '', status: '' },
      certifications: [],
    };

    const result = await syncToJobKorea(data, { dry_run: true });

    assert.equal(result.dry_run, true);
    assert.equal(result.mode, 'api-only');
    assert.ok(Array.isArray(result.steps));
    assert.equal(result.steps.length, 5);
    assert.ok(result.would_sync);
    assert.equal(result.would_sync.name, 'Test User');
  });

  it('returns error when cookieString is missing', async () => {
    const { syncToJobKorea } = await loadModule();

    const result = await syncToJobKorea({}, { dry_run: false });

    assert.equal(
      result.error,
      'cookieString required for API-only sync. Authenticate via jobkorea_auth first.'
    );
  });

  it('delegates to syncToJobKoreaAPI when cookieString is provided', async () => {
    const { syncToJobKorea } = await loadModule();

    // With a fake cookie, syncToJobKoreaAPI will throw (JWT expired or invalid)
    // The wrapper should catch it and return an error object
    const result = await syncToJobKorea(
      {
        personal: { name: 'A', email: '', phone: '' },
        careers: [],
        education: { school: '', major: '', status: '' },
        certifications: [],
      },
      { dry_run: false, cookieString: 'jkat=fake' }
    );

    // Should catch the error from syncToJobKoreaAPI
    assert.ok(result.error);
    assert.equal(result.mode, 'api-only');
  });

  it('diffPlatform returns local preview', async () => {
    const { diffPlatform } = await loadModule();
    const data = {
      personal: { name: 'Diff Test', email: '', phone: '' },
      careers: [],
      education: { school: '', major: '', status: '' },
      certifications: [],
    };

    const result = await diffPlatform(data);

    assert.equal(result.mode, 'api-only');
    assert.equal(result.local_preview.name, 'Diff Test');
    assert.ok(result.note.includes('diff is not available'));
  });
});
