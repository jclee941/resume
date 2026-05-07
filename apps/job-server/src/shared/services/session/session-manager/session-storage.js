import { createStore } from './session-store-factory.js';

export const sessionStorageMethods = {
  load(platform = null) {
    return createStore(this.logger).load(platform);
  },

  save(platform, data) {
    return createStore(this.logger).save(platform, data);
  },

  clear(platform = null) {
    return createStore(this.logger).clear(platform);
  },
};
