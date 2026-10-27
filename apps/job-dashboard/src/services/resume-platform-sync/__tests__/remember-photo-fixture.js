import { readFile } from 'node:fs/promises';
import { writePlatformSession } from '../../platform-session.js';

export const PHOTO_BYTES = new Uint8Array(
  await readFile(
    new URL(
      '../../../../../../tests/fixtures/content-pack/packages/data/resumes/master/profile-photo.jpg',
      import.meta.url
    )
  )
);
export const PHOTO_SHA256 = Buffer.from(
  await crypto.subtle.digest('SHA-256', PHOTO_BYTES)
).toString('hex');
export const PHOTO_SSOT = { careers: [] };

export async function createPhotoFixture() {
  const state = {
    photo: null,
    receipt: null,
    body: PHOTO_BYTES,
    sha256: PHOTO_SHA256,
    sourceMissing: false,
    failUpload: false,
    unlinked: false,
    uploads: [],
    writes: 0,
  };
  const kv = new Map();
  const env = {
    REMEMBER_EMAIL: 'me@example.com',
    REMEMBER_PASSWORD: 'secret',
    REMEMBER_DEVICE_ID: 'device-1',
    ENCRYPTION_KEY: btoa('0123456789abcdef0123456789abcdef'),
    SESSIONS: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => void kv.set(key, value),
    },
    JOB_DB: {
      prepare(sql) {
        return {
          bind(...params) {
            return {
              async first() {
                if (sql.includes('FROM content_files')) {
                  return state.sourceMissing
                    ? null
                    : {
                        body: state.body,
                        sha256: state.sha256,
                        size: PHOTO_BYTES.byteLength,
                        content_type: 'image/jpeg',
                      };
                }
                if (sql.includes('FROM config')) {
                  return state.receipt === null ? null : { value: state.receipt };
                }
                throw new Error(`Unexpected read: ${sql}`);
              },
              async run() {
                state.receipt = params[1];
                state.writes++;
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
  await writePlatformSession(env, 'remember', 'token-1', 60);
  const fetchImpl = async (url, init = {}) => {
    if (String(url).endsWith('/v2/open_profiles/me')) {
      return Response.json({
        code: 'ok',
        data: {
          open_profile: { id: 7, careers_attributes: [], profile_image: state.photo },
        },
      });
    }
    if (init.method === 'PUT' && String(url).includes('/v2/open_profiles/7?version=2')) {
      const image = JSON.parse(init.body).open_profile.profile_image;
      if (!image) throw new Error('Expected a photo-only update');
      state.uploads.push(image);
      if (state.failUpload) {
        return Response.json({ code: 'invalid_params' }, { status: 422 });
      }
      if (!state.unlinked) {
        state.photo = {
          id: 100 + state.uploads.length,
          url: 'https://images.example.com/photo.jpg',
        };
      }
      return Response.json({ code: 'ok', data: {} });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return { env, state, fetchImpl };
}
