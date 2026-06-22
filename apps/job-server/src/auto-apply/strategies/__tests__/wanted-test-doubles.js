import { mock } from 'node:test';

import { resetRetryState } from '@resume/shared/retry';

import SessionManager from '../../../shared/services/session/session-manager.js';
import { resetCircuitState } from '../wanted-strategy.js';

export const WANTED_PLATFORM = 'wanted';

export function createMemorySessionStore(session) {
  const calls = { load: [], save: [], clear: [] };

  return {
    calls,
    load(platform = null) {
      calls.load.push(platform);
      return platform === WANTED_PLATFORM || platform === null ? session : null;
    },
    save(platform, data) {
      calls.save.push({ platform, data });
      return true;
    },
    clear(platform = null) {
      calls.clear.push(platform);
      return true;
    },
  };
}

export function createWantedApi() {
  const calls = { getProfile: 0, chaosRequest: [] };

  return {
    calls,
    async getProfile() {
      calls.getProfile += 1;
      return { name: 'Test Applicant', mobile: '010-0000-0000' };
    },
    async chaosRequest(path, options = {}) {
      calls.chaosRequest.push({ path, options });

      if (path.startsWith('/resumes/v1')) {
        return { data: [{ id: 'resume-key-1', is_default: true }] };
      }

      if (path === '/applications/v1') {
        return { id: `application-${options.body.job_id}` };
      }

      throw new Error(`Unexpected Wanted API path: ${path}`);
    },
  };
}

export function configureWantedSession({ api, store }) {
  SessionManager.configure({
    store,
    apiFactory: () => api,
    logger: {
      info: mock.fn(),
      error: mock.fn(),
      warn: mock.fn(),
      debug: mock.fn(),
    },
  });
}

export function resetWantedSession() {
  SessionManager.configure({
    store: createMemorySessionStore(null),
    apiFactory: () => null,
  });
}

export function resetWantedApplyState() {
  resetRetryState();
  resetCircuitState();
}
