import { REMEMBER_PROFILE_API_URL, rememberRequest } from '../remember/remember-api.js';

const PHOTO_PATH = 'packages/data/resumes/master/profile-photo.jpg';
const PHOTO_RECEIPT_KEY = 'remember_profile_photo';

/**
 * @typedef {{
 *   prepare(sql: string): {
 *     bind(...params: unknown[]): {
 *       first(): Promise<unknown>;
 *       run(): Promise<unknown>;
 *     };
 *   };
 * }} PhotoDatabase
 * @typedef {{ JOB_DB?: PhotoDatabase }} RememberPhotoEnv
 * @typedef {{ id?: string | number; url?: string }} RemotePhoto
 * @typedef {{ id: string | number; profile_image?: RemotePhoto | null }} RememberPhotoProfile
 * @typedef {{ status: 'updated' | 'unchanged'; verified: true; sha256: string }
 *   | { status: 'would_update'; verified: false; sha256: string }} PhotoSyncOutcome
 */

export class RememberPhotoError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'RememberPhotoError';
    this.code = code;
  }
}

/**
 * Bind the source hash to the current account and remote image, not just to a previous run.
 * @param {string} sha256
 * @param {string | number} profileId
 * @param {RemotePhoto | null | undefined} image
 * @returns {string | null}
 */
function photoReceipt(sha256, profileId, image) {
  if (image?.id == null || !image.url) return null;
  return JSON.stringify({
    sha256,
    profileId: String(profileId),
    imageId: String(image.id),
    imageUrl: image.url,
  });
}

/**
 * @param {PhotoDatabase} db
 * @returns {Promise<{ bytes: Uint8Array; sha256: string; contentType: string }>}
 */
async function readCanonicalPhoto(db) {
  const row = await db
    .prepare('SELECT body, sha256, size, content_type FROM content_files WHERE path = ?')
    .bind(PHOTO_PATH)
    .first();
  if (!row) {
    throw new RememberPhotoError(
      'REMEMBER_PHOTO_SOURCE_MISSING',
      'Canonical profile photo is not stored in D1'
    );
  }
  if (
    typeof row !== 'object' ||
    !('body' in row) ||
    !('sha256' in row) ||
    typeof row.sha256 !== 'string' ||
    !('size' in row) ||
    typeof row.size !== 'number' ||
    !('content_type' in row) ||
    typeof row.content_type !== 'string' ||
    !/^image\/(?:jpeg|png|webp)$/.test(row.content_type)
  ) {
    throw new RememberPhotoError('REMEMBER_PHOTO_SOURCE_INVALID', 'Invalid D1 profile photo');
  }
  const bytes =
    row.body instanceof Uint8Array
      ? row.body
      : row.body instanceof ArrayBuffer
        ? new Uint8Array(row.body)
        : Array.isArray(row.body)
          ? Uint8Array.from(row.body)
          : null;
  if (!bytes || bytes.byteLength !== row.size || bytes.byteLength === 0) {
    throw new RememberPhotoError('REMEMBER_PHOTO_SOURCE_INVALID', 'Invalid D1 photo bytes');
  }
  const sha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes)))
  )
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (sha256 !== row.sha256) {
    throw new RememberPhotoError('REMEMBER_PHOTO_SOURCE_INVALID', 'D1 photo hash mismatch');
  }
  return { bytes, sha256, contentType: row.content_type };
}

/**
 * Remember's own photo editor sends a data URL in profile_image.base64 on the JSON profile API.
 * @param {RememberPhotoEnv} env
 * @param {{ current: RememberPhotoProfile; token: string; dryRun: boolean; fetchImpl: typeof fetch }} options
 * @returns {Promise<PhotoSyncOutcome>}
 */
export async function syncRememberPhoto(env, { current, token, dryRun, fetchImpl }) {
  const db = env.JOB_DB;
  if (!db) {
    throw new RememberPhotoError('REMEMBER_PHOTO_SOURCE_MISSING', 'Photo sync requires JOB_DB');
  }
  const source = await readCanonicalPhoto(db);
  const saved = await db
    .prepare('SELECT value FROM config WHERE key = ?')
    .bind(PHOTO_RECEIPT_KEY)
    .first();
  const expected = photoReceipt(source.sha256, current.id, current.profile_image);
  if (
    expected &&
    saved &&
    typeof saved === 'object' &&
    'value' in saved &&
    saved.value === expected
  ) {
    return { status: 'unchanged', verified: true, sha256: source.sha256 };
  }
  if (dryRun) return { status: 'would_update', verified: false, sha256: source.sha256 };

  let binary = '';
  for (let index = 0; index < source.bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...source.bytes.subarray(index, index + 0x8000));
  }
  await rememberRequest(
    token,
    `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/${current.id}?version=2`,
    {
      method: 'PUT',
      body: {
        open_profile: {
          profile_image: {
            ...(current.profile_image?.id == null ? {} : { id: current.profile_image.id }),
            base64: `data:${source.contentType};base64,${btoa(binary)}`,
          },
        },
      },
      fetchImpl,
    }
  );
  const readback = await rememberRequest(token, `${REMEMBER_PROFILE_API_URL}/v2/open_profiles/me`, {
    fetchImpl,
  });
  const profile = readback?.data?.open_profile;
  const receipt = photoReceipt(source.sha256, current.id, profile?.profile_image);
  if (String(profile?.id) !== String(current.id) || !receipt) {
    throw new RememberPhotoError(
      'REMEMBER_PHOTO_VERIFY_FAILED',
      'Remember did not return the linked profile photo'
    );
  }
  await db
    .prepare(
      'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    )
    .bind(PHOTO_RECEIPT_KEY, receipt, new Date().toISOString())
    .run();
  return { status: 'updated', verified: true, sha256: source.sha256 };
}
