import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { syncRememberFromSsot } from '../remember.js';
import {
  createPhotoFixture,
  PHOTO_BYTES,
  PHOTO_SHA256,
  PHOTO_SSOT,
} from './remember-photo-fixture.js';

describe('Remember profile photo sync', () => {
  it('uploads the D1 photo even when no introduction or career field changes', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();

    const result = await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

    assert.equal(result.photo?.status, 'updated');
    assert.equal(result.photo?.verified, true);
    assert.equal(state.uploads.length, 1);
    assert.equal(
      state.uploads[0].base64,
      `data:image/jpeg;base64,${Buffer.from(PHOTO_BYTES).toString('base64')}`
    );
    assert.equal(result.photo.sha256, PHOTO_SHA256);
    assert.deepEqual(result.changes, { profile_image: 1 });
  });

  for (const [name, body] of [
    ['number array', [...PHOTO_BYTES]],
    ['ArrayBuffer', Uint8Array.from(PHOTO_BYTES).buffer],
    ['Uint8Array', Uint8Array.from(PHOTO_BYTES)],
  ]) {
    it(`preserves D1 ${name} bytes through the photo upload`, async () => {
      const { env, state, fetchImpl } = await createPhotoFixture();
      state.body = body;

      await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

      assert.equal(
        state.uploads[0]?.base64,
        `data:image/jpeg;base64,${Buffer.from(PHOTO_BYTES).toString('base64')}`
      );
    });
  }

  it('previews a missing photo without upload or receipt writes', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();

    const result = await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: true, fetchImpl });

    assert.equal(result.photo?.status, 'would_update');
    assert.equal(result.photo?.verified, false);
    assert.equal(state.uploads.length, 0);
    assert.equal(state.writes, 0);
  });

  it('does not upload again when the source and remote photo still match the receipt', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

    const result = await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

    assert.equal(result.photo?.status, 'unchanged');
    assert.equal(result.photo?.verified, true);
    assert.equal(state.uploads.length, 1);
    assert.equal(state.writes, 1);
  });

  it('uploads the new canonical bytes when their source hash changes', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });
    const replacement = Uint8Array.from(PHOTO_BYTES);
    replacement[13] = replacement[13] === 0 ? 1 : 0;
    state.body = replacement;
    state.sha256 = Buffer.from(await crypto.subtle.digest('SHA-256', replacement)).toString('hex');

    const result = await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

    assert.equal(result.photo?.status, 'updated');
    assert.equal(state.uploads.length, 2);
    assert.equal(
      state.uploads[1].base64,
      `data:image/jpeg;base64,${Buffer.from(replacement).toString('base64')}`
    );
  });

  it('restores the canonical photo after the remote photo is replaced', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });
    state.photo = { id: 999, url: 'https://images.example.com/manually-replaced.jpg' };

    const result = await syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl });

    assert.equal(result.photo?.status, 'updated');
    assert.equal(state.uploads.length, 2);
    assert.equal(state.uploads[1].id, 999);
  });

  it('surfaces an upload rejection and does not mark the photo as synchronized', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    state.failUpload = true;

    await assert.rejects(syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl }), {
      name: 'RememberApiError',
      status: 422,
    });
    assert.equal(state.writes, 0);
  });

  it('rejects a save that does not link a photo on readback', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    state.unlinked = true;

    await assert.rejects(syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl }), {
      code: 'REMEMBER_PHOTO_VERIFY_FAILED',
    });
    assert.equal(state.writes, 0);
  });

  it('fails explicitly when the D1 canonical photo is missing', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    state.sourceMissing = true;

    await assert.rejects(syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl }), {
      code: 'REMEMBER_PHOTO_SOURCE_MISSING',
    });
    assert.equal(state.uploads.length, 0);
  });

  it('rejects canonical bytes that do not match their stored source hash', async () => {
    const { env, state, fetchImpl } = await createPhotoFixture();
    state.sha256 = '0'.repeat(64);

    await assert.rejects(syncRememberFromSsot(env, PHOTO_SSOT, { dryRun: false, fetchImpl }), {
      code: 'REMEMBER_PHOTO_SOURCE_INVALID',
    });
    assert.equal(state.uploads.length, 0);
  });
});
