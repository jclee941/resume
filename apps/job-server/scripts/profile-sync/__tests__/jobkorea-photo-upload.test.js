import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { appendPhotoUpload } from '../jobkorea-handler/sync-photo.js';

const BOGUS_PHOTO_PATH = '/tmp/does-not-exist/jobkorea-photo-upload-test-fixture.jpg';
const FAKE_PHOTO_PATH = import.meta.url; // any file guaranteed to exist

afterEach(() => {
  delete process.env.JOBKOREA_PHOTO_OPTIONAL;
  delete process.env.JOBKOREA_PHOTO_OVERWRITE;
});

describe('appendPhotoUpload', () => {
  it('skips (returns, no throw) when the photo file does not exist', async () => {
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const page = {};

    await appendPhotoUpload(page, { photoPath: BOGUS_PHOTO_PATH, logger });

    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'warn');
    assert.match(logs[0].msg, /file not found/);
  });

  it('calls uploadPhoto and logs success when upload returns true', async () => {
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const calls = [];
    const uploadPhoto = async (page, photoPath) => {
      calls.push({ page, photoPath });
      return true;
    };
    const page = { marker: 'the-page' };

    await appendPhotoUpload(page, {
      photoPath: new URL(FAKE_PHOTO_PATH).pathname,
      uploadPhoto,
      logger,
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].page, page);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'info');
    assert.strictEqual(logs[0].platform, 'jobkorea');
    assert.match(logs[0].msg, /JobKorea profile photo uploaded/);
  });

  it('throws failLoud when upload returns false and JOBKOREA_PHOTO_OPTIONAL is not set', async () => {
    delete process.env.JOBKOREA_PHOTO_OPTIONAL;
    const logger = () => {};
    const uploadPhoto = async () => false;
    const page = {};

    await assert.rejects(
      () =>
        appendPhotoUpload(page, {
          photoPath: new URL(FAKE_PHOTO_PATH).pathname,
          uploadPhoto,
          logger,
        }),
      (error) => {
        assert.strictEqual(error.failLoud, true);
        assert.match(error.message, /JobKorea profile photo upload failed/);
        return true;
      }
    );
  });

  it('warns and returns (no throw) when upload returns false and JOBKOREA_PHOTO_OPTIONAL is true', async () => {
    process.env.JOBKOREA_PHOTO_OPTIONAL = 'true';
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const uploadPhoto = async () => false;
    const page = {};

    await appendPhotoUpload(page, {
      photoPath: new URL(FAKE_PHOTO_PATH).pathname,
      uploadPhoto,
      logger,
    });

    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'warn');
    assert.match(logs[0].msg, /JobKorea profile photo upload failed/);
  });

  it('skips (no uploadPhoto call) when hasExistingPhoto resolves true and JOBKOREA_PHOTO_OVERWRITE is unset', async () => {
    delete process.env.JOBKOREA_PHOTO_OVERWRITE;
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const uploadCalls = [];
    const uploadPhoto = async () => {
      uploadCalls.push(true);
      return true;
    };
    const hasExistingPhoto = async () => true;
    const page = {};

    await appendPhotoUpload(page, {
      photoPath: new URL(FAKE_PHOTO_PATH).pathname,
      uploadPhoto,
      hasExistingPhoto,
      logger,
    });

    assert.strictEqual(uploadCalls.length, 0);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'info');
    assert.strictEqual(logs[0].platform, 'jobkorea');
    assert.match(logs[0].msg, /already set/);
  });

  it('proceeds (calls uploadPhoto) when hasExistingPhoto is true but JOBKOREA_PHOTO_OVERWRITE=true', async () => {
    process.env.JOBKOREA_PHOTO_OVERWRITE = 'true';
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const uploadCalls = [];
    const uploadPhoto = async () => {
      uploadCalls.push(true);
      return true;
    };
    const hasExistingPhoto = async () => true;
    const page = {};

    await appendPhotoUpload(page, {
      photoPath: new URL(FAKE_PHOTO_PATH).pathname,
      uploadPhoto,
      hasExistingPhoto,
      logger,
    });

    assert.strictEqual(uploadCalls.length, 1);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'info');
    assert.match(logs[0].msg, /JobKorea profile photo uploaded/);
  });

  it('proceeds (calls uploadPhoto) when hasExistingPhoto resolves false', async () => {
    delete process.env.JOBKOREA_PHOTO_OVERWRITE;
    const logs = [];
    const logger = (msg, type, platform) => logs.push({ msg, type, platform });
    const uploadCalls = [];
    const uploadPhoto = async () => {
      uploadCalls.push(true);
      return true;
    };
    const hasExistingPhoto = async () => false;
    const page = {};

    await appendPhotoUpload(page, {
      photoPath: new URL(FAKE_PHOTO_PATH).pathname,
      uploadPhoto,
      hasExistingPhoto,
      logger,
    });

    assert.strictEqual(uploadCalls.length, 1);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].type, 'info');
    assert.match(logs[0].msg, /JobKorea profile photo uploaded/);
  });
});
