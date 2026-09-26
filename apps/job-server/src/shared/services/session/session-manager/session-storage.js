/**
 * @typedef {Object} SessionStoreContract
 * @property {(platform?: string | null) => unknown} load
 * @property {(platform: string, data: unknown) => boolean} save
 * @property {(platform?: string | null) => boolean} clear
 */

/**
 * @typedef {Object} SessionStorageHost
 * @property {() => SessionStoreContract} getStore
 */

export const sessionStorageMethods = {
  /**
   * @this {SessionStorageHost}
   * @param {string | null} [platform=null]
   * @returns {unknown}
   */
  load(platform = null) {
    return this.getStore().load(platform);
  },

  /**
   * @this {SessionStorageHost}
   * @param {string} platform
   * @param {unknown} data
   * @returns {boolean}
   */
  save(platform, data) {
    return this.getStore().save(platform, data);
  },

  /**
   * @this {SessionStorageHost}
   * @param {string | null} [platform=null]
   * @returns {boolean}
   */
  clear(platform = null) {
    return this.getStore().clear(platform);
  },
};
