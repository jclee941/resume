/**
 * Web Crypto AES-GCM helpers — thin re-export of canonical
 * `@resume/shared/crypto/webcrypto` (SSOT-033 / issue #42 Phase 2).
 *
 * The duplicate implementation that previously lived here has been
 * promoted to `packages/shared/src/crypto/webcrypto.js`. This file is
 * preserved as a thin re-export so existing import paths
 * (`from '../utils/crypto.js'`) keep working without churn.
 *
 * New code should prefer:
 *
 *   import { encrypt, decrypt } from '@resume/shared/crypto/webcrypto';
 */

export { encrypt, decrypt } from '@resume/shared/crypto/webcrypto';
