/**
 * Node AES-256-GCM EncryptionService — thin re-export of canonical
 * `@resume/shared/crypto/node` (SSOT-033 / issue #42 Phase 2).
 *
 * The duplicate implementation that previously lived here has been
 * promoted to `packages/shared/src/crypto/node.js`. This file is
 * preserved as a thin re-export so existing import paths
 * (`from './encryption-service.js'`) keep working without churn.
 *
 * New code should prefer:
 *
 *   import { EncryptionService } from '@resume/shared/crypto';
 */

import { EncryptionService as EncryptionServiceCanonical } from '@resume/shared/crypto';

export { EncryptionServiceCanonical as EncryptionService };
export default EncryptionServiceCanonical;
