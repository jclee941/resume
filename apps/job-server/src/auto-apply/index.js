/**
 * Auto Apply Module - 자동 지원 모듈 통합
 */

export { AutoApplier } from './auto-applier.js';
export { ApplicationManager, APPLICATION_STATUS } from './application-manager.js';

export default {
  AutoApplier: (await import('./auto-applier.js')).AutoApplier,
  ApplicationManager: (await import('./application-manager.js')).ApplicationManager,
  APPLICATION_STATUS: (await import('./application-manager.js')).APPLICATION_STATUS
};
