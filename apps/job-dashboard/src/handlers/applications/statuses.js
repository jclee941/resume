import { APPLICATION_STATUSES } from '@resume/types';

/**
 * Application status constants, derived from the canonical `@resume/types`
 * `APPLICATION_STATUSES` set so the status values are defined once (no
 * duplication of the domain enum outside `@resume/types`).
 */
export const APPLICATION_STATUS = Object.fromEntries(
  APPLICATION_STATUSES.map((status) => [status.toUpperCase(), status])
);

export const VALID_STATUSES = [...APPLICATION_STATUSES];
